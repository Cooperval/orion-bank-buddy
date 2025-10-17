import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2, FolderTree, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CommitmentGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
}

interface Commitment {
  id: string;
  commitment_group_id: string;
  commitment_type_id?: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface CommitmentType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface CommitmentHierarchyProps {
  selectedGroup?: string;
  selectedCommitment?: string;
  selectedType?: string;
  onSelectionChange: (group: string, commitment: string, type: string) => void;
  disabled?: boolean;
  showManagement?: boolean;
  onHierarchyChange?: () => void;
}

export const CommitmentHierarchy: React.FC<CommitmentHierarchyProps> = ({
  selectedGroup,
  selectedCommitment,
  selectedType,
  onSelectionChange,
  disabled = false,
  showManagement = false,
  onHierarchyChange
}) => {
  const [groups, setGroups] = useState<CommitmentGroup[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [commitmentTypes, setCommitmentTypes] = useState<CommitmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  // Form states for creating new items
  const [newGroup, setNewGroup] = useState({ name: '', description: '', color: '#6B7280' });
  const [newCommitment, setNewCommitment] = useState({ name: '', description: '', group_id: '', type_id: '' });
  const [newType, setNewType] = useState({ name: '', description: '' });

  // Edit states
  const [editingGroup, setEditingGroup] = useState<CommitmentGroup | null>(null);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [editingType, setEditingType] = useState<CommitmentType | null>(null);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);

      // Fetch commitment groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('commitment_groups')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Fetch commitments
      const { data: commitmentsData, error: commitmentsError } = await supabase
        .from('commitments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (commitmentsError) throw commitmentsError;
      setCommitments(commitmentsData || []);

      // Fetch commitment types
      const { data: typesData, error: typesError } = await supabase
        .from('commitment_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (typesError) throw typesError;
      setCommitmentTypes(typesData || []);

    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      toast({
        title: "Erro ao carregar hierarquia",
        description: "Não foi possível carregar os dados da hierarquia",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (groupId: string) => {
    onSelectionChange(groupId, '', '');
  };

  const handleCommitmentChange = (commitmentId: string) => {
    onSelectionChange(selectedGroup || '', commitmentId, '');
  };

  const handleTypeChange = (typeId: string) => {
    onSelectionChange(selectedGroup || '', selectedCommitment || '', typeId);
  };

  const filteredCommitments = commitments.filter(c => c.commitment_group_id === selectedGroup);
  const filteredTypes = commitmentTypes;

  const createGroup = async () => {
    if (!newGroup.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do grupo de natureza",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('commitment_groups')
        .insert({
          company_id: (await supabase.from('commitment_groups').select('company_id').limit(1).single()).data?.company_id || 'temp',
          name: newGroup.name,
          description: newGroup.description,
          color: newGroup.color
        });

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();
      setNewGroup({ name: '', description: '', color: '#6B7280' });

      toast({
        title: "Grupo criado",
        description: "Grupo de natureza criado com sucesso",
      });

    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Erro ao criar grupo",
        description: "Não foi possível criar o grupo",
        variant: "destructive",
      });
    }
  };

  const createCommitment = async () => {
    if (!newCommitment.name.trim() || !newCommitment.group_id || !newCommitment.type_id) {
      toast({
        title: "Dados incompletos",
        description: "Preencha o nome, selecione um grupo e um tipo",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('commitments')
        .insert({
          commitment_group_id: newCommitment.group_id,
          commitment_type_id: newCommitment.type_id,
          company_id: (await supabase.from('commitment_groups').select('company_id').limit(1).single()).data?.company_id || 'temp',
          name: newCommitment.name,
          description: newCommitment.description
        });

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();
      setNewCommitment({ name: '', description: '', group_id: '', type_id: '' });

      toast({
        title: "Natureza criada",
        description: "Natureza criada com sucesso",
      });

    } catch (error) {
      console.error('Error creating commitment:', error);
      toast({
        title: "Erro ao criar natureza",
        description: "Não foi possível criar a natureza",
        variant: "destructive",
      });
    }
  };

  const createType = async () => {
    if (!newType.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do tipo de natureza",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('commitment_types')
        .insert({
          company_id: (await supabase.from('commitment_groups').select('company_id').limit(1).single()).data?.company_id || 'temp',
          name: newType.name,
          description: newType.description
        });

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();
      setNewType({ name: '', description: '' });

      toast({
        title: "Tipo criado",
        description: "Tipo de natureza criado com sucesso",
      });

    } catch (error) {
      console.error('Error creating type:', error);
      toast({
        title: "Erro ao criar tipo",
        description: "Não foi possível criar o tipo",
        variant: "destructive",
      });
    }
  };

  // Edit functions
  const updateGroup = async () => {
    if (!editingGroup || !editingGroup.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do grupo de natureza",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('commitment_groups')
        .update({
          name: editingGroup.name,
          description: editingGroup.description,
          color: editingGroup.color
        })
        .eq('id', editingGroup.id);

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();
      setEditingGroup(null);

      toast({
        title: "Grupo atualizado",
        description: "Grupo de natureza atualizado com sucesso",
      });

    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: "Erro ao atualizar grupo",
        description: "Não foi possível atualizar o grupo",
        variant: "destructive",
      });
    }
  };

  const updateCommitment = async () => {
    if (!editingCommitment || !editingCommitment.name.trim() || !editingCommitment.commitment_group_id || !editingCommitment.commitment_type_id) {
      toast({
        title: "Dados incompletos",
        description: "Preencha o nome, selecione um grupo e um tipo",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('commitments')
        .update({
          commitment_group_id: editingCommitment.commitment_group_id,
          commitment_type_id: editingCommitment.commitment_type_id,
          name: editingCommitment.name,
          description: editingCommitment.description
        })
        .eq('id', editingCommitment.id);

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();
      setEditingCommitment(null);

      toast({
        title: "Natureza atualizada",
        description: "Natureza atualizada com sucesso",
      });

    } catch (error) {
      console.error('Error updating commitment:', error);
      toast({
        title: "Erro ao atualizar natureza",
        description: "Não foi possível atualizar a natureza",
        variant: "destructive",
      });
    }
  };

  const updateType = async () => {
    if (!editingType || !editingType.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do tipo de natureza",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('commitment_types')
        .update({
          name: editingType.name,
          description: editingType.description
        })
        .eq('id', editingType.id);

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();
      setEditingType(null);

      toast({
        title: "Tipo atualizado",
        description: "Tipo de natureza atualizado com sucesso",
      });

    } catch (error) {
      console.error('Error updating type:', error);
      toast({
        title: "Erro ao atualizar tipo",
        description: "Não foi possível atualizar o tipo",
        variant: "destructive",
      });
    }
  };

  // Delete functions with validation
  const deleteGroup = async (groupId: string) => {
    try {
      // Check if there are commitments using this group
      const { data: commitmentsUsingGroup, error: checkError } = await supabase
        .from('commitments')
        .select('id')
        .eq('commitment_group_id', groupId)
        .eq('is_active', true);

      if (checkError) throw checkError;

      if (commitmentsUsingGroup && commitmentsUsingGroup.length > 0) {
        toast({
          title: "Não é possível deletar",
          description: "Este grupo possui naturezas atreladas a ele",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('commitment_groups')
        .update({ is_active: false })
        .eq('id', groupId);

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();

      toast({
        title: "Grupo excluído",
        description: "Grupo de natureza excluído com sucesso",
      });

    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Erro ao excluir grupo",
        description: "Não foi possível excluir o grupo",
        variant: "destructive",
      });
    }
  };

  const deleteType = async (typeId: string) => {
    try {
      // Check if there are commitments using this type
      const { data: commitmentsUsingType, error: checkError } = await supabase
        .from('commitments')
        .select('id')
        .eq('commitment_type_id', typeId)
        .eq('is_active', true);

      if (checkError) throw checkError;

      if (commitmentsUsingType && commitmentsUsingType.length > 0) {
        toast({
          title: "Não é possível deletar",
          description: "Este tipo possui naturezas atreladas a ele",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('commitment_types')
        .update({ is_active: false })
        .eq('id', typeId);

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();

      toast({
        title: "Tipo excluído",
        description: "Tipo de natureza excluído com sucesso",
      });

    } catch (error) {
      console.error('Error deleting type:', error);
      toast({
        title: "Erro ao excluir tipo",
        description: "Não foi possível excluir o tipo",
        variant: "destructive",
      });
    }
  };

  const deleteCommitment = async (commitmentId: string) => {
    try {
      const { error } = await supabase
        .from('commitments')
        .update({ is_active: false })
        .eq('id', commitmentId);

      if (error) throw error;

      await fetchHierarchy();
      onHierarchyChange?.();

      toast({
        title: "Natureza excluída",
        description: "Natureza excluída com sucesso",
      });

    } catch (error) {
      console.error('Error deleting commitment:', error);
      toast({
        title: "Erro ao excluir natureza",
        description: "Não foi possível excluir a natureza",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse">Carregando hierarquia...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Dropdowns encadeados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="group-select" className="text-sm font-medium mb-2 block">
            Grupo de Natureza
          </Label>
          <Select 
            value={selectedGroup} 
            onValueChange={handleGroupChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar grupo" />
            </SelectTrigger>
            <SelectContent>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                    {group.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="commitment-select" className="text-sm font-medium mb-2 block">
            Natureza
          </Label>
          <Select 
            value={selectedCommitment} 
            onValueChange={handleCommitmentChange}
            disabled={disabled || !selectedGroup}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar natureza" />
            </SelectTrigger>
            <SelectContent>
              {filteredCommitments.map(commitment => (
                <SelectItem key={commitment.id} value={commitment.id}>
                  {commitment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type-select" className="text-sm font-medium mb-2 block">
            Tipo de Natureza
          </Label>
          <Select 
            value={selectedType} 
            onValueChange={handleTypeChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {filteredTypes.map(type => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Botão de gerenciamento */}
      {showManagement && (
        <div className="flex justify-end">
          <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderTree className="w-4 h-4 mr-2" />
                Gerenciar Hierarquia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Hierarquia de Naturezas</DialogTitle>
                <DialogDescription>
                  Crie e gerencie grupos, naturezas e tipos de natureza
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="types" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="types">Tipos</TabsTrigger>
                  <TabsTrigger value="groups">Grupos</TabsTrigger>
                  <TabsTrigger value="commitments">Naturezas</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Novo Tipo de Natureza</CardTitle>
                      <CardDescription>
                        Crie um novo tipo de natureza independente
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="type-name">Nome</Label>
                        <Input
                          id="type-name"
                          value={newType.name}
                          onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Peças, Serviços"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type-description">Descrição</Label>
                        <Input
                          id="type-description"
                          value={newType.description}
                          onChange={(e) => setNewType(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrição do tipo"
                        />
                      </div>
                      <Button onClick={createType} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Tipo
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Lista de tipos existentes */}
                  <div className="grid gap-2">
                    {commitmentTypes.map(type => (
                      <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingType?.id === type.id ? (
                          <div className="flex-1 grid grid-cols-2 gap-2 mr-2">
                            <Input
                              value={editingType.name}
                              onChange={(e) => setEditingType(prev => prev ? { ...prev, name: e.target.value } : null)}
                              placeholder="Nome do tipo"
                            />
                            <Input
                              value={editingType.description || ''}
                              onChange={(e) => setEditingType(prev => prev ? { ...prev, description: e.target.value } : null)}
                              placeholder="Descrição"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{type.name}</div>
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {editingType?.id === type.id ? (
                            <>
                              <Button size="sm" onClick={updateType}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingType(null)}>
                                ×
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditingType(type)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteType(type.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Novo Grupo de Natureza</CardTitle>
                      <CardDescription>
                        Crie um novo grupo de natureza (ex: Receitas, Despesas)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="group-name">Nome</Label>
                          <Input
                            id="group-name"
                            value={newGroup.name}
                            onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Receitas"
                          />
                        </div>
                        <div>
                          <Label htmlFor="group-color">Cor</Label>
                          <Input
                            id="group-color"
                            type="color"
                            value={newGroup.color}
                            onChange={(e) => setNewGroup(prev => ({ ...prev, color: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="group-description">Descrição</Label>
                        <Input
                          id="group-description"
                          value={newGroup.description}
                          onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrição do grupo"
                        />
                      </div>
                      <Button onClick={createGroup} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Grupo
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Lista de grupos existentes */}
                  <div className="grid gap-2">
                    {groups.map(group => (
                      <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingGroup?.id === group.id ? (
                          <div className="flex-1 mr-2">
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                value={editingGroup.name}
                                onChange={(e) => setEditingGroup(prev => prev ? { ...prev, name: e.target.value } : null)}
                                placeholder="Nome do grupo"
                              />
                              <Input
                                value={editingGroup.description || ''}
                                onChange={(e) => setEditingGroup(prev => prev ? { ...prev, description: e.target.value } : null)}
                                placeholder="Descrição"
                              />
                              <Input
                                type="color"
                                value={editingGroup.color}
                                onChange={(e) => setEditingGroup(prev => prev ? { ...prev, color: e.target.value } : null)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: group.color }}
                            />
                            <div>
                              <div className="font-medium">{group.name}</div>
                              <div className="text-sm text-muted-foreground">{group.description}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {editingGroup?.id === group.id ? (
                            <>
                              <Button size="sm" onClick={updateGroup}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingGroup(null)}>
                                ×
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditingGroup(group)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteGroup(group.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="commitments" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Nova Natureza</CardTitle>
                      <CardDescription>
                        Crie uma nova natureza selecionando um grupo e um tipo
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="commitment-group">Grupo</Label>
                        <Select value={newCommitment.group_id} onValueChange={(value) => 
                          setNewCommitment(prev => ({ ...prev, group_id: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map(group => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="commitment-type">Tipo</Label>
                        <Select value={newCommitment.type_id} onValueChange={(value) => 
                          setNewCommitment(prev => ({ ...prev, type_id: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {commitmentTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="commitment-name">Nome</Label>
                        <Input
                          id="commitment-name"
                          value={newCommitment.name}
                          onChange={(e) => setNewCommitment(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Pessoal, Manutenção"
                        />
                      </div>
                      <div>
                        <Label htmlFor="commitment-description">Descrição</Label>
                        <Input
                          id="commitment-description"
                          value={newCommitment.description}
                          onChange={(e) => setNewCommitment(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrição da natureza"
                        />
                      </div>
                      <Button onClick={createCommitment} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Natureza
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Lista de naturezas existentes */}
                  <div className="space-y-4">
                    {groups.map(group => {
                      const groupCommitments = commitments.filter(c => c.commitment_group_id === group.id);
                      if (groupCommitments.length === 0) return null;
                      
                      return (
                        <div key={group.id}>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: group.color }}
                            />
                            {group.name}
                          </h4>
                          <div className="grid gap-2 ml-5">
                            {groupCommitments.map(commitment => (
                              <div key={commitment.id} className="flex items-center justify-between p-2 border rounded">
                                {editingCommitment?.id === commitment.id ? (
                                  <div className="flex-1 mr-2">
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                      <Input
                                        value={editingCommitment.name}
                                        onChange={(e) => setEditingCommitment(prev => prev ? { ...prev, name: e.target.value } : null)}
                                        placeholder="Nome da natureza"
                                      />
                                      <Input
                                        value={editingCommitment.description || ''}
                                        onChange={(e) => setEditingCommitment(prev => prev ? { ...prev, description: e.target.value } : null)}
                                        placeholder="Descrição"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Select value={editingCommitment.commitment_group_id} onValueChange={(value) => 
                                        setEditingCommitment(prev => prev ? { ...prev, commitment_group_id: value } : null)
                                      }>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecionar grupo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {groups.map(g => (
                                            <SelectItem key={g.id} value={g.id}>
                                              {g.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Select value={editingCommitment.commitment_type_id || ''} onValueChange={(value) => 
                                        setEditingCommitment(prev => prev ? { ...prev, commitment_type_id: value } : null)
                                      }>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecionar tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {commitmentTypes.map(type => (
                                            <SelectItem key={type.id} value={type.id}>
                                              {type.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium text-sm">{commitment.name}</div>
                                    <div className="text-xs text-muted-foreground">{commitment.description}</div>
                                    {commitment.commitment_type_id && (
                                      <div className="text-xs text-blue-600 mt-1">
                                        Tipo: {commitmentTypes.find(t => t.id === commitment.commitment_type_id)?.name}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  {editingCommitment?.id === commitment.id ? (
                                    <>
                                      <Button size="sm" onClick={updateCommitment}>
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingCommitment(null)}>
                                        ×
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => setEditingCommitment(commitment)}>
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => deleteCommitment(commitment.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default CommitmentHierarchy;