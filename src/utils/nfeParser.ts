// Utility for parsing Brazilian NFe XML files

export interface NFeTax {
  type: 'ICMS' | 'PIS' | 'COFINS' | 'IPI' | 'ISS';
  baseCalculation: number;
  taxRate: number;
  taxValue: number;
}

export interface NFePlaceInfo {
  cnpj: string;
  razaoSocial: string;
  municipio: string;
  uf: string;
}

export interface NFeParsedItem {
  productCode: string;
  productDescription: string;
  ncm: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  taxes: NFeTax[];
}

export interface NFeDuplicata {
  numeroParcela: string;
  dataVencimento: string;
  valorParcela: number;
}

export interface NFeFatura {
  numeroFatura: string;
  valorOriginal: number;
  valorDesconto: number;
  valorLiquido: number;
}

export interface NFeParsedData {
  // Document info
  nfeNumber: string;
  serie: string;
  emissionDate: string;
  operationNature: string;
  cfop: string;
  
  // Participants
  emitter: NFePlaceInfo;
  recipient: NFePlaceInfo;
  
  // Items
  items: NFeParsedItem[];
  
  // Totals
  totals: {
    totalProductsValue: number;
    totalIcmsValue: number;
    totalPisValue: number;
    totalCofinsValue: number;
    totalIpiValue: number;
    totalIssValue: number;
    totalNfeValue: number;
  };
  
  // Billing info
  fatura?: NFeFatura;
  duplicatas: NFeDuplicata[];
  
  // Raw XML content
  xmlContent: string;
}

// Helper function to get text content from XML node
function getTextContent(node: Element | null, fallback: string = ''): string {
  return node?.textContent?.trim() || fallback;
}

// Helper function to get numeric value from XML node
function getNumericValue(node: Element | null, fallback: number = 0): number {
  const value = getTextContent(node);
  return value ? parseFloat(value.replace(',', '.')) : fallback;
}

// Parse NFe XML content
export async function parseNFeXML(xmlContent: string): Promise<NFeParsedData> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid XML format');
  }

  // Check if it's a valid NFe XML
  const nfeProc = xmlDoc.querySelector('nfeProc') || xmlDoc.querySelector('NFe');
  if (!nfeProc) {
    throw new Error('Invalid NFe XML format');
  }

  // Get main NFe data
  const infNFe = xmlDoc.querySelector('infNFe');
  const ide = xmlDoc.querySelector('ide');
  const emit = xmlDoc.querySelector('emit');
  const dest = xmlDoc.querySelector('dest');
  const total = xmlDoc.querySelector('total');
  const ICMSTot = xmlDoc.querySelector('ICMSTot');

  if (!infNFe || !ide || !emit || !dest) {
    throw new Error('Required NFe elements not found');
  }

  // Parse document info
  const nfeNumber = getTextContent(ide.querySelector('nNF'));
  const serie = getTextContent(ide.querySelector('serie'));
  const emissionDate = getTextContent(ide.querySelector('dhEmi') || ide.querySelector('dEmi'));
  const operationNature = getTextContent(ide.querySelector('natOp'));

  // Parse CFOP from first item (most NFes have the same CFOP for all items)
  let cfop = '';
  const firstDet = xmlDoc.querySelector('det');
  if (firstDet) {
    const firstProd = firstDet.querySelector('prod');
    if (firstProd) {
      cfop = getTextContent(firstProd.querySelector('CFOP'));
    }
  }

  // Parse emitter info
  const emitter: NFePlaceInfo = {
    cnpj: getTextContent(emit.querySelector('CNPJ')),
    razaoSocial: getTextContent(emit.querySelector('xNome')),
    municipio: getTextContent(emit.querySelector('enderEmit xMun')),
    uf: getTextContent(emit.querySelector('enderEmit UF'))
  };

  // Parse recipient info
  const recipient: NFePlaceInfo = {
    cnpj: getTextContent(dest.querySelector('CNPJ')),
    razaoSocial: getTextContent(dest.querySelector('xNome')),
    municipio: getTextContent(dest.querySelector('enderDest xMun')),
    uf: getTextContent(dest.querySelector('enderDest UF'))
  };

  // Parse items
  const items: NFeParsedItem[] = [];
  const detElements = xmlDoc.querySelectorAll('det');
  
  detElements.forEach(det => {
    const prod = det.querySelector('prod');
    const imposto = det.querySelector('imposto');
    
    if (!prod) return;

    const item: NFeParsedItem = {
      productCode: getTextContent(prod.querySelector('cProd')),
      productDescription: getTextContent(prod.querySelector('xProd')),
      ncm: getTextContent(prod.querySelector('NCM')),
      quantity: getNumericValue(prod.querySelector('qCom')),
      unitValue: getNumericValue(prod.querySelector('vUnCom')),
      totalValue: getNumericValue(prod.querySelector('vProd')),
      taxes: []
    };

    // Parse taxes for this item
    if (imposto) {
      // ICMS
      const icms = imposto.querySelector('ICMS');
      if (icms) {
        const icmsDetails = icms.querySelector('ICMS00, ICMS10, ICMS20, ICMS30, ICMS40, ICMS51, ICMS60, ICMS70, ICMS90, ICMSSN101, ICMSSN102, ICMSSN201, ICMSSN202, ICMSSN500, ICMSSN900');
        if (icmsDetails) {
          item.taxes.push({
            type: 'ICMS',
            baseCalculation: getNumericValue(icmsDetails.querySelector('vBC')),
            taxRate: getNumericValue(icmsDetails.querySelector('pICMS')) / 100,
            taxValue: getNumericValue(icmsDetails.querySelector('vICMS'))
          });
        }
      }

      // PIS
      const pis = imposto.querySelector('PIS');
      if (pis) {
        const pisDetails = pis.querySelector('PISAliq, PISQtde, PISNT, PISOutr');
        if (pisDetails) {
          item.taxes.push({
            type: 'PIS',
            baseCalculation: getNumericValue(pisDetails.querySelector('vBC')),
            taxRate: getNumericValue(pisDetails.querySelector('pPIS')) / 100,
            taxValue: getNumericValue(pisDetails.querySelector('vPIS'))
          });
        }
      }

      // COFINS
      const cofins = imposto.querySelector('COFINS');
      if (cofins) {
        const cofinsDetails = cofins.querySelector('COFINSAliq, COFINSQtde, COFINSNT, COFINSOutr');
        if (cofinsDetails) {
          item.taxes.push({
            type: 'COFINS',
            baseCalculation: getNumericValue(cofinsDetails.querySelector('vBC')),
            taxRate: getNumericValue(cofinsDetails.querySelector('pCOFINS')) / 100,
            taxValue: getNumericValue(cofinsDetails.querySelector('vCOFINS'))
          });
        }
      }

      // IPI
      const ipi = imposto.querySelector('IPI');
      if (ipi) {
        const ipiDetails = ipi.querySelector('IPITrib');
        if (ipiDetails) {
          item.taxes.push({
            type: 'IPI',
            baseCalculation: getNumericValue(ipiDetails.querySelector('vBC')),
            taxRate: getNumericValue(ipiDetails.querySelector('pIPI')) / 100,
            taxValue: getNumericValue(ipiDetails.querySelector('vIPI'))
          });
        }
      }

      // ISS
      const iss = imposto.querySelector('ISSQN');
      if (iss) {
        item.taxes.push({
          type: 'ISS',
          baseCalculation: getNumericValue(iss.querySelector('vBC')),
          taxRate: getNumericValue(iss.querySelector('vAliq')) / 100,
          taxValue: getNumericValue(iss.querySelector('vISSQN'))
        });
      }
    }

    items.push(item);
  });

  // Parse totals
  const totals = {
    totalProductsValue: getNumericValue(ICMSTot?.querySelector('vProd')),
    totalIcmsValue: getNumericValue(ICMSTot?.querySelector('vICMS')),
    totalPisValue: getNumericValue(ICMSTot?.querySelector('vPIS')),
    totalCofinsValue: getNumericValue(ICMSTot?.querySelector('vCOFINS')),
    totalIpiValue: getNumericValue(ICMSTot?.querySelector('vIPI')),
    totalIssValue: getNumericValue(ICMSTot?.querySelector('vISS')),
    totalNfeValue: getNumericValue(ICMSTot?.querySelector('vNF'))
  };

  // Parse billing information (cobr tag)
  const cobr = xmlDoc.querySelector('cobr');
  let fatura: NFeFatura | undefined;
  const duplicatas: NFeDuplicata[] = [];

  if (cobr) {
    // Parse fatura (invoice)
    const fat = cobr.querySelector('fat');
    if (fat) {
      fatura = {
        numeroFatura: getTextContent(fat.querySelector('nFat')),
        valorOriginal: getNumericValue(fat.querySelector('vOrig')),
        valorDesconto: getNumericValue(fat.querySelector('vDesc')),
        valorLiquido: getNumericValue(fat.querySelector('vLiq'))
      };
    }

    // Parse duplicatas (installments)
    const dupElements = cobr.querySelectorAll('dup');
    dupElements.forEach(dup => {
      duplicatas.push({
        numeroParcela: getTextContent(dup.querySelector('nDup')),
        dataVencimento: getTextContent(dup.querySelector('dVenc')),
        valorParcela: getNumericValue(dup.querySelector('vDup'))
      });
    });
  }

  return {
    nfeNumber,
    serie,
    emissionDate,
    operationNature,
    cfop,
    emitter,
    recipient,
    items,
    totals,
    fatura,
    duplicatas,
    xmlContent
  };
}

// Validate if file is a valid XML
export function validateXMLFile(file: File): boolean {
  return file.type === 'text/xml' || 
         file.type === 'application/xml' || 
         file.name.toLowerCase().endsWith('.xml');
}