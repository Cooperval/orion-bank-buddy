import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function DemonstracoesFinanceiras() {
  const [year, setYear] = useState("2025");

  const emptyRow = months.map(() => "R$ 0,00");

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Demonstração Financeira</h1>
          <p className="text-muted-foreground">
            DRE - Demonstração do Resultado do Exercício
          </p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-6 overflow-x-auto">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64">Descrição</TableHead>
                {months.map((month) => (
                  <TableHead key={month} className="text-right">
                    {month}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-success/5">
                <TableCell className="font-medium">Receita Operacional Líquida</TableCell>
                {emptyRow.map((val, i) => (
                  <TableCell key={i} className="text-right text-success">
                    {val}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold text-success">R$ 0,00</TableCell>
              </TableRow>

              <TableRow className="bg-danger/5">
                <TableCell className="font-medium">(-) Custos dos Produtos/Serviços</TableCell>
                {emptyRow.map((val, i) => (
                  <TableCell key={i} className="text-right text-danger">
                    {val}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold text-danger">R$ 0,00</TableCell>
              </TableRow>

              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">(=) Lucro Bruto</TableCell>
                {emptyRow.map((val, i) => (
                  <TableCell key={i} className="text-right font-medium">
                    {val}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold">R$ 0,00</TableCell>
              </TableRow>

              <TableRow className="bg-danger/5">
                <TableCell className="font-medium">(-) Despesas Operacionais</TableCell>
                {emptyRow.map((val, i) => (
                  <TableCell key={i} className="text-right text-danger">
                    {val}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold text-danger">R$ 0,00</TableCell>
              </TableRow>

              <TableRow className="bg-success/10">
                <TableCell className="font-bold">(=) Lucro Líquido</TableCell>
                {emptyRow.map((val, i) => (
                  <TableCell key={i} className="text-right font-bold text-success">
                    {val}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold text-success">R$ 0,00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">R$ 0,00</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custos Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">R$ 0,00</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">R$ 0,00</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">R$ 0,00</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Esta demonstração é baseada nas movimentações financeiras importadas via arquivos OFX
              e suas respectivas classificações. Os dados são atualizados em tempo real conforme
              novos arquivos são importados ou excluídos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
