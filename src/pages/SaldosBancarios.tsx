import { Wallet, TrendingUp, TrendingDown, CreditCard, Upload } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SaldosBancarios() {
  // Estado mock - será substituído por dados reais do backend
  const hasAccounts = false;

  if (!hasAccounts) {
    return (
      <div className="flex-1 p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Saldos Bancários</h1>
          <p className="text-muted-foreground">
            Gerencie e visualize os saldos de suas contas bancárias
          </p>
        </div>

        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-20 h-20 rounded-full bg-info/10 flex items-center justify-center mb-6">
              <Wallet className="h-10 w-10 text-info" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-center">
              Nenhuma conta bancária encontrada
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Importe um arquivo OFX para começar a visualizar seus saldos bancários.
            </p>
            <Button className="bg-info hover:bg-info/90">
              <Upload className="mr-2 h-4 w-4" />
              Importar Extrato OFX
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Saldos Bancários</h1>
        <p className="text-muted-foreground">
          Gerencie e visualize os saldos de suas contas bancárias
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Saldo Total"
          value="R$ 25.430,00"
          icon={Wallet}
          variant="success"
        />
        <MetricCard
          title="Total Entradas"
          value="R$ 12.500,00"
          icon={TrendingUp}
          variant="success"
          trend="up"
        />
        <MetricCard
          title="Total Saídas"
          value="R$ 8.200,00"
          icon={TrendingDown}
          variant="danger"
          trend="down"
        />
        <MetricCard
          title="Contas Ativas"
          value="3"
          icon={CreditCard}
          variant="info"
        />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contas Bancárias</h3>
          <p className="text-muted-foreground">
            Lista de contas bancárias será exibida aqui
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
