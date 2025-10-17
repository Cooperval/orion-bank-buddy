import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, Calendar, DollarSign, Plus, Edit, Trash2, UserX, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  monthly_cost: number;
  hire_date: string;
  status: string;
}

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  position: z.string().min(1, 'Cargo é obrigatório'),
  department: z.string().min(1, 'Departamento é obrigatório'),
  monthly_cost: z.string().min(1, 'Custo mensal é obrigatório'),
  hire_date: z.string().min(1, 'Data de contratação é obrigatória'),
  status: z.string().min(1, 'Status é obrigatório'),
});

const Team = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      position: '',
      department: '',
      monthly_cost: '',
      hire_date: '',
      status: 'active',
    },
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      position: '',
      department: '',
      monthly_cost: '',
      hire_date: '',
      status: 'active',
    },
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a equipe.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error } = await supabase
        .from('employees')
        .insert({
          name: values.name,
          position: values.position,
          department: values.department,
          monthly_cost: parseFloat(values.monthly_cost),
          hire_date: values.hire_date,
          status: values.status,
          company_id: '00000000-0000-0000-0000-000000000000', // Demo company ID
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Colaborador cadastrado com sucesso.",
      });

      form.reset();
      setDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error creating employee:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o colaborador.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    editForm.reset({
      name: employee.name,
      position: employee.position || '',
      department: employee.department || '',
      monthly_cost: employee.monthly_cost.toString(),
      hire_date: employee.hire_date || '',
      status: employee.status,
    });
    setEditDialogOpen(true);
  };

  const onEditSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: values.name,
          position: values.position,
          department: values.department,
          monthly_cost: parseFloat(values.monthly_cost),
          hire_date: values.hire_date,
          status: values.status,
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Colaborador atualizado com sucesso.",
      });

      editForm.reset();
      setEditDialogOpen(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o colaborador.",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: newStatus })
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Colaborador ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso.`,
      });

      fetchEmployees();
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do colaborador.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Tem certeza que deseja excluir ${employee.name}?`)) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Colaborador excluído com sucesso.",
      });

      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o colaborador.",
        variant: "destructive"
      });
    }
  };

  const calculateStats = () => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    const totalCost = activeEmployees.reduce((sum, emp) => sum + emp.monthly_cost, 0);
    const avgCost = activeEmployees.length > 0 ? totalCost / activeEmployees.length : 0;
    
    const departments = [...new Set(activeEmployees.map(emp => emp.department).filter(Boolean))];
    const departmentStats = departments.map(dept => ({
      name: dept,
      count: activeEmployees.filter(emp => emp.department === dept).length,
      cost: activeEmployees.filter(emp => emp.department === dept).reduce((sum, emp) => sum + emp.monthly_cost, 0)
    }));

    return {
      totalEmployees: activeEmployees.length,
      totalCost,
      avgCost,
      departments: departmentStats
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'inactive': return 'bg-destructive text-destructive-foreground';
      case 'vacation': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'vacation': return 'Férias';
      default: return status;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const stats = calculateStats();

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
        
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Colaborador</DialogTitle>
              <DialogDescription>
                Cadastre um novo colaborador na equipe
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Desenvolvedor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Tecnologia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="monthly_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custo Mensal (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="5000.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hire_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Contratação</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                          <SelectItem value="vacation">Férias</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Cadastrar Colaborador
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Colaborador</DialogTitle>
              <DialogDescription>
                Atualize as informações do colaborador
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Desenvolvedor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Tecnologia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="monthly_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custo Mensal (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="5000.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="hire_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Contratação</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                          <SelectItem value="vacation">Férias</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Atualizar Colaborador
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total de Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Colaboradores ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Custo Total Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Folha de pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Custo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.avgCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Por colaborador</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments.length}</div>
            <p className="text-xs text-muted-foreground">Áreas de atuação</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Summary */}
      {stats.departments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Departamento</CardTitle>
            <CardDescription>Distribuição da equipe e custos por área</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.departments.map((dept) => (
                <div key={dept.name} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{dept.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Colaboradores:</span>
                      <span className="font-medium">{dept.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custo Total:</span>
                      <span className="font-medium">R$ {dept.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custo Médio:</span>
                      <span className="font-medium">R$ {(dept.cost / dept.count).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees List */}
      <div className="grid gap-4">
        {employees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-elevated transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{employee.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {employee.position && <span>{employee.position}</span>}
                      {employee.position && employee.department && <span>•</span>}
                      {employee.department && <span>{employee.department}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold">R$ {employee.monthly_cost.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">por mês</div>
                  </div>
                  
                  {employee.hire_date && (
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Desde {new Date(employee.hire_date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )}
                  
                  <Badge className={getStatusColor(employee.status)}>
                    {getStatusLabel(employee.status)}
                  </Badge>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(employee)}
                    >
                      {employee.status === 'active' ? (
                        <UserX className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(employee)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {employees.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum colaborador encontrado</h3>
            <p className="text-muted-foreground text-center">
              Não há colaboradores cadastrados no sistema
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Team;