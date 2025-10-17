import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Target, TrendingUp, TrendingDown, Calculator, Save, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Scenario {
  id: string;
  name: string;
  revenue_change: number;
  cost_change: number;
  expense_change: number;
  projected_revenue: number;
  projected_profit: number;
  projected_margin: number;
}

const Scenarios = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [baseValues, setBaseValues] = useState({
    revenue: 0,
    costs: 0,
    expenses: 0,
    profit: 0
  });

  const [currentScenario, setCurrentScenario] = useState({
    name: '',
    revenue_change: 0,
    cost_change: 0,
    expense_change: 0
  });

  // Fetch base values from latest financial metrics
  useEffect(() => {
    fetchBaseValues();
  }, []);

  const fetchBaseValues = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_metrics')
        .select('*')
        .order('month_year', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      
      if (data) {
        const netProfit = data.revenue - data.costs - data.expenses;
        setBaseValues({
          revenue: data.revenue,
          costs: data.costs,
          expenses: data.expenses,
          profit: netProfit
        });
      }
    } catch (error) {
      console.error('Error fetching base values:', error);
      // Set default values if no data found
      setBaseValues({
        revenue: 125000,
        costs: 62000,
        expenses: 31000,
        profit: 32000
      });
    }
  };

  const calculateProjections = (scenario: typeof currentScenario) => {
    const projectedRevenue = baseValues.revenue * (1 + scenario.revenue_change / 100);
    const projectedCosts = baseValues.costs * (1 + scenario.cost_change / 100);
    const projectedExpenses = baseValues.expenses * (1 + scenario.expense_change / 100);
    const projectedProfit = projectedRevenue - projectedCosts - projectedExpenses;
    const projectedMargin = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;

    return {
      revenue: projectedRevenue,
      costs: projectedCosts,
      expenses: projectedExpenses,
      profit: projectedProfit,
      margin: projectedMargin
    };
  };

  const handleSaveScenario = () => {
    if (!currentScenario.name) {
      toast({
        title: "Erro",
        description: "Digite um nome para o cenário.",
        variant: "destructive"
      });
      return;
    }

    const projections = calculateProjections(currentScenario);
    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: currentScenario.name,
      revenue_change: currentScenario.revenue_change,
      cost_change: currentScenario.cost_change,
      expense_change: currentScenario.expense_change,
      projected_revenue: projections.revenue,
      projected_profit: projections.profit,
      projected_margin: projections.margin
    };

    setScenarios([...scenarios, newScenario]);
    setCurrentScenario({ name: '', revenue_change: 0, cost_change: 0, expense_change: 0 });
    
    toast({
      title: "Sucesso",
      description: "Cenário salvo com sucesso!"
    });
  };

  const handleResetScenario = () => {
    setCurrentScenario({ name: '', revenue_change: 0, cost_change: 0, expense_change: 0 });
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-destructive';
    if (value < 0) return 'text-success';
    return 'text-muted-foreground';
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 20) return 'text-success';
    if (margin >= 10) return 'text-warning';
    return 'text-destructive';
  };

  const projections = calculateProjections(currentScenario);

  const chartData = scenarios.map(scenario => ({
    name: scenario.name.replace('Cenário ', ''),
    receita: scenario.projected_revenue,
    lucro: scenario.projected_profit,
    margem: scenario.projected_margin
  }));

  return (
    <div className="space-y-6">
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Simulador de Cenário
            </CardTitle>
            <CardDescription>Ajuste as variáveis para ver o impacto nos resultados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="scenario_name">Nome do Cenário</Label>
              <Input
                id="scenario_name"
                value={currentScenario.name}
                onChange={(e) => setCurrentScenario({...currentScenario, name: e.target.value})}
                placeholder="Ex: Expansão de Vendas"
              />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Mudança na Receita</Label>
                  <span className={`font-medium ${getChangeColor(currentScenario.revenue_change)}`}>
                    {currentScenario.revenue_change > 0 ? '+' : ''}{currentScenario.revenue_change}%
                  </span>
                </div>
                <Slider
                  value={[currentScenario.revenue_change]}
                  onValueChange={(value) => setCurrentScenario({...currentScenario, revenue_change: value[0]})}
                  min={-50}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>-50%</span>
                  <span>+100%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Mudança nos Custos</Label>
                  <span className={`font-medium ${getChangeColor(currentScenario.cost_change)}`}>
                    {currentScenario.cost_change > 0 ? '+' : ''}{currentScenario.cost_change}%
                  </span>
                </div>
                <Slider
                  value={[currentScenario.cost_change]}
                  onValueChange={(value) => setCurrentScenario({...currentScenario, cost_change: value[0]})}
                  min={-30}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>-30%</span>
                  <span>+50%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Mudança nas Despesas</Label>
                  <span className={`font-medium ${getChangeColor(currentScenario.expense_change)}`}>
                    {currentScenario.expense_change > 0 ? '+' : ''}{currentScenario.expense_change}%
                  </span>
                </div>
                <Slider
                  value={[currentScenario.expense_change]}
                  onValueChange={(value) => setCurrentScenario({...currentScenario, expense_change: value[0]})}
                  min={-30}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>-30%</span>
                  <span>+50%</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveScenario} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Salvar Cenário
              </Button>
              <Button variant="outline" onClick={handleResetScenario}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Projections */}
        <Card>
          <CardHeader>
            <CardTitle>Projeções do Cenário Atual</CardTitle>
            <CardDescription>Resultados baseados nas variações definidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Receita Atual</span>
                  <p className="text-xl font-semibold">R$ {baseValues.revenue.toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Receita Projetada</span>
                  <p className="text-xl font-semibold text-primary">
                    R$ {projections.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Lucro Atual</span>
                  <p className="text-xl font-semibold">R$ {baseValues.profit.toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Lucro Projetado</span>
                  <p className={`text-xl font-semibold ${projections.profit >= baseValues.profit ? 'text-success' : 'text-destructive'}`}>
                    R$ {projections.profit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Margem de Lucro Projetada</span>
                  <span className={`text-2xl font-bold ${getMarginColor(projections.margin)}`}>
                    {projections.margin.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Impacto vs. Cenário Atual:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Receita:</span>
                    <span className={projections.revenue >= baseValues.revenue ? 'text-success' : 'text-destructive'}>
                      {projections.revenue >= baseValues.revenue ? '+' : ''}
                      {((projections.revenue - baseValues.revenue) / baseValues.revenue * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lucro:</span>
                    <span className={projections.profit >= baseValues.profit ? 'text-success' : 'text-destructive'}>
                      {projections.profit >= baseValues.profit ? '+' : ''}
                      {((projections.profit - baseValues.profit) / baseValues.profit * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Cenários Salvos
          </CardTitle>
          <CardDescription>Compare diferentes cenários lado a lado</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table">Tabela</TabsTrigger>
              <TabsTrigger value="chart">Gráfico</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <div className="grid gap-4">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold">{scenario.name}</h3>
                      <Badge className={getMarginColor(scenario.projected_margin) + ' bg-opacity-20'}>
                        {scenario.projected_margin.toFixed(1)}% margem
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Receita:</span>
                        <p className="font-medium">R$ {scenario.projected_revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                        <p className={`text-xs ${getChangeColor(scenario.revenue_change)}`}>
                          {scenario.revenue_change > 0 ? '+' : ''}{scenario.revenue_change}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lucro:</span>
                        <p className="font-medium">R$ {scenario.projected_profit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Custos:</span>
                        <p className={`text-xs ${getChangeColor(scenario.cost_change)}`}>
                          {scenario.cost_change > 0 ? '+' : ''}{scenario.cost_change}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Despesas:</span>
                        <p className={`text-xs ${getChangeColor(scenario.expense_change)}`}>
                          {scenario.expense_change > 0 ? '+' : ''}{scenario.expense_change}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="chart">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'margem' 
                          ? `${Number(value).toFixed(1)}%`
                          : `R$ ${Number(value).toLocaleString('pt-BR')}`, 
                        name === 'receita' ? 'Receita' : name === 'lucro' ? 'Lucro' : 'Margem'
                      ]}
                    />
                    <Bar dataKey="receita" fill="hsl(var(--primary))" />
                    <Bar dataKey="lucro" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Scenarios;