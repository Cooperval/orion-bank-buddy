import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Info, Trash2, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseOFX, OFXData } from "@/lib/ofxParser";

interface FileWithData {
  file: File;
  data: OFXData | null;
  error?: string;
}

interface SavedOFXFile {
  id: string;
  filename: string;
  bank_name: string;
  account_id: string;
  uploaded_at: string;
  file_size: number;
  transaction_count?: number;
}

export default function IntegrarOFX() {
  const [pendingFiles, setPendingFiles] = useState<FileWithData[]>([]);
  const [savedFiles, setSavedFiles] = useState<SavedOFXFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedFiles();
  }, []);

  const loadSavedFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: files, error } = await supabase
        .from('ofx_files')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Count transactions for each file
      const filesWithCount = await Promise.all(
        (files || []).map(async (file) => {
          const { count } = await supabase
            .from('ofx_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('ofx_file_id', file.id);

          return {
            ...file,
            transaction_count: count || 0,
          };
        })
      );

      setSavedFiles(filesWithCount);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Erro ao carregar arquivos salvos');
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
    const newFilesWithData: FileWithData[] = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.ofx')) {
        toast.error(`${file.name} não é um arquivo OFX válido`);
        continue;
      }

      try {
        const content = await file.text();
        const data = parseOFX(content);
        newFilesWithData.push({ file, data });
      } catch (error) {
        console.error('Error parsing OFX:', error);
        newFilesWithData.push({
          file,
          data: null,
          error: 'Erro ao processar arquivo',
        });
      }
    }

    setPendingFiles([...pendingFiles, ...newFilesWithData]);
    toast.success(`${newFilesWithData.length} arquivo(s) carregado(s) para preview`);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
  };

  const saveFile = async (fileWithData: FileWithData, index: number) => {
    if (!fileWithData.data) {
      toast.error('Dados do arquivo inválidos');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Save OFX file record
      const { data: ofxFile, error: fileError } = await supabase
        .from('ofx_files')
        .insert({
          user_id: user.id,
          filename: fileWithData.file.name,
          bank_name: fileWithData.data.bankName,
          account_id: fileWithData.data.accountId,
          file_size: fileWithData.file.size,
        })
        .select()
        .single();

      if (fileError) throw fileError;

      // Save transactions
      const transactions = fileWithData.data.transactions.map((txn) => ({
        user_id: user.id,
        ofx_file_id: ofxFile.id,
        transaction_date: txn.date,
        amount: txn.amount,
        description: txn.description,
        type: txn.type,
        bank_name: fileWithData.data!.bankName,
      }));

      const { error: txnError } = await supabase
        .from('ofx_transactions')
        .insert(transactions);

      if (txnError) throw txnError;

      toast.success(`${fileWithData.file.name} salvo com sucesso!`);
      removePendingFile(index);
      loadSavedFiles();
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Erro ao salvar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('Deseja realmente excluir este arquivo e todas as suas transações?')) {
      return;
    }

    setLoading(true);
    try {
      // Delete transactions first (cascade)
      const { error: txnError } = await supabase
        .from('ofx_transactions')
        .delete()
        .eq('ofx_file_id', fileId);

      if (txnError) throw txnError;

      // Delete file record
      const { error: fileError } = await supabase
        .from('ofx_files')
        .delete()
        .eq('id', fileId);

      if (fileError) throw fileError;

      toast.success('Arquivo e transações excluídos com sucesso');
      loadSavedFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erro ao excluir arquivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold mb-2">Carregar OFX</h1>
      <p className="text-muted-foreground mb-6">
        Importe extratos bancários no formato OFX
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("ofx-file-input")?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              Selecione ou arraste múltiplos arquivos .ofx
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Clique aqui ou arraste múltiplos arquivos .ofx
            </p>
            <Button className="bg-primary">Selecionar Arquivos</Button>
            <input
              id="ofx-file-input"
              type="file"
              accept=".ofx"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-2">Informações sobre arquivos OFX:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Formato padrão para intercâmbio de dados financeiros</li>
                <li>• Gerado pela maioria dos bancos brasileiros</li>
                <li>• Contém informações detalhadas sobre transações</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview de arquivos pendentes */}
      {pendingFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preview dos Arquivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingFiles.map((fileWithData, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">{fileWithData.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(fileWithData.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveFile(fileWithData, index)}
                      disabled={!fileWithData.data || loading}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removePendingFile(index)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {fileWithData.error ? (
                  <div className="text-sm text-destructive">
                    {fileWithData.error}
                  </div>
                ) : fileWithData.data ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Banco:</span>{' '}
                        <span className="font-medium">{fileWithData.data.bankName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conta:</span>{' '}
                        <span className="font-medium">{fileWithData.data.accountId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Transações:</span>{' '}
                        <span className="font-medium">{fileWithData.data.transactions.length}</span>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fileWithData.data.transactions.slice(0, 10).map((txn, txnIndex) => (
                            <TableRow key={txnIndex}>
                              <TableCell className="text-sm">
                                {new Date(txn.date).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-sm">{txn.description}</TableCell>
                              <TableCell>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    txn.type === 'CREDIT'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {txn.type === 'CREDIT' ? 'Crédito' : 'Débito'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                R$ {txn.amount.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {fileWithData.data.transactions.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Mostrando 10 de {fileWithData.data.transactions.length} transações
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Arquivos salvos */}
      <Card>
        <CardHeader>
          <CardTitle>Arquivos OFX Salvos</CardTitle>
        </CardHeader>
        <CardContent>
          {savedFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum arquivo salvo ainda</p>
              <p className="text-sm text-muted-foreground mt-2">
                Faça upload e salve arquivos OFX para começar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.filename}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{file.bank_name}</span>
                        <span>Conta: {file.account_id}</span>
                        <span>{file.transaction_count} transações</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enviado em {new Date(file.uploaded_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFile(file.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
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
