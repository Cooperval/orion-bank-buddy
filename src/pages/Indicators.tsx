import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, Percent, AlertTriangle } from 'lucide-react';

interface MonthlyMetrics {
  month: string;
  revenue: number;
  costs: number;
  expenses: number;
  netProfit: number;
  transactionCount: number;
  averageTicket: number;
  netMargin: number;
}

const Indicators = () => {
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
      .channel('indicators-realtime')
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
      creditTransactions: number;
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
        monthlyMap.set(monthKey, { 
          revenue: 0, 
          costs: 0, 
          expenses: 0, 
          transactionCount: 0,
          creditTransactions: 0
        });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.transactionCount++;

      // Classify based on commitment group and transaction type
      if (transaction.transaction_type === 'credit') {
        monthData.creditTransactions++;
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

    // Convert to array and calculate derived metrics
    return Array.from(monthlyMap.entries())
      .map(([month, data]) => {
        const netProfit = data.revenue - data.costs - data.expenses;
        const netMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;
        const averageTicket = data.creditTransactions > 0 ? data.revenue / data.creditTransactions : 0;
        
        return {
          month,
          revenue: data.revenue,
          costs: data.costs,
          expenses: data.expenses,
          netProfit,
          transactionCount: data.transactionCount,
          averageTicket,
          netMargin
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  };

  const calculateIndicators = () => {
    if (monthlyData.length === 0) return null;

    const latest = monthlyData[monthlyData.length - 1];
    const previous = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : latest;

    // Liquidez Corrente (Revenue to Total Outflow ratio)
    const totalOutflow = latest.costs + latest.expenses;
    const currentRatio = totalOutflow > 0 ? latest.revenue / totalOutflow : 0;
    
    // Margem Líquida
    const netMargin = latest.netMargin;
    const previousNetMargin = previous.netMargin;
    
    // ROI (Return on Investment) - Net Profit to Costs ratio
    const roi = latest.costs > 0 ? (latest.netProfit / latest.costs) * 100 : 0;
    
    // Índice de Endividamento (Costs to Revenue ratio)
    const debtRatio = latest.revenue > 0 ? latest.costs / latest.revenue : 0;
    
    // Crescimento da Receita
    const revenueGrowth = previous.revenue > 0 ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    
    // Eficiência Operacional (Revenue per transaction)
    const operationalEfficiency = latest.transactionCount > 0 ? latest.revenue / latest.transactionCount : 0;

    return {
      currentRatio,
      netMargin,
      previousNetMargin,
      roi,
      debtRatio,
      revenueGrowth,
      operationalEfficiency,
      latest
    };
  };

  const getIndicatorStatus = (value: number, type: string) => {
    switch (type) {
      case 'liquidity':
        if (value >= 1.5) return { status: 'good', color: 'text-success', bg: 'bg-success' };
        if (value >= 1.0) return { status: 'warning', color: 'text-warning', bg: 'bg-warning' };
        return { status: 'danger', color: 'text-destructive', bg: 'bg-destructive' };
      
      case 'margin':
        if (value >= 15) return { status: 'good', color: 'text-success', bg: 'bg-success' };
        if (value >= 5) return { status: 'warning', color: 'text-warning', bg: 'bg-warning' };
        return { status: 'danger', color: 'text-destructive', bg: 'bg-destructive' };
      
      case 'debt':
        if (value <= 0.3) return { status: 'good', color: 'text-success', bg: 'bg-success' };
        if (value <= 0.5) return { status: 'warning', color: 'text-warning', bg: 'bg-warning' };
        return { status: 'danger', color: 'text-destructive', bg: 'bg-destructive' };
      
      default:
        return { status: 'neutral', color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  const formatChartData = () => {
    return monthlyData.map(metric => ({
      month: new Date(metric.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      receita: metric.revenue,
      lucro: metric.netProfit,
      margem: metric.netMargin,
      ticket: metric.averageTicket
    }));
  };

  const indicators = calculateIndicators();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!indicators) {
    return (
      <div className="space-y-6">
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground text-center">
              Importe movimentações bancárias e classifique-as para visualizar os indicadores
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = formatChartData();

  return (
    <div className="space-y-6">
      

      {/* Key Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Liquidez Corrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{indicators.currentRatio.toFixed(2)}</div>
              <Badge 
                variant="secondary" 
                className={getIndicatorStatus(indicators.currentRatio, 'liquidity').bg + ' text-white'}
              >
                {getIndicatorStatus(indicators.currentRatio, 'liquidity').status === 'good' ? 'Excelente' : 
                 getIndicatorStatus(indicators.currentRatio, 'liquidity').status === 'warning' ? 'Atenção' : 'Crítico'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Receita / (Custos + Despesas)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Margem Líquida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{indicators.netMargin.toFixed(1)}%</span>
                {indicators.netMargin > indicators.previousNetMargin ? 
                  <TrendingUp className="w-4 h-4 text-success" /> : 
                  <TrendingDown className="w-4 h-4 text-destructive" />
                }
              </div>
              <Badge 
                variant="secondary" 
                className={getIndicatorStatus(indicators.netMargin, 'margin').bg + ' text-white'}
              >
                {getIndicatorStatus(indicators.netMargin, 'margin').status === 'good' ? 'Excelente' : 
                 getIndicatorStatus(indicators.netMargin, 'margin').status === 'warning' ? 'Atenção' : 'Crítico'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Percentual de lucro sobre vendas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{indicators.roi.toFixed(1)}%</div>
              <Badge 
                variant="secondary" 
                className={indicators.roi > 0 ? "bg-success text-white" : "bg-warning text-white"}
              >
                {indicators.roi > 0 ? 'Positivo' : 'Negativo'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Retorno sobre custos investidos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Índice de Custos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{(indicators.debtRatio * 100).toFixed(1)}%</div>
              <Badge 
                variant="secondary" 
                className={getIndicatorStatus(indicators.debtRatio, 'debt').bg + ' text-white'}
              >
                {getIndicatorStatus(indicators.debtRatio, 'debt').status === 'good' ? 'Baixo' : 
                 getIndicatorStatus(indicators.debtRatio, 'debt').status === 'warning' ? 'Moderado' : 'Alto'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Custos em relação à receita
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução da Margem Líquida</CardTitle>
            <CardDescription>Percentual de lucro sobre receita ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Margem']}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="margem" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita vs Lucro</CardTitle>
            <CardDescription>Comparação mensal entre receita e lucro líquido</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
                    name === 'receita' ? 'Receita' : 'Lucro'
                  ]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Bar dataKey="receita" fill="hsl(var(--primary))" />
                <Bar dataKey="lucro" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Growth Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Crescimento e Eficiência</CardTitle>
          <CardDescription>Indicadores de evolução e eficiência operacional do negócio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl font-bold">{indicators.revenueGrowth.toFixed(1)}%</span>
                {indicators.revenueGrowth > 0 ? 
                  <TrendingUp className="w-5 h-5 text-success" /> : 
                  <TrendingDown className="w-5 h-5 text-destructive" />
                }
              </div>
              <p className="text-sm text-muted-foreground">Crescimento da Receita</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                R$ {indicators.latest.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                R$ {indicators.latest.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground">Lucro Líquido Atual</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                {indicators.latest.transactionCount}
              </div>
              <p className="text-sm text-muted-foreground">Transações Classificadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Source Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Sobre os Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Fonte dos Indicadores</h4>
              <p className="text-muted-foreground">
                Todos os indicadores são calculados automaticamente com base nas movimentações bancárias 
                importadas e classificadas na hierarquia de naturezas.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Como Melhorar a Precisão</h4>
              <p className="text-muted-foreground">
                Para análises mais precisas, classifique todas as movimentações bancárias 
                nas categorias apropriadas (Receitas, Despesas, Custos, Investimentos).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Indicators;