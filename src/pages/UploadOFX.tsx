import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  Calendar,
  Building2,
  CreditCard,
  Check,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseOFX, validateOFXFile, OFXData, OFXTransaction } from "@/utils/ofxParser";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth/AuthProvider";

const UploadOFX = () => {
  const { companyId } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [parsedData, setParsedData] = useState<{ [key: string]: OFXData }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // OFX uploads management state
  const [uploads, setUploads] = useState<any[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  // Classification rules state
  const [applyClassificationRules, setApplyClassificationRules] = useState(false);
  const [classificationRules, setClassificationRules] = useState<any[]>([]);

  const loadUploads = async () => {
    if (!companyId) return;

    setLoadingUploads(true);
    const { data, error } = await supabase
      .from("ofx_uploads")
      .select("id, filename, file_size, transactions_count, upload_date, bank_id, status")
      .eq("company_id", companyId)
      .order("upload_date", { ascending: false });
    if (!error) setUploads(data || []);
    setLoadingUploads(false);
  };

  useEffect(() => {
    loadUploads();
    fetchClassificationRules();
  }, [companyId]);

  const handleDeleteUpload = async (id: string, filename: string) => {
    const { error } = await supabase.from("ofx_uploads").delete().eq("id", id);
    if (error) {
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o upload.",
        variant: "destructive",
      });
    } else {
      // Check if we should remove the bank as well
      await cleanupOrphanedBanks();

      toast({
        title: "Upload deletado",
        description: `Arquivo ${filename} e suas transações foram removidos`,
      });
      loadUploads();
    }
  };

  const cleanupOrphanedBanks = async () => {
    try {
      // Call the SQL function to cleanup orphaned banks
      const { error } = await supabase.rpc("cleanup_orphaned_banks");
      if (error) {
        console.error("Error cleaning up orphaned banks:", error);
      }
    } catch (error) {
      console.error("Error cleaning up orphaned banks:", error);
    }
  };

  const fetchClassificationRules = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("classification_rules")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (!error && data) {
        setClassificationRules(data);
      }
    } catch (error) {
      console.error("Error fetching classification rules:", error);
    }
  };

  const handleFileSelect = async (selectedFiles: File[]) => {
    setError("");
    setUploadStatus("idle");

    const validFiles: File[] = [];

    for (const selectedFile of selectedFiles) {
      // Validate file extension
      if (!selectedFile.name.toLowerCase().endsWith(".ofx")) {
        toast({
          title: "Arquivo inválido",
          description: `${selectedFile.name} não é um arquivo .ofx válido.`,
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${selectedFile.name} deve ter no máximo 10MB.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(selectedFile);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);

      // Process each file
      for (const file of validFiles) {
        await handlePreview(file);
      }

      setShowPreview(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handlePreview = async (fileToProcess: File) => {
    const fileName = fileToProcess.name;
    setProcessingFiles((prev) => new Set([...prev, fileName]));

    try {
      const isValid = await validateOFXFile(fileToProcess);
      if (!isValid) {
        toast({
          title: "Arquivo OFX inválido",
          description: `${fileName} está corrompido ou não é um arquivo OFX válido.`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = await parseOFX(content);
          setParsedData((prev) => ({ ...prev, [fileName]: data }));
          setUploadStatus("success");
          toast({
            title: "Arquivo processado",
            description: `${fileName} foi processado com sucesso.`,
          });
        } catch (error) {
          toast({
            title: "Erro ao processar arquivo",
            description: `${fileName}: ${error}`,
            variant: "destructive",
          });
        } finally {
          setProcessingFiles((prev) => {
            const newSet = new Set(prev);
            newSet.delete(fileName);
            return newSet;
          });
        }
      };

      reader.readAsText(fileToProcess);
    } catch (error) {
      toast({
        title: "Erro ao validar arquivo",
        description: `${fileName}: ${error}`,
        variant: "destructive",
      });
      setProcessingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  };

  const checkForDuplicates = async (transactions: OFXTransaction[]) => {
    if (!companyId) return [];

    const fitids = transactions.map((t) => t.fitid).filter(Boolean);
    if (fitids.length === 0) return [];

    const { data } = await supabase
      .from("transactions")
      .select("fitid")
      .eq("company_id", companyId)
      .in("fitid", fitids);

    return data?.map((d) => d.fitid) || [];
  };

  const handleImport = async () => {
    const parsedDataEntries = Object.entries(parsedData);
    if (parsedDataEntries.length === 0) return;

    if (!companyId) {
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível identificar a empresa do usuário",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingFiles(new Set(Object.keys(parsedData)));

      let totalImported = 0;
      let totalDuplicates = 0;

      for (const [fileName, data] of parsedDataEntries) {
        const currentFile = files.find((f) => f.name === fileName);
        if (!currentFile) continue;

        // Check for existing bank or create new one
        let bankId: string;
        const { data: existingBanks } = await supabase
          .from("banks")
          .select("id")
          .eq("company_id", companyId)
          .eq("bank_code", data.bankInfo.bankCode)
          .eq("account_number", data.bankInfo.accountNumber)
          .limit(1);

        if (existingBanks && existingBanks.length > 0) {
          bankId = existingBanks[0].id;
        } else {
          // Create new bank
          const { data: newBank, error: bankError } = await supabase
            .from("banks")
            .insert({
              company_id: companyId,
              bank_code: data.bankInfo.bankCode,
              bank_name: data.bankInfo.bankName,
              account_number: data.bankInfo.accountNumber,
              account_type: data.bankInfo.accountType,
              agency: data.bankInfo.agency,
            })
            .select("id")
            .single();

          if (bankError) throw bankError;
          bankId = newBank.id;
        }

        // Check for duplicates
        const duplicateFitids = await checkForDuplicates(data.transactions);
        const newTransactions = data.transactions.filter((t) => !duplicateFitids.includes(t.fitid));

        if (newTransactions.length === 0) {
          totalDuplicates += data.transactions.length;
          continue;
        }

        // Create upload record first to link transactions
        const { data: uploadRow, error: createUploadError } = await supabase
          .from("ofx_uploads")
          .insert({
            company_id: companyId,
            filename: currentFile.name,
            file_size: currentFile.size,
            bank_id: bankId,
            transactions_count: 0,
            status: "processing",
          })
          .select("id")
          .single();

        if (createUploadError || !uploadRow?.id)
          throw createUploadError || new Error("Falha ao criar registro do upload");

        const uploadId = uploadRow.id as string;

        // Insert transactions linked to this upload
        const transactionsToInsert = newTransactions.map((transaction) => ({
          company_id: companyId,
          bank_id: bankId,
          transaction_date: transaction.date.toISOString().split("T")[0],
          amount: transaction.amount,
          description: transaction.description,
          transaction_type: transaction.transactionType,
          fitid: transaction.fitid,
          memo: transaction.memo,
          ofx_upload_id: uploadId,
        }));

        const { data: insertedTransactions, error: transactionError } = await supabase
          .from("transactions")
          .insert(transactionsToInsert)
          .select("id");

        if (transactionError) throw transactionError;

        // Aplicar classificações se a opção estiver ativa
        if (applyClassificationRules && insertedTransactions && insertedTransactions.length > 0) {
          const transactionIds = insertedTransactions.map((t) => t.id);
          await applyClassificationsToNewTransactions(transactionIds);
        }

        // Update upload with final count and status
        await supabase
          .from("ofx_uploads")
          .update({ transactions_count: newTransactions.length, status: "processed" })
          .eq("id", uploadId);

        totalImported += newTransactions.length;
        totalDuplicates += duplicateFitids.length;
      }

      toast({
        title: "Importação concluída!",
        description: `${totalImported} transações importadas de ${parsedDataEntries.length} arquivo(s)${totalDuplicates > 0 ? ` (${totalDuplicates} duplicatas ignoradas)` : ""}`,
      });

      // Reset form
      setFiles([]);
      setParsedData({});
      setShowPreview(false);
      setUploadStatus("idle");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Navigate to transactions page
      navigate("/transactions");
    } catch (error) {
      console.error("Import error:", error);
      setError(`Erro na importação: ${error}`);
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar os arquivos OFX",
        variant: "destructive",
      });
    } finally {
      setProcessingFiles(new Set());
    }
  };

  const applyClassificationsToNewTransactions = async (transactionIds: string[]) => {
    if (!companyId || transactionIds.length === 0) return;

    try {
      let appliedCount = 0;

      // Buscar as transações recém-importadas
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("id, description")
        .in("id", transactionIds);

      if (transError || !transactions) {
        console.error("Error fetching transactions for classification:", transError);
        return;
      }

      // Buscar user_id para o classified_by
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      // Aplicar regras a cada transação
      for (const transaction of transactions) {
        for (const rule of classificationRules) {
          if (transaction.description.toLowerCase().includes(rule.description_contains.toLowerCase())) {
            // Inserir classificação
            const { error: classError } = await supabase.from("transaction_classifications").insert({
              transaction_id: transaction.id,
              commitment_group_id: rule.commitment_group_id || null,
              commitment_id: rule.commitment_id || null,
              commitment_type_id: rule.commitment_type_id || null,
              classified_by: userId,
            });

            if (!classError) {
              appliedCount++;
            }
            break; // Aplica apenas a primeira regra que corresponder
          }
        }
      }

      if (appliedCount > 0) {
        toast({
          title: "Classificações aplicadas",
          description: `${appliedCount} de ${transactionIds.length} transações foram classificadas automaticamente`,
        });
      }
    } catch (error) {
      console.error("Error applying classifications:", error);
    }
  };

  const getStatusIcon = () => {
    const isProcessing = processingFiles.size > 0;
    if (isProcessing) return <Upload className="h-8 w-8 animate-spin" />;
    if (uploadStatus === "success") return <Check className="h-8 w-8 text-success" />;
    if (uploadStatus === "error") return <AlertCircle className="h-8 w-8 text-destructive" />;
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  };

  const getStatusText = () => {
    const isProcessing = processingFiles.size > 0;
    if (isProcessing) return "Processando arquivos...";
    if (uploadStatus === "success") return "Arquivos processados com sucesso!";
    if (uploadStatus === "error") return "Erro no processamento";
    return "Selecione ou arraste múltiplos arquivos .ofx";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {!showPreview && (
          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="text-xl text-center">Selecionar Arquivo</CardTitle>
              <CardDescription className="text-center">
                Selecione um arquivo .ofx exportado do seu banco
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                } ${processingFiles.size > 0 ? "pointer-events-none opacity-50" : ""}`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onClick={triggerFileSelect}
              >
                <div className="space-y-4">
                  {getStatusIcon()}
                  <div>
                    <p className="text-lg font-medium">{getStatusText()}</p>
                    <p className="text-sm text-muted-foreground mt-2">Clique aqui ou arraste múltiplos arquivos .ofx</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={processingFiles.size > 0}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {uploadStatus === "success" && !error && (
                <Alert className="border-success/50 bg-success/10">
                  <Check className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success-foreground">
                    Arquivo processado com sucesso! Verifique as informações abaixo.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={triggerFileSelect}
                  disabled={processingFiles.size > 0}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Arquivos
                </Button>
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm">Arquivos selecionados:</h4>
                  {files.map((file, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{file.name}</span>
                          <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                        </div>
                        {processingFiles.has(file.name) ? (
                          <Upload className="h-4 w-4 animate-spin" />
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
        )}

        {/* Preview Section */}
        {showPreview && Object.keys(parsedData).length > 0 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Arquivos Processados</h2>
                  <p className="text-muted-foreground">
                    {Object.keys(parsedData).length} arquivo(s) pronto(s) para importar
                  </p>
                </div>
              </div>

              {/* Opção de classificação automática */}
              {classificationRules.length > 0 && (
                <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border">
                  <Switch
                    id="apply-classification"
                    checked={applyClassificationRules}
                    onCheckedChange={setApplyClassificationRules}
                  />
                  <div className="flex-1">
                    <label htmlFor="apply-classification" className="text-sm font-medium leading-none cursor-pointer">
                      Aplicar classificações automáticas
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      As transações serão classificadas automaticamente com base nas regras cadastradas.
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={processingFiles.size > 0}
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90"
              >
                {processingFiles.size > 0 ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Importar Todos os Arquivos
                  </>
                )}
              </Button>
            </div>

            {Object.entries(parsedData).map(([fileName, data]) => (
              <Card key={fileName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {fileName}
                  </CardTitle>
                  <CardDescription>Verifique as informações antes de confirmar a importação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bank Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Banco</p>
                        <p className="text-sm text-muted-foreground">
                          {data.bankInfo.bankName} ({data.bankInfo.bankCode})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Conta</p>
                        <p className="text-sm text-muted-foreground">
                          {data.bankInfo.accountNumber}
                          {data.bankInfo.agency && ` (Ag: ${data.bankInfo.agency})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Período</p>
                        <p className="text-sm text-muted-foreground">
                          {format(data.startDate, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                          {format(data.endDate, "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{data.transactions.length}</p>
                          <p className="text-sm text-muted-foreground">Transações</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-success">
                            {data.transactions.filter((t) => t.transactionType === "credit").length}
                          </p>
                          <p className="text-sm text-muted-foreground">Créditos</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-destructive">
                            {data.transactions.filter((t) => t.transactionType === "debit").length}
                          </p>
                          <p className="text-sm text-muted-foreground">Débitos</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Transactions List */}
                  <div>
                    <h3 className="font-semibold mb-4">
                      Transações ({data.transactions.slice(0, 10).length} de {data.transactions.length} mostradas)
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {data.transactions.slice(0, 10).map((transaction, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(transaction.date, "dd/MM/yyyy", { locale: ptBR })}
                              {transaction.memo && ` • ${transaction.memo}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={transaction.transactionType === "credit" ? "default" : "destructive"}>
                              {transaction.transactionType === "credit" ? "+" : "-"}
                              R$ {transaction.amount.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {data.transactions.length > 10 && (
                        <p className="text-center text-sm text-muted-foreground py-2">
                          ... e mais {data.transactions.length - 10} transações
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* OFX Uploads Management */}
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>Arquivos OFX enviados</CardTitle>
            <CardDescription>
              Gerencie seus uploads. Ao deletar, todas as movimentações deste arquivo serão removidas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUploads ? (
              <p className="text-sm text-muted-foreground">Carregando uploads...</p>
            ) : uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum upload encontrado.</p>
            ) : (
              <div className="space-y-3">
                {uploads.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.upload_date
                          ? `${format(new Date(u.upload_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
                          : "Sem data"}{" "}
                        • {(u.file_size / 1024).toFixed(1)} KB • {u.transactions_count} transações • Status: {u.status}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deletar arquivo OFX?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação removerá o arquivo e todas as movimentações importadas a partir dele. Esta ação
                            não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUpload(u.id, u.filename)}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold text-sm text-foreground mb-2">Informações sobre arquivos OFX:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Formato padrão para intercâmbio de dados financeiros</li>
            <li>• Gerado pela maioria dos bancos brasileiros</li>
            <li>• Contém informações detalhadas sobre transações</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadOFX;
