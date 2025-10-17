import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MetricCard from '@/components/dashboard/MetricCard';
import FinancialChart from '@/components/dashboard/FinancialChart';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, AlertCircle } from 'lucide-react';

interface TransactionData {
  id: string;
  transaction_date: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  classification?: {
    commitment_groups?: { name: string; color: string };
    commitments?: { name: string };
    commitment_types?: { name: string };
  };
}

interface MonthlyMetrics {
  month: string;
  revenue: number;
  costs: number;
  expenses: number;
  netProfit: number;
  transactionCount: number;
}

const Dashboard = () => {
  const { user, companyId } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchTransactionData();
    }
  }, [companyId]);

  // Real-time updates for transactions and classifications
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          fetchTransactionData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_classifications'
        },
        () => {
          fetchTransactionData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ofx_uploads'
        },
        () => {
          fetchTransactionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTransactionData = async () => {
    try {
      if (!companyId) return;

      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          amount,
          transaction_type,
          transaction_classifications(
            commitment_groups(name, color),
            commitments(name),
            commitment_types(name)
          )
        `)
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // Process transactions into monthly metrics
      const monthlyMetrics = processTransactionsIntoMonthlyData(transactionsData || []);
      setMonthlyData(monthlyMetrics);
      
    } catch (error) {
      console.error('Error fetching transaction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTransactionsIntoMonthlyData = (transactions: any[]): MonthlyMetrics[] => {
    const monthlyMap = new Map<string, {
      revenue: number;
      costs: number;
      expenses: number;
      transactionCount: number;
    }>();

    transactions.forEach(transaction => {
      const classification = Array.isArray(transaction.transaction_classifications) && transaction.transaction_classifications.length > 0
        ? transaction.transaction_classifications[0] 
        : transaction.transaction_classifications;
        
      if (!classification?.commitment_groups) return; // Only count classified transactions

      const monthKey = new Date(transaction.transaction_date).toISOString().substring(0, 7); // YYYY-MM
      const amount = transaction.amount;
      const groupName = classification.commitment_groups.name.toLowerCase();

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { revenue: 0, costs: 0, expenses: 0, transactionCount: 0 });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.transactionCount++;

      // Classify based on commitment group
      if (transaction.transaction_type === 'credit') {
        if (groupName.includes('receita')) {
          monthData.revenue += amount;
        }
      } else if (transaction.transaction_type === 'debit') {
        if (groupName.includes('despesa')) {
          monthData.expenses += amount;
        } else if (groupName.includes('custo') || groupName.includes('insumo')) {
          monthData.costs += amount;
        }
      }
    });

    // Convert to array and calculate net profit
    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        netProfit: data.revenue - data.costs - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  };

  const getCurrentMonthData = () => {
    if (monthlyData.length === 0) return null;
    
    const latest = monthlyData[monthlyData.length - 1];
    const previous = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : latest;
    
    const netMargin = latest.revenue > 0 ? (latest.netProfit / latest.revenue) * 100 : 0;
    const previousNetMargin = previous.revenue > 0 ? (previous.netProfit / previous.revenue) * 100 : 0;
    
    const revenueGrowth = previous.revenue > 0 ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    const profitGrowth = previous.netProfit > 0 ? ((latest.netProfit - previous.netProfit) / previous.netProfit) * 100 : 0;
    
    // Calculate average ticket (assuming each transaction is a sale)
    const averageTicket = latest.transactionCount > 0 ? latest.revenue / latest.transactionCount : 0;
    
    return {
      revenue: latest.revenue,
      netProfit: latest.netProfit,
      netMargin,
      averageTicket,
      revenueGrowth,
      profitGrowth,
      marginChange: netMargin - previousNetMargin,
      transactionCount: latest.transactionCount
    };
  };

  const currentData = getCurrentMonthData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="space-y-6">
       
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground text-center">
              Importe movimentações bancárias e classifique-as para visualizar o dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = monthlyData.map(metric => ({
    month: new Date(metric.month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
    revenue: metric.revenue,
    costs: metric.costs,
    profit: metric.netProfit
  }));

  const alerts = [
    {
      id: 1,
      type: 'info',
      title: 'Dados em tempo real',
      description: `Baseado em ${currentData.transactionCount} transações classificadas`,
      action: 'Dados das movimentações bancárias'
    },
    {
      id: 2,
      type: currentData.profitGrowth > 0 ? 'success' : 'warning',
      title: 'Performance do lucro',
      description: `Lucro ${currentData.profitGrowth > 0 ? 'cresceu' : 'reduziu'} ${Math.abs(currentData.profitGrowth).toFixed(1)}% vs mês anterior`,
      action: currentData.profitGrowth > 0 ? 'Manter estratégia' : 'Revisar custos'
    },
    {
      id: 3,
      type: currentData.netMargin > 20 ? 'success' : currentData.netMargin > 10 ? 'warning' : 'error',
      title: 'Margem líquida',
      description: `Margem atual de ${currentData.netMargin.toFixed(1)}%`,
      action: currentData.netMargin > 20 ? 'Excelente resultado' : 'Otimizar processos'
    }
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'success': return <TrendingUp className="w-5 h-5 text-success" />;
      case 'error': return <TrendingDown className="w-5 h-5 text-destructive" />;
      default: return <Target className="w-5 h-5 text-info" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-warning/20 bg-warning/5';
      case 'success': return 'border-success/20 bg-success/5';
      case 'error': return 'border-destructive/20 bg-destructive/5';
      default: return 'border-info/20 bg-info/5';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Receita do Mês"
          value={`R$ ${currentData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change={`${currentData.revenueGrowth > 0 ? '+' : ''}${currentData.revenueGrowth.toFixed(1)}%`}
          changeType={currentData.revenueGrowth > 0 ? 'positive' : 'negative'}
          icon={DollarSign}
        />
        <MetricCard
          title="Lucro Líquido"
          value={`R$ ${currentData.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change={`${currentData.profitGrowth > 0 ? '+' : ''}${currentData.profitGrowth.toFixed(1)}%`}
          changeType={currentData.profitGrowth > 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
        />
        <MetricCard
          title="Margem Líquida"
          value={`${currentData.netMargin.toFixed(1)}%`}
          change={`${currentData.marginChange > 0 ? '+' : ''}${currentData.marginChange.toFixed(1)}%`}
          changeType={currentData.marginChange > 0 ? 'positive' : 'negative'}
          icon={Target}
        />
        <MetricCard
          title="Ticket Médio"
          value={`R$ ${currentData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          change={`${currentData.transactionCount} transações`}
          changeType="neutral"
          icon={Users}
        />
      </div>

      {/* Chart and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FinancialChart data={chartData} />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Alertas e Notificações</CardTitle>
            <CardDescription>Principais insights dos dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}>
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                    <p className="text-xs text-primary mt-2">{alert.action}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Additional info about data source */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">Fonte dos Dados</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dados calculados em tempo real das movimentações bancárias classificadas
                  </p>
                  <p className="text-xs text-primary mt-2">
                    Classifique mais movimentações para análises mais precisas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;