import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, BarChart3, FileText } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(signInData.email, signInData.password);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Login realizado com sucesso!");
        navigate('/');
      }
    } catch (error) {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Cadastro realizado! Você já pode fazer login.");
      }
    } catch (error) {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0ic3RhcnMiIHg9IjAiIHk9IjAiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIxIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4zIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iNTAiIHI9IjEuNSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iMSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuNCIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNzdGFycykiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-start p-16 text-white">
          <h1 className="text-6xl font-bold mb-8">Orion</h1>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
              <BarChart3 className="w-6 h-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Dashboard Intuitivo</h3>
                <p className="text-white/90">Visualize métricas em tempo real</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
              <FileText className="w-6 h-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Análises Avançadas</h3>
                <p className="text-white/90">Relatórios detalhados e insights</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all">
              <Sparkles className="w-6 h-6 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">Gestão Completa</h3>
                <p className="text-white/90">Controle total das suas finanças</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Bem-vindo ao Orion</CardTitle>
            <CardDescription>
              Entre com sua conta para acessar o dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Criando conta..." : "Cadastrar"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Ao criar uma conta, você concorda com nossos termos de serviço
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
