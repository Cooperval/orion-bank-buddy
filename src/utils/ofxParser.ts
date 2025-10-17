// Simple OFX parser without external dependencies

export interface OFXTransaction {
  fitid: string;
  amount: number;
  date: Date;
  description: string;
  memo?: string;
  transactionType: 'debit' | 'credit';
}

export interface OFXBankInfo {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  agency?: string;
}

export interface OFXData {
  bankInfo: OFXBankInfo;
  transactions: OFXTransaction[];
  balance?: number;
  startDate: Date;
  endDate: Date;
}

// Brazilian bank codes mapping
const BANK_CODES: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '104': 'Caixa Econômica Federal',
  '237': 'Bradesco',
  '341': 'Itaú Unibanco',
  '356': 'Banco Real',
  '399': 'HSBC Bank Brasil',
  '422': 'Banco Safra',
  '745': 'Banco Citibank',
  '756': 'Banco Cooperativo do Brasil'
};

const extractTagValue = (content: string, tagName: string): string => {
  const regex = new RegExp(`<${tagName}>([^<]*?)(?=<|\n|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
};

const extractAllTagValues = (content: string, tagName: string): string[] => {
  const regex = new RegExp(`<${tagName}>([^<]*?)(?=<|\n|$)`, 'gi');
  const matches = content.matchAll(regex);
  return Array.from(matches, match => match[1].trim());
};

export const parseOFX = async (ofxContent: string): Promise<OFXData> => {
  return new Promise((resolve, reject) => {
    try {
      // Clean up OFX content
      let cleanContent = ofxContent;
      
      // Remove OFX header and normalize
      cleanContent = cleanContent.replace(/^.*?<OFX>/s, '<OFX>');
      cleanContent = cleanContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Extract bank information
      const bankId = extractTagValue(cleanContent, 'BANKID') || '000';
      const accountId = extractTagValue(cleanContent, 'ACCTID');
      const accountType = extractTagValue(cleanContent, 'ACCTTYPE');
      const branchId = extractTagValue(cleanContent, 'BRANCHID');
      
      if (!accountId) {
        throw new Error('Formato OFX inválido: não foi possível encontrar informações da conta');
      }

      const bankInfo: OFXBankInfo = {
        bankCode: bankId,
        bankName: BANK_CODES[bankId] || `Banco ${bankId}`,
        accountNumber: accountId,
        accountType: accountType === 'CHECKING' ? 'checking' : 
                    accountType === 'SAVINGS' ? 'savings' : 'checking',
        agency: branchId
      };

      // Extract transaction list section
      const bankTranListMatch = cleanContent.match(/<BANKTRANLIST>(.*?)<\/BANKTRANLIST>/s);
      if (!bankTranListMatch) {
        throw new Error('Nenhuma lista de transações encontrada no arquivo OFX');
      }

      const tranListContent = bankTranListMatch[1];
      
      // Extract dates
      const startDate = parseOFXDate(extractTagValue(tranListContent, 'DTSTART'));
      const endDate = parseOFXDate(extractTagValue(tranListContent, 'DTEND'));

      // Extract all transactions
      const transactionMatches = tranListContent.matchAll(/<STMTTRN>(.*?)<\/STMTTRN>/gs);
      const transactions: OFXTransaction[] = [];

      for (const transactionMatch of transactionMatches) {
        const trnContent = transactionMatch[1];
        
        const fitid = extractTagValue(trnContent, 'FITID');
        const trnAmt = parseFloat(extractTagValue(trnContent, 'TRNAMT')) || 0;
        const dtPosted = extractTagValue(trnContent, 'DTPOSTED');
        const memo = extractTagValue(trnContent, 'MEMO');
        const name = extractTagValue(trnContent, 'NAME');
        
        if (fitid && dtPosted) {
          transactions.push({
            fitid,
            amount: Math.abs(trnAmt),
            date: parseOFXDate(dtPosted),
            description: memo || name || 'Transação',
            memo: memo,
            transactionType: trnAmt >= 0 ? 'credit' : 'debit'
          });
        }
      }

      // Extract balance
      const balanceAmt = extractTagValue(cleanContent, 'BALAMT');
      const balance = balanceAmt ? parseFloat(balanceAmt) : undefined;

      resolve({
        bankInfo,
        transactions,
        balance,
        startDate,
        endDate
      });

    } catch (error) {
      reject(new Error(`Erro ao processar arquivo OFX: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
    }
  });
};

const parseOFXDate = (dateStr: string): Date => {
  // OFX dates are in format YYYYMMDD or YYYYMMDDHHMMSS
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-based
  const day = parseInt(dateStr.substring(6, 8));
  
  return new Date(year, month, day);
};

export const validateOFXFile = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Basic validation - check if it contains OFX tags
      const hasOFXHeader = content.includes('<OFX>') || content.includes('OFXHEADER');
      const hasBankData = content.includes('BANKMSGSRSV1') || content.includes('CREDITCARDMSGSRSV1');
      resolve(hasOFXHeader && hasBankData);
    };
    reader.readAsText(file);
  });
};