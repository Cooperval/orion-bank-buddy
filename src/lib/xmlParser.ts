export interface NFItem {
  codigo: string;
  descricao: string;
  ncm: string;
  qtd: number;
  valorUnit: number;
  valorTotal: number;
  icms?: number;
  pis?: number;
  cofins?: number;
}

export interface NFEmitente {
  cnpj: string;
  razaoSocial: string;
  localizacao: string;
}

export interface NFDestinatario {
  cnpj: string;
  razaoSocial: string;
  localizacao: string;
}

export interface NFTotais {
  valorProdutos: number;
  icms: number;
  pis: number;
  cofins: number;
  ipi: number;
  valorTotal: number;
}

export interface ParsedNFe {
  numero: string;
  serie: string;
  dataEmissao: string;
  naturezaOperacao: string;
  emitente: NFEmitente;
  destinatario: NFDestinatario;
  itens: NFItem[];
  totais: NFTotais;
  status: string;
}

const getTextContent = (xml: Document, tagName: string): string => {
  const element = xml.getElementsByTagName(tagName)[0];
  return element?.textContent?.trim() || '';
};

export const parseXML = (xmlContent: string): ParsedNFe | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      throw new Error('Erro ao fazer parse do XML');
    }

    // Extract basic info
    const numero = getTextContent(xmlDoc, 'nNF');
    const serie = getTextContent(xmlDoc, 'serie');
    const dataEmissao = getTextContent(xmlDoc, 'dhEmi');
    const naturezaOperacao = getTextContent(xmlDoc, 'natOp');

    // Extract emitente
    const emitCNPJ = getTextContent(xmlDoc, 'CNPJ') || getTextContent(xmlDoc, 'CPF');
    const emitRazao = getTextContent(xmlDoc, 'xNome');
    const emitMun = getTextContent(xmlDoc, 'xMun');
    const emitUF = getTextContent(xmlDoc, 'UF');

    // Extract destinatario - need to get the second occurrence
    const allCNPJ = xmlDoc.getElementsByTagName('CNPJ');
    const allXNome = xmlDoc.getElementsByTagName('xNome');
    const allXMun = xmlDoc.getElementsByTagName('xMun');
    const allUF = xmlDoc.getElementsByTagName('UF');

    const destCNPJ = allCNPJ[1]?.textContent?.trim() || '';
    const destRazao = allXNome[1]?.textContent?.trim() || '';
    const destMun = allXMun[1]?.textContent?.trim() || '';
    const destUF = allUF[1]?.textContent?.trim() || '';

    // Extract items
    const detElements = xmlDoc.getElementsByTagName('det');
    const itens: NFItem[] = [];

    for (let i = 0; i < detElements.length; i++) {
      const det = detElements[i];
      const codigo = det.getElementsByTagName('cProd')[0]?.textContent?.trim() || '';
      const descricao = det.getElementsByTagName('xProd')[0]?.textContent?.trim() || '';
      const ncm = det.getElementsByTagName('NCM')[0]?.textContent?.trim() || '';
      const qtd = parseFloat(det.getElementsByTagName('qCom')[0]?.textContent || '0');
      const valorUnit = parseFloat(det.getElementsByTagName('vUnCom')[0]?.textContent || '0');
      const valorTotal = parseFloat(det.getElementsByTagName('vProd')[0]?.textContent || '0');

      // Extract taxes
      const icms = parseFloat(det.getElementsByTagName('vICMS')[0]?.textContent || '0');
      const pis = parseFloat(det.getElementsByTagName('vPIS')[0]?.textContent || '0');
      const cofins = parseFloat(det.getElementsByTagName('vCOFINS')[0]?.textContent || '0');

      itens.push({
        codigo,
        descricao,
        ncm,
        qtd,
        valorUnit,
        valorTotal,
        icms: icms || undefined,
        pis: pis || undefined,
        cofins: cofins || undefined,
      });
    }

    // Extract totals
    const valorProdutos = parseFloat(getTextContent(xmlDoc, 'vProd')) || 0;
    const icmsTotal = parseFloat(getTextContent(xmlDoc, 'vICMS')) || 0;
    const pisTotal = parseFloat(getTextContent(xmlDoc, 'vPIS')) || 0;
    const cofinsTotal = parseFloat(getTextContent(xmlDoc, 'vCOFINS')) || 0;
    const ipiTotal = parseFloat(getTextContent(xmlDoc, 'vIPI')) || 0;
    const valorTotal = parseFloat(getTextContent(xmlDoc, 'vNF')) || 0;

    // Format date
    const formattedDate = dataEmissao ? new Date(dataEmissao).toLocaleDateString('pt-BR') : '';

    return {
      numero,
      serie,
      dataEmissao: formattedDate,
      naturezaOperacao,
      emitente: {
        cnpj: emitCNPJ,
        razaoSocial: emitRazao,
        localizacao: `${emitMun} - ${emitUF}`,
      },
      destinatario: {
        cnpj: destCNPJ,
        razaoSocial: destRazao,
        localizacao: `${destMun} - ${destUF}`,
      },
      itens,
      totais: {
        valorProdutos,
        icms: icmsTotal,
        pis: pisTotal,
        cofins: cofinsTotal,
        ipi: ipiTotal,
        valorTotal,
      },
      status: 'Aprovado',
    };
  } catch (error) {
    console.error('Erro ao fazer parse do XML:', error);
    return null;
  }
};
