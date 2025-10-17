import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  Calendar,
  Receipt,
  Package,
  DollarSign,
  Loader2,
  Eye,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CFOPClassification from "@/components/CFOPClassification";
import { useAuth } from '@/components/auth/AuthProvider';

interface NFeTax {
  id: string;
  tax_type: string;
  base_calculation: number;
  tax_rate: number;
  tax_value: number;
}

interface NFeItem {
  id: string;
  product_code: string;
  product_description: string;
  ncm: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  nfe_taxes: NFeTax[];
}

interface NFeDuplicata {
  id: string;
  numero_parcela: string;
  data_vencimento: string;
  valor_parcela: number;
}

interface NFeDocument {
  id: string;
  nfe_number: string;
  serie: string;
  emission_date: string;
  operation_nature: string;
  cfop: string;
  total_products_value: number;
  total_icms_value: number;
  total_pis_value: number;
  total_cofins_value: number;
  total_ipi_value: number;
  total_iss_value: number;
  total_nfe_value: number;
  fatura_numero?: string;
  fatura_valor_original: number;
  fatura_valor_desconto: number;
  fatura_valor_liquido: number;
  created_at: string;
  nfe_emitters: Array<{
    cnpj: string;
    razao_social: string;
    municipio: string;
    uf: string;
  }>;
  nfe_recipients: Array<{
    cnpj: string;
    razao_social: string;
    municipio: string;
    uf: string;
  }>;
  nfe_items: NFeItem[];
  nfe_duplicatas: NFeDuplicata[];
}

export default function NFeList() {
  const { companyId } = useAuth();
  const [nfeDocuments, setNfeDocuments] = useState<NFeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadNFeDocuments = async () => {
    try {
      setLoading(true);
      
      if (!companyId) {
        setNfeDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from('nfe_documents')
        .select(`
          *,
          nfe_emitters (*),
          nfe_recipients (*),
          nfe_items (
            *,
            nfe_taxes (*)
          ),
          nfe_duplicatas (*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNfeDocuments(data || []);
    } catch (error) {
      console.error('Error loading NFe documents:', error);
      toast({
        title: "Erro ao carregar NFes",
        description: "Não foi possível carregar a lista de Notas Fiscais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadNFeDocuments();
    }
  }, [companyId]);

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando NFes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais Carregadas</h1>
          <p className="text-muted-foreground">
            Visualize todas as NFes importadas e classifique CFOPs para análise de margem
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {nfeDocuments.length} NFe{nfeDocuments.length !== 1 ? 's' : ''}
        </Badge> */}
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Lista de NFes
          </TabsTrigger>
          <TabsTrigger value="cfop" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Classificação CFOPs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="cfop" className="mt-6">
          <CFOPClassification onUpdate={loadNFeDocuments} />
        </TabsContent>

        <TabsContent value="list" className="mt-6">

      {nfeDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma NFe carregada</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Ainda não há Notas Fiscais importadas. Acesse o módulo de Upload NFe para carregar seus arquivos XML.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Lista de NFes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Número/Série</TableHead>
                    <TableHead>Emitente</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Data Import.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nfeDocuments.map((nfe) => (
                    <>
                      <TableRow 
                        key={nfe.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleRowExpansion(nfe.id)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="sm" className="p-1">
                            {expandedRows.has(nfe.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono">
                            <div className="font-medium">{nfe.nfe_number}</div>
                            <div className="text-sm text-muted-foreground">Série: {nfe.serie}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="font-medium truncate">
                              {nfe.nfe_emitters[0]?.razao_social || '-'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCNPJ(nfe.nfe_emitters[0]?.cnpj || '')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="font-medium truncate">
                              {nfe.nfe_recipients[0]?.razao_social || '-'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCNPJ(nfe.nfe_recipients[0]?.cnpj || '')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(nfe.emission_date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(nfe.total_nfe_value)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {nfe.nfe_items.length} {nfe.nfe_items.length === 1 ? 'item' : 'itens'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(nfe.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row Content */}
                      {expandedRows.has(nfe.id) && (
                        <TableRow>
                          <TableCell colSpan={8} className="p-0 bg-muted/20">
                            <div className="p-6 space-y-6">
                              {/* NFe Details */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Document Info */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Receipt className="h-4 w-4" />
                                      Informações da NFe
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                     <div>
                                       <p className="text-xs font-medium text-muted-foreground">Natureza da Operação</p>
                                       <p className="text-sm font-medium">{nfe.operation_nature} {nfe.cfop && `(CFOP: ${nfe.cfop})`}</p>
                                     </div>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground">Produtos</p>
                                        <p className="text-sm font-medium">{formatCurrency(nfe.total_products_value)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground">ICMS</p>
                                        <p className="text-sm">{formatCurrency(nfe.total_icms_value)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground">PIS</p>
                                        <p className="text-sm">{formatCurrency(nfe.total_pis_value)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground">COFINS</p>
                                        <p className="text-sm">{formatCurrency(nfe.total_cofins_value)}</p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Emitter Details */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      Emitente
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Razão Social</p>
                                      <p className="text-sm font-medium">{nfe.nfe_emitters[0]?.razao_social}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">CNPJ</p>
                                      <p className="text-sm font-mono">{formatCNPJ(nfe.nfe_emitters[0]?.cnpj)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Localização</p>
                                      <p className="text-sm">{nfe.nfe_emitters[0]?.municipio} - {nfe.nfe_emitters[0]?.uf}</p>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Recipient Details */}
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      Destinatário
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Razão Social</p>
                                      <p className="text-sm font-medium">{nfe.nfe_recipients[0]?.razao_social}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">CNPJ</p>
                                      <p className="text-sm font-mono">{formatCNPJ(nfe.nfe_recipients[0]?.cnpj)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground">Localização</p>
                                      <p className="text-sm">{nfe.nfe_recipients[0]?.municipio} - {nfe.nfe_recipients[0]?.uf}</p>
                                    </div>
                                  </CardContent>
                                 </Card>
                              </div>

                              {/* Billing Information */}
                              {(nfe.fatura_numero || nfe.nfe_duplicatas.length > 0) && (
                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <DollarSign className="h-4 w-4" />
                                      Informações de Cobrança
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    {nfe.fatura_numero && (
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground">Número da Fatura</p>
                                          <p className="text-sm font-medium">{nfe.fatura_numero}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground">Valor Original</p>
                                          <p className="text-sm font-medium">{formatCurrency(nfe.fatura_valor_original)}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground">Desconto</p>
                                          <p className="text-sm font-medium">{formatCurrency(nfe.fatura_valor_desconto)}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground">Valor Líquido</p>
                                          <p className="text-sm font-medium text-green-600">{formatCurrency(nfe.fatura_valor_liquido)}</p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {nfe.nfe_duplicatas.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-3">Parcelas ({nfe.nfe_duplicatas.length})</p>
                                        <div className="overflow-x-auto">
                                          <Table>
                                            <TableHeader>
                                              <TableRow className="bg-muted/30">
                                                <TableHead className="text-xs">Nº Parcela</TableHead>
                                                <TableHead className="text-xs">Data Vencimento</TableHead>
                                                <TableHead className="text-xs">Valor</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {nfe.nfe_duplicatas.map((dup) => (
                                                <TableRow key={dup.id}>
                                                  <TableCell className="text-sm font-medium">{dup.numero_parcela}</TableCell>
                                                  <TableCell className="text-sm">{new Date(dup.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
                                                  <TableCell className="text-sm font-medium">{formatCurrency(dup.valor_parcela)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {/* Items Table */}
                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Itens da Nota ({nfe.nfe_items.length})
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted/30">
                                          <TableHead className="text-xs">Código</TableHead>
                                          <TableHead className="text-xs">Descrição</TableHead>
                                          <TableHead className="text-xs">NCM</TableHead>
                                          <TableHead className="text-xs">Qtd</TableHead>
                                          <TableHead className="text-xs">Valor Unit.</TableHead>
                                          <TableHead className="text-xs">Valor Total</TableHead>
                                          {/* Dynamic tax columns */}
                                          {(() => {
                                            const allTaxTypes = new Set<string>();
                                            nfe.nfe_items.forEach(item => {
                                              item.nfe_taxes.forEach(tax => allTaxTypes.add(tax.tax_type));
                                            });
                                            return Array.from(allTaxTypes).sort().map(taxType => (
                                              <TableHead key={taxType} className="text-xs">{taxType}</TableHead>
                                            ));
                                          })()}
                                          <TableHead className="text-xs">Valor Líquido</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {nfe.nfe_items.map((item, index) => {
                                          // Get all tax types for this NFe
                                          const allTaxTypes = new Set<string>();
                                          nfe.nfe_items.forEach(nfeItem => {
                                            nfeItem.nfe_taxes.forEach(tax => allTaxTypes.add(tax.tax_type));
                                          });
                                          const taxTypesArray = Array.from(allTaxTypes).sort();
                                          
                                          // Calculate total taxes for this item
                                          const totalTaxes = item.nfe_taxes.reduce((sum, tax) => sum + tax.tax_value, 0);
                                          const netValue = item.total_value - totalTaxes;
                                          
                                          // Create a map of tax values for this item
                                          const taxMap = new Map<string, number>();
                                          item.nfe_taxes.forEach(tax => {
                                            taxMap.set(tax.tax_type, tax.tax_value);
                                          });
                                          
                                          return (
                                            <TableRow key={item.id} className={index % 2 === 0 ? 'bg-muted/10' : ''}>
                                              <TableCell className="font-mono text-xs">{item.product_code}</TableCell>
                                              <TableCell className="max-w-xs text-xs">
                                                <div className="truncate" title={item.product_description}>
                                                  {item.product_description}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-xs">{item.ncm}</TableCell>
                                              <TableCell className="text-xs">{item.quantity.toLocaleString('pt-BR')}</TableCell>
                                              <TableCell className="text-xs">{formatCurrency(item.unit_value)}</TableCell>
                                              <TableCell className="text-xs font-medium">{formatCurrency(item.total_value)}</TableCell>
                                              {/* Individual tax columns */}
                                              {taxTypesArray.map(taxType => (
                                                <TableCell key={taxType} className="text-xs">
                                                  {taxMap.has(taxType) ? formatCurrency(taxMap.get(taxType)!) : '-'}
                                                </TableCell>
                                              ))}
                                              <TableCell className="text-xs font-medium text-green-600">
                                                {formatCurrency(netValue)}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}