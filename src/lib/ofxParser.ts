// Simple OFX parser for Brazilian bank statements
export interface OFXTransaction {
  date: string;
  amount: number;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  fitId?: string;
}

export interface OFXData {
  bankName: string;
  accountId: string;
  transactions: OFXTransaction[];
}

export function parseOFX(content: string): OFXData {
  // Remove line breaks and extra spaces for easier parsing
  const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Extract bank name
  const bankNameMatch = cleanContent.match(/<BANKID>([^<]+)/);
  const bankName = bankNameMatch ? bankNameMatch[1].trim() : 'Banco Desconhecido';
  
  // Extract account ID
  const accountIdMatch = cleanContent.match(/<ACCTID>([^<]+)/);
  const accountId = accountIdMatch ? accountIdMatch[1].trim() : '';
  
  // Extract transactions
  const transactions: OFXTransaction[] = [];
  const transactionPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  
  while ((match = transactionPattern.exec(cleanContent)) !== null) {
    const txnBlock = match[1];
    
    // Extract transaction details
    const typeMatch = txnBlock.match(/<TRNTYPE>([^<\n]+)/);
    const dateMatch = txnBlock.match(/<DTPOSTED>([^<\n]+)/);
    const amountMatch = txnBlock.match(/<TRNAMT>([^<\n]+)/);
    const descMatch = txnBlock.match(/<MEMO>([^<\n]+)/);
    const fitIdMatch = txnBlock.match(/<FITID>([^<\n]+)/);
    
    if (dateMatch && amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      const dateStr = dateMatch[1];
      
      // Parse OFX date format (YYYYMMDD or YYYYMMDDHHMMSS)
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const formattedDate = `${year}-${month}-${day}`;
      
      transactions.push({
        date: formattedDate,
        amount: Math.abs(amount),
        description: descMatch ? descMatch[1].trim() : 'Sem descrição',
        type: amount < 0 ? 'DEBIT' : 'CREDIT',
        fitId: fitIdMatch ? fitIdMatch[1].trim() : undefined,
      });
    }
  }
  
  return {
    bankName,
    accountId,
    transactions,
  };
}
