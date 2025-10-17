import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine } from 'lucide-react';
import { CommitmentHierarchy } from '@/components/CommitmentHierarchy';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';

const HierarchyManagement: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [hierarchyKey, setHierarchyKey] = useState(0);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem acessar esta página",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [profile, navigate]);

  const handleHierarchyChange = () => {
    setHierarchyKey(prev => prev + 1);
  };

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TreePine className="w-5 h-5" />
            Gerenciar Hierarquia de Naturezas
          </CardTitle>
          <CardDescription>
            Crie e edite tipos, grupos e naturezas da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommitmentHierarchy
            key={hierarchyKey}
            onSelectionChange={() => {}}
            showManagementExpanded={true}
            onHierarchyChange={handleHierarchyChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default HierarchyManagement;
