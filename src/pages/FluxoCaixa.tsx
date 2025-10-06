import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileDown, Plus, CheckCircle2 } from "lucide-react";

export default function FluxoCaixa() {
  const [startDay, setStartDay] = useState("1");
  const [endDay, setEndDay] = useState("31");
  const [selectedMonth, setSelectedMonth] = useState("");

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">
            Acompanhe o fluxo de entrada e saída de recursos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
          <Button variant="outline">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Verificar Lançamentos
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Dia início</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={startDay}
                onChange={(e) => setStartDay(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Dia fim</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={endDay}
                onChange={(e) => setEndDay(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Meses</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jan">Janeiro</SelectItem>
                  <SelectItem value="fev">Fevereiro</SelectItem>
                  <SelectItem value="mar">Março</SelectItem>
                  <SelectItem value="abr">Abril</SelectItem>
                  <SelectItem value="mai">Maio</SelectItem>
                  <SelectItem value="jun">Junho</SelectItem>
                  <SelectItem value="jul">Julho</SelectItem>
                  <SelectItem value="ago">Agosto</SelectItem>
                  <SelectItem value="set">Setembro</SelectItem>
                  <SelectItem value="out">Outubro</SelectItem>
                  <SelectItem value="nov">Novembro</SelectItem>
                  <SelectItem value="dez">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Selecione um mês</p>
            <p className="text-sm text-muted-foreground">
              Para visualizar o fluxo de caixa, selecione pelo menos um mês nos filtros acima.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
