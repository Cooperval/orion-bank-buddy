import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseXML, ParsedNFe } from "@/lib/xmlParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PendingNFe {
  file: File;
  data: ParsedNFe;
  expanded: boolean;
}

interface SavedNFe {
  id: string;
  filename: string;
  nf_number: string;
  nf_date: string;
  total_value: number;
  status: string;
  uploaded_at: string;
}

export default function ImportarXML() {
  const [pendingFiles, setPendingFiles] = useState<PendingNFe[]>([]);
  const [savedFiles, setSavedFiles] = useState<SavedNFe[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedFiles();
  }, []);

  const loadSavedFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('xml_files')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setSavedFiles(data || []);
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processFiles = async (files: File[]) => {
    const newPending: PendingNFe[] = [];

    for (const file of files) {
      try {
        const content = await file.text();
        const parsed = parseXML(content);

        if (parsed) {
          newPending.push({
            file,
            data: parsed,
            expanded: false,
          });
        } else {
          toast.error(`Erro ao processar ${file.name}`);
        }
      } catch (error) {
        toast.error(`Erro ao ler ${file.name}`);
      }
    }

    setPendingFiles([...pendingFiles, ...newPending]);
    toast.success(`${newPending.length} arquivo(s) processado(s)`);
  };

  const toggleExpanded = (index: number) => {
    const updated = [...pendingFiles];
    updated[index].expanded = !updated[index].expanded;
    setPendingFiles(updated);
  };

  const removePending = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
    toast.success('Arquivo removido');
  };

  const saveAllNFe = async () => {
    if (pendingFiles.length === 0) {
      toast.error('Nenhum arquivo para salvar');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      for (const pending of pendingFiles) {
        const { error } = await supabase.from('xml_files').insert({
          user_id: user.id,
          filename: pending.file.name,
          file_size: pending.file.size,
          nf_number: pending.data.numero,
          nf_date: new Date(pending.data.dataEmissao.split('/').reverse().join('-')).toISOString().split('T')[0],
          total_value: pending.data.totais.valorTotal,
          status: pending.data.status,
        });

        if (error) throw error;
      }

      toast.success(`${pendingFiles.length} NF-e(s) salva(s) com sucesso!`);
      setPendingFiles([]);
      await loadSavedFiles();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const deleteSaved = async (id: string) => {
    try {
      const { error } = await supabase
        .from('xml_files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('NF-e excluída com sucesso');
      await loadSavedFiles();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir arquivo');
    }
  };

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold mb-2">Carregar XML</h1>
      <p className="text-muted-foreground mb-6">
        Importe arquivos XML de notas fiscais eletrônicas
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("xml-file-input")?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              Arraste e solte os arquivos XML aqui
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou clique para selecionar múltiplos arquivos
            </p>
            <Button>Escolher arquivo</Button>
            <input
              id="xml-file-input"
              type="file"
              accept=".xml"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {pendingFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Arquivos Processados</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingFiles.length} arquivo(s) pronto(s) para salvar
              </p>
            </div>
            <Button onClick={saveAllNFe} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Todas as NFe'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingFiles.map((pending, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{pending.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          NF-e nº {pending.data.numero}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(index)}
                      >
                        {pending.expanded ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePending(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {pending.expanded && (
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4">Informações da NFe</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Número</p>
                          <p className="font-medium">{pending.data.numero}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Série</p>
                          <p className="font-medium">{pending.data.serie}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Data de Emissão</p>
                          <p className="font-medium">{pending.data.dataEmissao}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Natureza da Operação</p>
                          <p className="font-medium">{pending.data.naturezaOperacao}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Emitente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-sm text-muted-foreground">CNPJ</p>
                            <p className="font-medium">{pending.data.emitente.cnpj}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Razão Social</p>
                            <p className="font-medium">{pending.data.emitente.razaoSocial}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Localização</p>
                            <p className="font-medium">{pending.data.emitente.localizacao}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Destinatário</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-sm text-muted-foreground">CNPJ</p>
                            <p className="font-medium">{pending.data.destinatario.cnpj}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Razão Social</p>
                            <p className="font-medium">{pending.data.destinatario.razaoSocial}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Localização</p>
                            <p className="font-medium">{pending.data.destinatario.localizacao}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">
                        Itens da Nota ({pending.data.itens.length})
                      </h3>
                      <div className="border rounded-lg overflow-hidden">
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
                            {pending.data.itens.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.codigo}</TableCell>
                                <TableCell>{item.descricao}</TableCell>
                                <TableCell>{item.ncm}</TableCell>
                                <TableCell>{item.qtd}</TableCell>
                                <TableCell>R$ {item.valorUnit.toFixed(2)}</TableCell>
                                <TableCell>R$ {item.valorTotal.toFixed(2)}</TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    {item.icms && `ICMS: R$ ${item.icms.toFixed(2)} `}
                                    {item.pis && `PIS: R$ ${item.pis.toFixed(2)} `}
                                    {item.cofins && `COFINS: R$ ${item.cofins.toFixed(2)}`}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Totais da NFe</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor dos Produtos</p>
                          <p className="font-medium">R$ {pending.data.totais.valorProdutos.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">ICMS</p>
                          <p className="font-medium">R$ {pending.data.totais.icms.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">PIS</p>
                          <p className="font-medium">R$ {pending.data.totais.pis.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">COFINS</p>
                          <p className="font-medium">R$ {pending.data.totais.cofins.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">IPI</p>
                          <p className="font-medium">R$ {pending.data.totais.ipi.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Valor Total da NFe</p>
                          <p className="font-bold text-lg">R$ {pending.data.totais.valorTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>NF-e's Carregadas</CardTitle>
        </CardHeader>
        <CardContent>
          {savedFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma NF-e carregada ainda
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Faça upload de arquivos XML para começar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{file.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        NF-e nº {file.nf_number} • R$ {file.total_value?.toFixed(2)} • {file.status}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSaved(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
