import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, FileText, DollarSign, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";

interface OFXTransaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  type: string;
  bank_name: string | null;
  classification: string | null;
}

interface XMLFile {
  id: string;
  filename: string;
  nf_number: string | null;
  nf_date: string | null;
  total_value: number | null;
  status: string | null;
}

const Classificar: React.FC = () => {
  const [ofxTransactions, setOfxTransactions] = useState<OFXTransaction[]>([]);
  const [xmlFiles, setXmlFiles] = useState<XMLFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingClassification, setEditingClassification] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch OFX Transactions
      const { data: ofxData, error: ofxError } = await supabase
        .from("ofx_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (ofxError) {
        console.error("Error fetching OFX transactions:", ofxError);
      } else {
        setOfxTransactions(ofxData || []);
      }

      // Fetch XML Files
      const { data: xmlData, error: xmlError } = await supabase
        .from("xml_files")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });

      if (xmlError) {
        console.error("Error fetching XML files:", xmlError);
      } else {
        setXmlFiles(xmlData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao buscar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClassification = async (transactionId: string, classification: string) => {
    try {
      const { error } = await supabase
        .from("ofx_transactions")
        .update({ classification })
        .eq("id", transactionId);

      if (error) throw error;

      toast({
        title: "Classificação salva",
        description: "A classificação foi atualizada com sucesso.",
      });

      setEditingTransactionId(null);
      fetchData();
    } catch (error) {
      console.error("Error saving classification:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a classificação.",
        variant: "destructive",
      });
    }
  };

  const filteredTransactions = ofxTransactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup =
      filterGroup === "all"
        ? true
        : filterGroup === "classified"
        ? t.classification !== null && t.classification !== ""
        : t.classification === null || t.classification === "";
    return matchesSearch && matchesGroup;
  });

  const classifiedCount = ofxTransactions.filter((t) => t.classification).length;
  const unclassifiedCount = ofxTransactions.filter((t) => !t.classification).length;
  const totalAmount = ofxTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  const exportToCSV = () => {
    const headers = ["Data", "Descrição", "Valor", "Tipo", "Banco", "Classificação"];
    const rows = filteredTransactions.map((t) => [
      format(new Date(t.transaction_date), "dd/MM/yyyy", { locale: ptBR }),
      t.description,
      t.amount.toFixed(2),
      t.type,
      t.bank_name || "",
      t.classification || "Não classificado",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({
      title: "Exportação concluída",
      description: "Os dados foram exportados com sucesso.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Classificar</h1>
          <p className="text-muted-foreground">Gerencie e classifique suas transações e notas fiscais</p>
        </div>
      </div>

      <Tabs defaultValue="ofx" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="ofx">Transações OFX</TabsTrigger>
          <TabsTrigger value="xml">Notas Fiscais</TabsTrigger>
        </TabsList>

        <TabsContent value="ofx" className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Classificado"
              value={classifiedCount.toString()}
              icon={FileText}
              variant="success"
            />
            <MetricCard
              title="Não Classificados"
              value={unclassifiedCount.toString()}
              icon={Filter}
              variant="default"
            />
            <MetricCard
              title="Total de Movimentações"
              value={ofxTransactions.length.toString()}
              icon={DollarSign}
              variant="default"
            />
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar por descrição</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite para buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grupos</label>
                  <Select value={filterGroup} onValueChange={setFilterGroup}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="classified">Classificados</SelectItem>
                      <SelectItem value="unclassified">Não classificados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Movimentações ({filteredTransactions.length})</CardTitle>
              <CardDescription>
                Clique em uma classificação para editá-la
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Classificação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.transaction_date), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell
                          className={
                            transaction.type === "CREDIT"
                              ? "text-success font-semibold"
                              : "text-destructive font-semibold"
                          }
                        >
                          {transaction.type === "CREDIT" ? "+" : "-"} R${" "}
                          {Math.abs(Number(transaction.amount)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === "CREDIT" ? "default" : "destructive"}>
                            {transaction.type === "CREDIT" ? "Crédito" : "Débito"}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.bank_name || "-"}</TableCell>
                        <TableCell>
                          {editingTransactionId === transaction.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editingClassification}
                                onChange={(e) => setEditingClassification(e.target.value)}
                                placeholder="Digite a classificação"
                                className="w-48"
                              />
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleSaveClassification(transaction.id, editingClassification)
                                }
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTransactionId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingTransactionId(transaction.id);
                                setEditingClassification(transaction.classification || "");
                              }}
                              className="text-left hover:underline"
                            >
                              {transaction.classification ? (
                                <Badge>{transaction.classification}</Badge>
                              ) : (
                                <span className="text-muted-foreground">Não classificado</span>
                              )}
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xml" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notas Fiscais ({xmlFiles.length})</CardTitle>
              <CardDescription>Listagem de notas fiscais importadas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : xmlFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma nota fiscal encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número NF-e</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Arquivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {xmlFiles.map((xml) => (
                      <TableRow key={xml.id}>
                        <TableCell>{xml.nf_number || "-"}</TableCell>
                        <TableCell>
                          {xml.nf_date
                            ? format(new Date(xml.nf_date), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {xml.total_value ? `R$ ${Number(xml.total_value).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={xml.status === "autorizada" ? "default" : "secondary"}>
                            {xml.status || "Desconhecido"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{xml.filename}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Classificar;
