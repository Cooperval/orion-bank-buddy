import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BudgetCategory {
  id: string;
  name: string;
  type: string;
  budgeted_amount: number;
  actual_amount: number;
  month_year: string;
}

const Budget = () => {
  const { user, companyId } = useAuth();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense',
    budgeted_amount: '',
    actual_amount: ''
  });

  useEffect(() => {
    fetchBudgetCategories();
  }, [selectedMonth]);

  const fetchBudgetCategories = async () => {
    if (!companyId) return;
    
    try {
      const monthDate = `${selectedMonth}-01`;
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('company_id', companyId)
        .eq('month_year', monthDate)
        .order('type', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching budget categories:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o orçamento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      toast({
        title: "Erro de autenticação",
        description: "Não foi possível identificar a empresa do usuário",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const monthDate = `${selectedMonth}-01`;
      const { error } = await supabase
        .from('budget_categories')
        .insert({
          name: newCategory.name,
          type: newCategory.type,
          budgeted_amount: parseFloat(newCategory.budgeted_amount),
          actual_amount: parseFloat(newCategory.actual_amount || '0'),
          month_year: monthDate,
          company_id: companyId
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Categoria adicionada com sucesso!"
      });

      setNewCategory({ name: '', type: 'expense', budgeted_amount: '', actual_amount: '' });
      setShowAddForm(false);
      fetchBudgetCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a categoria.",
        variant: "destructive"
      });
    }
  };

  const getVarianceColor = (budgeted: number, actual: number) => {
    const variance = ((actual - budgeted) / budgeted) * 100;
    if (Math.abs(variance) <= 10) return 'text-success';
    if (variance > 0) return 'text-destructive';
    return 'text-warning';
  };

  const getVarianceIcon = (budgeted: number, actual: number) => {
    const variance = Math.abs(((actual - budgeted) / budgeted) * 100);
    return variance <= 10 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />;
  };

  const calculateTotals = (type: string) => {
    // Since budget_categories is only for expenses now, we calculate based on that
    const filtered = categories.filter(cat => cat.type === type);
    const budgeted = filtered.reduce((sum, cat) => sum + cat.budgeted_amount, 0);
    const actual = filtered.reduce((sum, cat) => sum + cat.actual_amount, 0);
    return { budgeted, actual };
  };

  const totalBudget = calculateTotals('people');
  const totalActual = categories.reduce((sum, cat) => sum + cat.actual_amount, 0);
  const totalBudgeted = categories.reduce((sum, cat) => sum + cat.budgeted_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button onClick={() => setShowAddForm(true)} className="gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Orçado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">R$ {totalBudgeted.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Valor planejado para o mês</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">R$ {totalActual.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Valor efetivamente gasto</p>
              <Progress 
                value={totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Categoria</CardTitle>
            <CardDescription>Adicione uma nova categoria ao orçamento</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Categoria</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={newCategory.type} onValueChange={(value) => setNewCategory({...newCategory, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="people">Pessoas</SelectItem>
                      <SelectItem value="materials">Materiais</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="supplies">Suprimentos</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="budgeted_amount">Valor Orçado (R$)</Label>
                  <Input
                    id="budgeted_amount"
                    type="number"
                    step="0.01"
                    value={newCategory.budgeted_amount}
                    onChange={(e) => setNewCategory({...newCategory, budgeted_amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="actual_amount">Valor Real (R$)</Label>
                  <Input
                    id="actual_amount"
                    type="number"
                    step="0.01"
                    value={newCategory.actual_amount}
                    onChange={(e) => setNewCategory({...newCategory, actual_amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="people">Pessoas</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          <TabsTrigger value="other">Outros</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{category.name}</h3>
                      <Badge variant={
                        category.type === 'people' ? 'default' : 
                        category.type === 'materials' ? 'secondary' :
                        category.type === 'maintenance' ? 'outline' : 'destructive'
                      }>
                        {category.type === 'people' ? 'Pessoas' : 
                         category.type === 'materials' ? 'Materiais' :
                         category.type === 'maintenance' ? 'Manutenção' :
                         category.type === 'supplies' ? 'Suprimentos' : 'Outros'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Orçado:</span>
                        <p className="font-medium">R$ {category.budgeted_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Realizado:</span>
                        <p className="font-medium">R$ {category.actual_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Variação:</span>
                        <p className={`font-medium ${getVarianceColor(category.budgeted_amount, category.actual_amount)}`}>
                          {category.budgeted_amount > 0 
                            ? `${(((category.actual_amount - category.budgeted_amount) / category.budgeted_amount) * 100).toFixed(1)}%`
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {getVarianceIcon(category.budgeted_amount, category.actual_amount)}
                  </div>
                </div>
                <div className="mt-4">
                  <Progress 
                    value={category.budgeted_amount > 0 ? (category.actual_amount / category.budgeted_amount) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="people" className="space-y-4">
          {categories.filter(cat => cat.type === 'people').map((category) => (
            <Card key={category.id}>
              {/* Same card content structure */}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          {categories.filter(cat => cat.type === 'materials').map((category) => (
            <Card key={category.id}>
              {/* Same card content structure */}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          {categories.filter(cat => cat.type === 'maintenance').map((category) => (
            <Card key={category.id}>
              {/* Same card content structure */}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          {categories.filter(cat => cat.type === 'other').map((category) => (
            <Card key={category.id}>
              {/* Same card content structure */}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {categories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma categoria cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando categorias para organizar seu orçamento
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              Criar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Budget;