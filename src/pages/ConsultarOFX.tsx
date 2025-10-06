import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, FileSearch } from "lucide-react";
import { MetricCard } from "@/components/MetricCard"; // Named import

export default function ConsultarOFX() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold mb-2">Consultar OFX</h1>
      <p className="text-muted-foreground mb-6">
        Consulte e visualize transações de extratos bancários
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Créditos"
          value="R$ 0,00"
          icon={ArrowUp}
          variant="success"
          trend="up"
        />
        <MetricCard
          title="Total Débitos"
          value="R$ 0,00"
          icon={ArrowDown}
          variant="danger"
          trend="down"
        />
        <MetricCard
          title="Saldo Líquido"
          value="R$ 0,00"
          variant="success"
        />
        <MetricCard
          title="Total Transações"
          value="0"
          variant="default"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os bancos</SelectItem>
                <SelectItem value="itau">Itaú</SelectItem>
                <SelectItem value="bradesco">Bradesco</SelectItem>
                <SelectItem value="santander">Santander</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" placeholder="Data inicial" />
            <Input type="date" placeholder="Data final" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transações</CardTitle>
          <Button variant="outline" size="sm">
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma transação encontrada</p>
            <p className="text-sm text-muted-foreground">
              Importe arquivos OFX para visualizar suas transações
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
