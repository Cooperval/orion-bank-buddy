import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, FileText } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

export default function ConsultarXML() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold mb-2">Consultar XML</h1>
      <p className="text-muted-foreground mb-6">
        Consulte e visualize notas fiscais eletrônicas
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Total Entradas"
          value="R$ 0,00"
          icon={ArrowDown}
          variant="info"
          trend="down"
        />
        <MetricCard
          title="Total Saídas"
          value="R$ 0,00"
          icon={ArrowDown}
          variant="default"
        />
        <MetricCard
          title="Total de Notas"
          value="0"
          variant="default"
        />
        <MetricCard
          title="Taxa de Classificação"
          value="0.0%"
          variant="info"
        />
        <MetricCard
          title="Saldo"
          value="R$ 0,00"
          variant="success"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" placeholder="Data inicial" />
              <Input type="date" placeholder="Data final" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma NF-e encontrada</p>
            <p className="text-sm text-muted-foreground">
              Não há Notas Fiscais que correspondam aos filtros selecionados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
