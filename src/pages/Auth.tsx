<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, BarChart3, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login realizado com sucesso!");
    }
    setLoading(false);
=======
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import authBackground from '@/assets/auth-background3.jpg';

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
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao Meu Gestor",
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
>>>>>>> cdabeeb (Alterações)
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
<<<<<<< HEAD
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada com sucesso! Você já pode fazer login.");
    }
    setLoading(false);
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
                    <Label htmlFor="email-signin">Email</Label>
                    <Input
                      id="email-signin"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signin">Senha</Label>
                    <Input
                      id="password-signin"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Senha</Label>
                    <Input
                      id="password-signup"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando conta..." : "Cadastrar"}
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
}
=======
    setIsLoading(true);

    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta",
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-success/10 flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-background/10 backdrop-blur-md"></div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 place-items-center min-h-screen">

          <div className="hidden lg:block space-y-8">

          </div>

          {/* Left side - Branding and info */}
          <div className="hidden lg:block space-y-8">

            <div className="flex items-center gap-6">
              {/* Ícone */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl shadow-2xl">
                <TrendingUp className="w-10 h-10 text-primary-foreground" />
              </div>

              {/* Título e subtítulo */}
              <div className="space-y-2">
                <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight">
                  Meu Gestor
                </h1>
              </div>
            </div>

            <div className="space-y-6">

              <div className="space-y-4">

                <p className="text-xl text-white max-w-lg">
                  Análise financeira inteligente para transformar dados em decisões estratégicas para seu negócio.
                </p>
              </div>
            </div>



            <div className="grid grid-cols-1 gap-6 max-w-lg">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Dashboard Intuitivo</h3>
                  <p className="text-sm text-white">Visualize métricas em tempo real</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-success/5 border border-success/10">
                <div className="flex-shrink-0 w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Análises Avançadas</h3>
                  <p className="text-sm text-white">Relatórios detalhados e insights</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="w-full max-w-xl mx-auto">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-financial">
                <TrendingUp className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Meu Gestor</h1>
              <p className="text-muted-foreground mt-2">Análise financeira inteligente</p>
            </div>

            <Card className="shadow-2xl bg-background/95 backdrop-blur-sm border-0 overflow-hidden flex flex-col justify-center items-center min-h-[500px]">
              <Tabs defaultValue="signin" className="w-full">
                {/*<TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
                  <TabsTrigger value="signin" className="data-[state=active]:bg-background data-[state=active]:shadow-md">
                    Entrar
                  </TabsTrigger> 
                   <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:shadow-md">
                    Cadastrar
                  </TabsTrigger> 
                </TabsList> */}

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn}>
                    <CardHeader className="text-center pb-4">
                      <CardTitle className="flex items-center justify-center gap-2 text-xl">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Fazer Login
                      </CardTitle>
                      <CardDescription>
                        Entre com sua conta para acessar o dashboard
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signInData.email}
                          onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                          required
                          className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-sm font-medium">Senha</Label>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="Sua senha"
                          value={signInData.password}
                          onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                          required
                          className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? "Entrando..." : "Entrar"}
                      </Button>
                    </CardFooter>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp}>
                    <CardHeader className="text-center pb-4">
                      <CardTitle className="flex items-center justify-center gap-2 text-xl">
                        <PieChart className="w-5 h-5 text-primary" />
                        Criar Conta
                      </CardTitle>
                      <CardDescription>
                        Crie sua conta e comece a analisar suas finanças
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm font-medium">Nome Completo</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          value={signUpData.fullName}
                          onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                          required
                          className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                          required
                          className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Escolha uma senha forte"
                          value={signUpData.password}
                          onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                          required
                          className="h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-success hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? "Criando conta..." : "Criar Conta"}
                      </Button>
                    </CardFooter>
                  </form>
                </TabsContent>
              </Tabs>
            </Card>

            <p className="text-center text-sm text-white mt-6 lg:mt-8">
              Ao criar uma conta, você concorda com nossos termos de serviço
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
>>>>>>> cdabeeb (Alterações)
