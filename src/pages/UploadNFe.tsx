import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseNFeXML, validateXMLFile, NFeParsedData } from "@/utils/nfeParser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from '@/components/auth/AuthProvider';

export default function UploadNFe() {
  const { companyId } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<{ [key: string]: NFeParsedData }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // NFe uploads management state
  const [uploads, setUploads] = useState<any[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  const loadUploads = async () => {
    if (!companyId) return;
    
    setLoadingUploads(true);
    try {
      const { data, error } = await supabase
        .from('nfe_documents')
        .select(`
          id, 
          nfe_number, 
          serie, 
          emission_date, 
          operation_nature,
          total_nfe_value,
          created_at,
          nfe_emitters(razao_social)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (!error) setUploads(data || []);
    } catch (error) {
      console.error('Error loading NFe uploads:', error);
    } finally {
      setLoadingUploads(false);
    }
  };

  useEffect(() => { 
    loadUploads(); 
  }, []);

  const handleDeleteUpload = async (id: string, nfeNumber: string) => {
    try {
      const { error } = await supabase.from('nfe_documents').delete().eq('id', id);
      if (error) throw error;
      
      toast({
        title: 'NFe deletada',
        description: `NFe ${nfeNumber} foi removida com sucesso.`,
      });
      loadUploads();
    } catch (error) {
      toast({
        title: 'Erro ao deletar',
        description: 'Não foi possível deletar a NFe.',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = async (files: File[]) => {
    const validFiles: File[] = [];
    
    for (const file of files) {
      if (!validateXMLFile(file)) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name} não é um arquivo XML válido.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} deve ter no máximo 10MB.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      // Process each file
      for (const file of validFiles) {
        await processFile(file);
      }
    }
  };

  const processFile = async (file: File) => {
    const fileName = file.name;
    setProcessingFiles(prev => new Set([...prev, fileName]));
    
    try {
      const xmlContent = await file.text();
      const parsed = await parseNFeXML(xmlContent);
      setParsedData(prev => ({ ...prev, [fileName]: parsed }));
      toast({
        title: "XML processado com sucesso",
        description: `${fileName} foi processado e está pronto para revisão.`,
      });
    } catch (error) {
      console.error('Error parsing XML:', error);
      toast({
        title: "Erro ao processar XML",
        description: `${fileName}: ${error instanceof Error ? error.message : "Erro desconhecido ao processar o arquivo XML."}`,
        variant: "destructive",
      });
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
    }
  };

  const saveToDatabase = async () => {
    const parsedDataEntries = Object.entries(parsedData);
    if (parsedDataEntries.length === 0) return;

    if (!companyId) {
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível identificar a empresa do usuário",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      for (const [fileName, data] of parsedDataEntries) {

        // Insert main NFe document
        const { data: nfeDoc, error: nfeError } = await supabase
          .from('nfe_documents')
          .insert({
            company_id: companyId,
            nfe_number: data.nfeNumber,
            serie: data.serie,
            emission_date: data.emissionDate,
            operation_nature: data.operationNature,
            cfop: data.cfop,
            total_products_value: data.totals.totalProductsValue,
            total_icms_value: data.totals.totalIcmsValue,
            total_pis_value: data.totals.totalPisValue,
            total_cofins_value: data.totals.totalCofinsValue,
            total_ipi_value: data.totals.totalIpiValue,
            total_iss_value: data.totals.totalIssValue,
            total_nfe_value: data.totals.totalNfeValue,
            fatura_numero: data.fatura?.numeroFatura,
            fatura_valor_original: data.fatura?.valorOriginal || 0,
            fatura_valor_desconto: data.fatura?.valorDesconto || 0,
            fatura_valor_liquido: data.fatura?.valorLiquido || 0,
            xml_content: data.xmlContent
          })
          .select()
          .single();

        if (nfeError) throw nfeError;

        // Insert emitter
        const { error: emitterError } = await supabase
          .from('nfe_emitters')
          .insert({
            nfe_document_id: nfeDoc.id,
            cnpj: data.emitter.cnpj,
            razao_social: data.emitter.razaoSocial,
            municipio: data.emitter.municipio,
            uf: data.emitter.uf
          });

        if (emitterError) throw emitterError;

        // Insert recipient
        const { error: recipientError } = await supabase
          .from('nfe_recipients')
          .insert({
            nfe_document_id: nfeDoc.id,
            cnpj: data.recipient.cnpj,
            razao_social: data.recipient.razaoSocial,
            municipio: data.recipient.municipio,
            uf: data.recipient.uf
          });

        if (recipientError) throw recipientError;

        // Insert items and their taxes
        for (const item of data.items) {
          const { data: nfeItem, error: itemError } = await supabase
            .from('nfe_items')
            .insert({
              nfe_document_id: nfeDoc.id,
              product_code: item.productCode,
              product_description: item.productDescription,
              ncm: item.ncm,
              quantity: item.quantity,
              unit_value: item.unitValue,
              total_value: item.totalValue
            })
            .select()
            .single();

          if (itemError) throw itemError;

          // Insert taxes for this item
          for (const tax of item.taxes) {
            const { error: taxError } = await supabase
              .from('nfe_taxes')
              .insert({
                nfe_item_id: nfeItem.id,
                tax_type: tax.type,
                base_calculation: tax.baseCalculation,
                tax_rate: tax.taxRate,
                tax_value: tax.taxValue
              });

            if (taxError) throw taxError;
          }
        }

        // Insert duplicatas (installments)
        for (const duplicata of data.duplicatas) {
          const { error: duplicataError } = await supabase
            .from('nfe_duplicatas')
            .insert({
              nfe_document_id: nfeDoc.id,
              numero_parcela: duplicata.numeroParcela,
              data_vencimento: duplicata.dataVencimento,
              valor_parcela: duplicata.valorParcela
            });

          if (duplicataError) throw duplicataError;
        }
      }

      toast({
        title: "NFe salvas com sucesso",
        description: `${parsedDataEntries.length} Nota(s) Fiscal(is) foram salvas no banco de dados.`,
      });

      // Reset form
      setSelectedFiles([]);
      setParsedData({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reload uploads list
      loadUploads();

    } catch (error) {
      console.error('Error saving NFe:', error);
      toast({
        title: "Erro ao salvar NFe",
        description: "Ocorreu um erro ao salvar os dados da Nota Fiscal.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Selecionar Arquivo XML
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Arraste e solte os arquivos XML aqui
                </p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar múltiplos arquivos
                </p>
              </div>
              <Label htmlFor="xml-file">
                <Button variant="outline" asChild>
                  <span>Escolher arquivo</span>
                </Button>
              </Label>
              <Input
                id="xml-file"
                ref={fileInputRef}
                type="file"
                accept=".xml"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{file.name}</span>
                      <Badge variant="secondary">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    {processingFiles.has(file.name) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : parsedData[file.name] ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Data */}
      {Object.keys(parsedData).length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Arquivos Processados</h2>
              <p className="text-muted-foreground">{Object.keys(parsedData).length} arquivo(s) pronto(s) para salvar</p>
            </div>
            <Button 
              onClick={saveToDatabase} 
              disabled={isSaving}
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Todas as NFe'
              )}
            </Button>
          </div>

          {Object.entries(parsedData).map(([fileName, data]) => (
            <div key={fileName} className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold">{fileName}</h3>
              </div>

              {/* Document Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações da NFe</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Número</Label>
                    <p className="font-medium">{data.nfeNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Série</Label>
                    <p className="font-medium">{data.serie}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data de Emissão</Label>
                    <p className="font-medium">{new Date(data.emissionDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Natureza da Operação</Label>
                    <p className="font-medium">{data.operationNature} {data.cfop && `(CFOP: ${data.cfop})`}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Participants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Emitter */}
                <Card>
                  <CardHeader>
                    <CardTitle>Emitente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">CNPJ</Label>
                      <p className="font-medium">{data.emitter.cnpj}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Razão Social</Label>
                      <p className="font-medium">{data.emitter.razaoSocial}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Localização</Label>
                      <p className="font-medium">{data.emitter.municipio} - {data.emitter.uf}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Recipient */}
                <Card>
                  <CardHeader>
                    <CardTitle>Destinatário</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">CNPJ</Label>
                      <p className="font-medium">{data.recipient.cnpj}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Razão Social</Label>
                      <p className="font-medium">{data.recipient.razaoSocial}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Localização</Label>
                      <p className="font-medium">{data.recipient.municipio} - {data.recipient.uf}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Itens da Nota ({data.items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>NCM</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Valor Unit.</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Impostos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{item.productCode}</TableCell>
                            <TableCell className="max-w-xs truncate" title={item.productDescription}>
                              {item.productDescription}
                            </TableCell>
                            <TableCell>{item.ncm}</TableCell>
                            <TableCell>{item.quantity.toLocaleString('pt-BR')}</TableCell>
                            <TableCell>{formatCurrency(item.unitValue)}</TableCell>
                            <TableCell>{formatCurrency(item.totalValue)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {item.taxes.map((tax, taxIndex) => (
                                  <Badge key={taxIndex} variant="outline" className="text-xs">
                                    {tax.type}: {formatCurrency(tax.taxValue)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardHeader>
                  <CardTitle>Totais da NFe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Produtos</Label>
                      <p className="font-bold text-lg">{formatCurrency(data.totals.totalProductsValue)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">ICMS</Label>
                      <p className="font-medium">{formatCurrency(data.totals.totalIcmsValue)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">PIS</Label>
                      <p className="font-medium">{formatCurrency(data.totals.totalPisValue)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">COFINS</Label>
                      <p className="font-medium">{formatCurrency(data.totals.totalCofinsValue)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">IPI</Label>
                      <p className="font-medium">{formatCurrency(data.totals.totalIpiValue)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">ISS</Label>
                      <p className="font-medium">{formatCurrency(data.totals.totalIssValue)}</p>
                    </div>
                     <div className="md:col-span-1">
                      <Label className="text-sm font-medium text-muted-foreground">Total NFe</Label>
                      <p className="font-bold text-xl text-primary">{formatCurrency(data.totals.totalNfeValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Billing Information */}
              {(data.fatura || data.duplicatas.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informações de Cobrança</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.fatura && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Número da Fatura</Label>
                          <p className="font-medium">{data.fatura.numeroFatura}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Valor Original</Label>
                          <p className="font-medium">{formatCurrency(data.fatura.valorOriginal)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Desconto</Label>
                          <p className="font-medium">{formatCurrency(data.fatura.valorDesconto)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Valor Líquido</Label>
                          <p className="font-medium text-green-600">{formatCurrency(data.fatura.valorLiquido)}</p>
                        </div>
                      </div>
                    )}
                    
                    {data.duplicatas.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Parcelas ({data.duplicatas.length})</Label>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nº Parcela</TableHead>
                              <TableHead>Data Vencimento</TableHead>
                              <TableHead>Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.duplicatas.map((dup, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{dup.numeroParcela}</TableCell>
                                <TableCell>{new Date(dup.dataVencimento).toLocaleDateString('pt-BR')}</TableCell>
                                <TableCell>{formatCurrency(dup.valorParcela)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}

      {/* NFe Uploads List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            NFe's Carregadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUploads ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando...</span>
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma NFe carregada ainda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Série</TableHead>
                    <TableHead>Emitente</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Data Upload</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell className="font-mono">{upload.nfe_number}</TableCell>
                      <TableCell>{upload.serie}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {upload.nfe_emitters?.[0]?.razao_social || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(upload.emission_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(upload.total_nfe_value)}
                      </TableCell>
                      <TableCell>
                        {new Date(upload.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar a NFe {upload.nfe_number}? 
                                Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUpload(upload.id, upload.nfe_number)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}