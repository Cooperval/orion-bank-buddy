import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

const mockData: ChartDataPoint[] = [
  { month: 'Jan', revenue: 45000, costs: 28000, profit: 17000 },
  { month: 'Fev', revenue: 52000, costs: 31000, profit: 21000 },
  { month: 'Mar', revenue: 48000, costs: 29000, profit: 19000 },
  { month: 'Abr', revenue: 61000, costs: 35000, profit: 26000 },
  { month: 'Mai', revenue: 55000, costs: 33000, profit: 22000 },
  { month: 'Jun', revenue: 67000, costs: 38000, profit: 29000 },
];

interface FinancialChartProps {
  title?: string;
  data?: ChartDataPoint[];
}

const FinancialChart: React.FC<FinancialChartProps> = ({ 
  title = "Evolução Financeira",
  data = mockData 
}) => {
  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-card)'
                }}
                formatter={(value: number, name: string) => [
                  `R$ ${value.toLocaleString('pt-BR')}`,
                  name === 'revenue' ? 'Receita' : name === 'costs' ? 'Custos' : 'Lucro'
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--success))"
                fillOpacity={1}
                fill="url(#profitGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialChart;