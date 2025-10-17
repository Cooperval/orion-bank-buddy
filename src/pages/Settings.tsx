import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Building, User, Shield, Bell, Palette, Database, Trash2, Users2, HardDrive, Calendar, TrendingUp, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface Company {
  id: string;
  name: string;
  segment?: string;
  logo_url?: string;
}

interface Company {
  id: string;
  name: string;
  segment?: string;
  logo_url?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  company_id: string | null;
  created_at: string;
  user_roles?: Array<{ role: string }>;
}

interface CompanyDetails {
  company: Company & { created_at: string };
  users: Array<{
    id: string;
    user_id: string;
    full_name: string;
    role: string;
    created_at: string;
    user_roles?: Array<{ role: string }>;
  }>;
  stats: {
    totalTransactions: number;
    totalNFes: number;
    totalBanks: number;
    totalCommitments: number;
    totalFutureEntries: number;
    totalClassifications: number;
    storageSize: number;
  };
}

const Settings = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [profileState, setProfileState] = useState<Profile | null>(null);
  const [companyState, setCompanyState] = useState<Company | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    avatar_url: ''
  });
  const [companyForm, setCompanyForm] = useState({
    name: '',
    segment: '',
    logo_url: ''
  });
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: '',
    segment: ''
  });
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'operador' as 'operador' | 'gestor',
    companyId: ''
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCompanyDialog, setEditCompanyDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      if (profile?.role === 'admin') {
        // Admin: Fetch all companies and their members
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .order('name');

        if (companiesError) throw companiesError;
        setCompanies(companiesData || []);

        // Fetch all users (with or without companies) with their roles
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select(`
            id,
            user_id,
            full_name,
            company_id,
            created_at
          `)
          .order('created_at', { ascending: false });

        if (usersError) throw usersError;
        
        // Fetch roles separately for each user
        const usersWithRoles = await Promise.all(
          (usersData || []).map(async (user) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.user_id)
              .single();
            
            return {
              ...user,
              role: roleData?.role || 'operador'
            };
          })
        );
        
        setUsers(usersWithRoles);
      } else {
        // Regular user: Fetch own profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user?.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profileData) {
          setProfileState(profileData);
          setProfileForm({
            full_name: profileData.full_name || '',
            avatar_url: profileData.avatar_url || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do usuário.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId: string) => {
    setLoadingDetails(true);
    try {
      // Fetch company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      // Fetch users from this company
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.user_id)
            .single();
          
          return {
            ...user,
            role: roleData?.role || 'operador'
          };
        })
      );

      // Fetch statistics
      const [
        { count: transactionsCount },
        { count: nfesCount },
        { count: banksCount },
        { count: commitmentsCount },
        { count: futureEntriesCount }
      ] = await Promise.all([
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('nfe_documents').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('banks').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('commitments').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('future_entries').select('*', { count: 'exact', head: true }).eq('company_id', companyId)
      ]);

      // Get classifications count separately
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('id')
        .eq('company_id', companyId);
      
      const transactionIds = transactionsData?.map(t => t.id) || [];
      let classificationsCount = 0;
      
      if (transactionIds.length > 0) {
        const { count } = await supabase
          .from('transaction_classifications')
          .select('*', { count: 'exact', head: true })
          .in('transaction_id', transactionIds);
        classificationsCount = count || 0;
      }

      // Calculate storage size
      const { data: storageSizeData, error: storageSizeError } = await supabase
        .rpc('calculate_company_storage_size', { company_uuid: companyId });
      
      const storageSize = storageSizeError ? 0 : (storageSizeData || 0);

      setCompanyDetails({
        company: companyData,
        users: usersWithRoles || [],
        stats: {
          totalTransactions: transactionsCount || 0,
          totalNFes: nfesCount || 0,
          totalBanks: banksCount || 0,
          totalCommitments: commitmentsCount || 0,
          totalFutureEntries: futureEntriesCount || 0,
          totalClassifications: classificationsCount,
          storageSize: storageSize
        }
      });
    } catch (error) {
      console.error('Error fetching company details:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da empresa.",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCompanyClick = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setIsModalOpen(true);
    fetchCompanyDetails(companyId);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: newCompanyForm.name,
          segment: newCompanyForm.segment
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Empresa cadastrada com sucesso!"
      });

      setNewCompanyForm({ name: '', segment: '' });
      fetchUserData();
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar a empresa.",
        variant: "destructive"
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const selectedCompany = companies.find(c => c.id === newUserForm.companyId);
      
      if (!selectedCompany) {
        throw new Error('Empresa selecionada não encontrada');
      }

      // Create user via edge function (this will handle everything)
      const { data, error: functionError } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: newUserForm.email,
          fullName: newUserForm.fullName,
          password: newUserForm.password,
          companyName: selectedCompany.name,
          companyId: newUserForm.companyId,
          role: newUserForm.role
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || 'Erro na função de criação de usuário');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha ao criar usuário');
      }

      toast({
        title: "Sucesso",
        description: data.message || "Usuário criado com sucesso!"
      });

      setNewUserForm({ email: '', fullName: '', password: '', role: 'operador', companyId: '' });
      fetchUserData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o usuário.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    try {
      // First check if there are users linked to this company
      const { data: usersInCompany, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId);

      if (usersError) throw usersError;

      if (usersInCompany && usersInCompany.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Esta empresa possui usuários cadastrados. Remova todos os usuários antes de deletar a empresa.",
          variant: "destructive"
        });
        return;
      }

      // If no users are linked, proceed with deletion
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Empresa "${companyName}" deletada com sucesso!`
      });

      fetchUserData();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a empresa.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          full_name: profileForm.full_name,
          avatar_url: profileForm.avatar_url
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });

      fetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCompany) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyForm.name,
          segment: companyForm.segment
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!"
      });

      setEditCompanyDialog(false);
      setEditingCompany(null);
      fetchUserData();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a empresa.",
        variant: "destructive"
      });
    }
  };

  const openEditCompanyDialog = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      segment: company.segment || '',
      logo_url: company.logo_url || ''
    });
    setEditCompanyDialog(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          company_id: companyForm.name // This is actually the company_id from the select
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update role in user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({
          role: profileForm.avatar_url as any // This is actually the role from the select
        })
        .eq('user_id', editingUser.user_id);

      if (roleError) throw roleError;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!"
      });

      setEditUserDialog(false);
      setEditingUser(null);
      fetchUserData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive"
      });
    }
  };

  const openEditUserDialog = (user: UserProfile) => {
    setEditingUser(user);
    setProfileForm({
      full_name: user.full_name,
      avatar_url: user.role // Temporarily using avatar_url for role
    });
    setCompanyForm({
      ...companyForm,
      name: user.company_id || '' // Temporarily using name for company_id
    });
    setEditUserDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    // Prevent admin from deleting themselves
    if (deletingUser.user_id === user?.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode deletar sua própria conta.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Delete from user_roles first (due to foreign key)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deletingUser.user_id);

      if (roleError) throw roleError;

      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id);

      if (profileError) throw profileError;

      toast({
        title: "Sucesso",
        description: `Usuário "${deletingUser.full_name}" deletado com sucesso!`
      });

      setDeleteUserDialog(false);
      setDeletingUser(null);
      fetchUserData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar o usuário.",
        variant: "destructive"
      });
    }
  };

  const openDeleteUserDialog = (user: UserProfile) => {
    setDeletingUser(user);
    setDeleteUserDialog(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'operador': return 'Operador';
      case 'gestor': return 'Gestor';
      case 'admin': return 'Administrador';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'operador': return 'bg-muted text-muted-foreground';
      case 'gestor': return 'bg-secondary text-secondary-foreground';
      case 'admin': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Admin interface
  if (profile?.role === 'admin') {
    return (
      <div className="space-y-6">
        

        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Cadastros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <CardTitle>Empresas Cadastradas</CardTitle>
                <CardDescription>Lista de todas as empresas na plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companies.map((company) => (
                    <div 
                      key={company.id} 
                      className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleCompanyClick(company.id)}
                    >
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.segment || 'Não informado'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Ativa</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditCompanyDialog(company);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCompany(company.id, company.name);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {companies.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhuma empresa cadastrada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Usuários Cadastrados</CardTitle>
                <CardDescription>Lista de todos os usuários da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{user.full_name || 'Nome não informado'}</p>
                        <p className="text-sm text-muted-foreground">
                          {getRoleLabel(user.role)} - {user.company_id ? (companies.find(c => c.id === user.company_id)?.name || 'Empresa não encontrada') : 'Sem empresa'} - Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditUserDialog(user)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteUserDialog(user)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhum usuário cadastrado</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cadastrar Nova Empresa</CardTitle>
                  <CardDescription>Adicione uma nova empresa à plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    <div>
                      <Label htmlFor="company_name">Nome da Empresa</Label>
                      <Input
                        id="company_name"
                        value={newCompanyForm.name}
                        onChange={(e) => setNewCompanyForm({...newCompanyForm, name: e.target.value})}
                        placeholder="Digite o nome da empresa"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="segment">Segmento</Label>
                      <Select 
                        value={newCompanyForm.segment} 
                        onValueChange={(value) => setNewCompanyForm({...newCompanyForm, segment: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">Varejo</SelectItem>
                          <SelectItem value="services">Serviços</SelectItem>
                          <SelectItem value="technology">Tecnologia</SelectItem>
                          <SelectItem value="manufacturing">Indústria</SelectItem>
                          <SelectItem value="healthcare">Saúde</SelectItem>
                          <SelectItem value="education">Educação</SelectItem>
                          <SelectItem value="food">Alimentação</SelectItem>
                          <SelectItem value="other">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full">
                      Cadastrar Empresa
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cadastrar Novo Usuário</CardTitle>
                  <CardDescription>Adicione um usuário a uma empresa existente</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <Label htmlFor="user_email">E-mail</Label>
                      <Input
                        id="user_email"
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                        placeholder="email@exemplo.com"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="user_name">Nome Completo</Label>
                      <Input
                        id="user_name"
                        value={newUserForm.fullName}
                        onChange={(e) => setNewUserForm({...newUserForm, fullName: e.target.value})}
                        placeholder="Digite o nome completo"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="user_password">Senha</Label>
                      <Input
                        id="user_password"
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                        placeholder="Digite a senha"
                        required
                        minLength={6}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="user_role">Função</Label>
                      <Select 
                        value={newUserForm.role} 
                        onValueChange={(value: 'operador' | 'gestor') => setNewUserForm({...newUserForm, role: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operador">Operador</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="user_company">Empresa</Label>
                      <Select 
                        value={newUserForm.companyId} 
                        onValueChange={(value) => setNewUserForm({...newUserForm, companyId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={!newUserForm.companyId}>
                      Cadastrar Usuário
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Company Dialog */}
        <Dialog open={editCompanyDialog} onOpenChange={setEditCompanyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
              <DialogDescription>
                Atualize as informações da empresa
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div>
                <Label htmlFor="edit_company_name">Nome da Empresa</Label>
                <Input
                  id="edit_company_name"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                  placeholder="Digite o nome da empresa"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit_segment">Segmento</Label>
                <Select 
                  value={companyForm.segment} 
                  onValueChange={(value) => setCompanyForm({...companyForm, segment: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Varejo</SelectItem>
                    <SelectItem value="services">Serviços</SelectItem>
                    <SelectItem value="technology">Tecnologia</SelectItem>
                    <SelectItem value="manufacturing">Indústria</SelectItem>
                    <SelectItem value="healthcare">Saúde</SelectItem>
                    <SelectItem value="education">Educação</SelectItem>
                    <SelectItem value="food">Alimentação</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditCompanyDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editUserDialog} onOpenChange={setEditUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize as informações do usuário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label htmlFor="edit_user_name">Nome Completo</Label>
                <Input
                  id="edit_user_name"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit_user_role">Função</Label>
                <Select 
                  value={profileForm.avatar_url} 
                  onValueChange={(value) => setProfileForm({...profileForm, avatar_url: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit_user_company">Empresa</Label>
                <Select 
                  value={companyForm.name} 
                  onValueChange={(value) => setCompanyForm({...companyForm, name: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUserDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete User Alert Dialog */}
        <AlertDialog open={deleteUserDialog} onOpenChange={setDeleteUserDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o usuário "{deletingUser?.full_name}"? 
                Esta ação não pode ser desfeita e todos os dados associados serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Company Details Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Detalhes da Empresa
              </DialogTitle>
              <DialogDescription>
                Informações completas, usuários e estatísticas de uso
              </DialogDescription>
            </DialogHeader>

            {loadingDetails ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : companyDetails ? (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="users">Usuários</TabsTrigger>
                  <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dados da Empresa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Nome</Label>
                          <p className="font-medium">{companyDetails.company.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Segmento</Label>
                          <p className="font-medium">{companyDetails.company.segment || 'Não informado'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Data de Cadastro</Label>
                          <p className="font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(companyDetails.company.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">ID da Empresa</Label>
                          <p className="font-mono text-xs">{companyDetails.company.id}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users2 className="w-5 h-5" />
                        Usuários Cadastrados ({companyDetails.users.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {companyDetails.users.length > 0 ? (
                        <div className="space-y-3">
                          {companyDetails.users.map((user) => (
                            <div key={user.id} className="flex justify-between items-center p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-primary text-primary-foreground">
                                    {getInitials(user.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.full_name || 'Nome não informado'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              <Badge className={getRoleColor(user.role)}>
                                {getRoleLabel(user.role)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          Nenhum usuário cadastrado nesta empresa
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Estatísticas de Uso
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-muted-foreground">Transações</Label>
                            <Database className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-2xl font-bold">{companyDetails.stats.totalTransactions}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-muted-foreground">NFes</Label>
                            <Database className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-2xl font-bold">{companyDetails.stats.totalNFes}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-muted-foreground">Bancos</Label>
                            <Building className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-2xl font-bold">{companyDetails.stats.totalBanks}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-muted-foreground">Compromissos</Label>
                            <Database className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-2xl font-bold">{companyDetails.stats.totalCommitments}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-muted-foreground">Lançamentos Futuros</Label>
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-2xl font-bold">{companyDetails.stats.totalFutureEntries}</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-muted-foreground">Classificações</Label>
                            <Database className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-2xl font-bold">{companyDetails.stats.totalClassifications}</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-primary/5">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-muted-foreground">Espaço Ocupado</Label>
                            <HardDrive className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-2xl font-bold text-primary">{formatStorageSize(companyDetails.stats.storageSize)}</p>
                          <p className="text-xs text-muted-foreground mt-1">Estimativa</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Regular user interface
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e dados da conta</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Preferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize seus dados pessoais</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      O e-mail não pode ser alterado
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="avatar_url">URL do Avatar</Label>
                    <Input
                      id="avatar_url"
                      value={profileForm.avatar_url}
                      onChange={(e) => setProfileForm({...profileForm, avatar_url: e.target.value})}
                      placeholder="https://exemplo.com/avatar.jpg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">Função</Label>
                    <Select 
                      value={profileState?.role || 'operador'} 
                      onValueChange={async (value: 'operador' | 'gestor' | 'admin') => {
                        try {
                          const { error } = await supabase
                            .from('profiles')
                            .update({ role: value })
                            .eq('user_id', user?.id);

                          if (error) throw error;

                          toast({
                            title: "Sucesso",
                            description: "Função atualizada com sucesso!"
                          });

                          fetchUserData();
                        } catch (error) {
                          console.error('Error updating role:', error);
                          toast({
                            title: "Erro",
                            description: "Não foi possível atualizar a função.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operador">Operador</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full">
                    Atualizar Perfil
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview do Perfil</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {profileForm.full_name ? getInitials(profileForm.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center">
                  <h3 className="font-semibold">
                    {profileForm.full_name || 'Nome não informado'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                {profileState?.role && (
                  <Badge className={getRoleColor(profileState.role)}>
                    {getRoleLabel(profileState.role)}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>Configure as informações da sua empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateCompany} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="company_name">Nome da Empresa</Label>
                  <Input
                    id="company_name"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                    placeholder="Minha Empresa Ltda"
                  />
                </div>
                
                <div>
                  <Label htmlFor="segment">Segmento</Label>
                  <Select 
                    value={companyForm.segment} 
                    onValueChange={(value) => setCompanyForm({...companyForm, segment: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Varejo</SelectItem>
                      <SelectItem value="services">Serviços</SelectItem>
                      <SelectItem value="technology">Tecnologia</SelectItem>
                      <SelectItem value="manufacturing">Indústria</SelectItem>
                      <SelectItem value="healthcare">Saúde</SelectItem>
                      <SelectItem value="education">Educação</SelectItem>
                      <SelectItem value="food">Alimentação</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="company_logo">URL do Logo</Label>
                  <Input
                    id="company_logo"
                    value={companyForm.logo_url}
                    onChange={(e) => setCompanyForm({...companyForm, logo_url: e.target.value})}
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Atualizar Empresa
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Mantenha sua conta segura com uma senha forte</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="current_password">Senha Atual</Label>
                    <Input
                      id="current_password"
                      type="password"
                      placeholder="Digite sua senha atual"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <Input
                      id="new_password"
                      type="password"
                      placeholder="Digite a nova senha"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Confirme a nova senha"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Alterar Senha
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessões Ativas</CardTitle>
                <CardDescription>Gerencie onde você está logado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Sessão Atual</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString('pt-BR')} - Navegador Web
                      </p>
                    </div>
                    <Badge variant="secondary">Ativo</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>Personalize a aparência do dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tema</Label>
                  <Select defaultValue="light">
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Idioma</Label>
                  <Select defaultValue="pt-BR">
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificações
                </CardTitle>
                <CardDescription>Configure como deseja receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Relatórios por E-mail</p>
                    <p className="text-sm text-muted-foreground">Receba relatórios mensais por e-mail</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Ativar
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alertas de Meta</p>
                    <p className="text-sm text-muted-foreground">Notificações quando metas não são atingidas</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Ativar
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Resumo Semanal</p>
                    <p className="text-sm text-muted-foreground">Resumo semanal dos indicadores financeiros</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Ativar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Dados e Privacidade
                </CardTitle>
                <CardDescription>Gerencie seus dados e configurações de privacidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">
                  Exportar Dados
                </Button>
                
                <Button variant="destructive" className="w-full">
                  Excluir Conta
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  A exclusão da conta é permanente e não pode ser desfeita. 
                  Todos os seus dados serão removidos.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;