import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  Target,
  Settings,
  LogOut,
  Building,
  Upload,
  FileX,
  ArrowLeftRight,
  Wallet,
  Tags,
  FileText,
  Plus,
  Calendar,
  TreePine,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";

// --- no topo do arquivo, antes de AppSidebar ---
type NavItem = { name: string; icon: React.ComponentType<any>; href: string; current?: boolean };

export const NAV_GERENCIAL: NavItem[] = [
  { name: "Visão Geral", icon: BarChart3, href: "/", current: true },
  { name: "Indicadores", icon: PieChart, href: "/indicators" },
  { name: "Saldos Bancários", icon: Wallet, href: "/bank-balances" },
  // { name: 'Cenários', icon: Target, href: '/scenarios' },
  { name: "Análise de Margens", icon: TrendingUp, href: "/margins" },
  { name: "Fluxo por Natureza", icon: FileText, href: "/financial-statement" },
  { name: "Fluxo de Caixa", icon: Calendar, href: "/cash-flow" },
  { name: "Consultar OFX", icon: ArrowLeftRight, href: "/transactions" },
  { name: "Consultar XML", icon: FileText, href: "/nfe-list" },
];

export const NAV_OPERACIONAL: NavItem[] = [
  { name: "Carregar OFX", icon: Upload, href: "/upload-ofx" },
  { name: "Carregar XML", icon: FileX, href: "/upload-nfe" },
  { name: "Classificar OFX", icon: Tags, href: "/transaction-classification" },
  // { name: 'Equipe', icon: Users, href: '/team' },
  // { name: 'Orçamento', icon: DollarSign, href: '/budget' },
];

export const NAV_ADMIN: NavItem[] = [
  { name: "Configurações", icon: Settings, href: "/settings" },
  { name: "Gerenciar Hierarquia", icon: TreePine, href: "/hierarchy-management" },
  // { name: 'Planos', icon: Settings, href: '/plan' },
];

// util: encontra o título com base na URL atual
export function getPageTitle(pathname: string): string {
  const match =
    [...NAV_GERENCIAL, ...NAV_OPERACIONAL, ...NAV_ADMIN].find(
      (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)),
    ) || NAV_GERENCIAL.find((i) => i.href === "/");

  return match?.name ?? "Meu Gestor";
}

const AppSidebar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useSidebar();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error during logout:", error);
      // Only show error if it's not a session-related error
      if (
        error instanceof Error &&
        !error.message.includes("Auth session missing") &&
        !error.message.includes("session id") &&
        !error.message.includes("doesn't exist")
      ) {
        toast({
          title: "Erro no logout",
          description: "Tente novamente",
          variant: "destructive",
        });
      } else {
        // For session errors, still show success and navigate
        toast({
          title: "Logout realizado",
          description: "Até logo!",
        });
        navigate("/auth");
      }
    }
  };

  const navigation = NAV_GERENCIAL;
  const navigation2 = NAV_OPERACIONAL;

  const isActive = (path: string) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <Sidebar className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-sidebar-primary rounded-xl">
            <TrendingUp className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {open && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Meu Gestor</h1>
              <p className="text-xs text-sidebar-foreground/70">Painel de Análise</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel>Gerencial</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.href)}
                    isActive={isActive(item.href)}
                    className="w-full justify-start"
                  >
                    <item.icon className="w-5 h-5" />
                    {open && <span>{item.name}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation2.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.href)}
                    isActive={isActive(item.href)}
                    className="w-full justify-start"
                  >
                    <item.icon className="w-5 h-5" />
                    {open && <span>{item.name}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {profile?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ADMIN.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.href)}
                      isActive={isActive(item.href)}
                      className="w-full justify-start"
                    >
                      <item.icon className="w-5 h-5" />
                      {open && <span>{item.name}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="space-y-2">
          {user && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
                <Building className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              {open && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile?.full_name || user.email}
                  </p>
                  <p className="text-xs text-sidebar-foreground/70">
                    {profile?.role === "operador"
                      ? "Operador"
                      : profile?.role === "gestor"
                        ? "Gestor"
                        : profile?.role === "admin"
                          ? "Administrador"
                          : profile?.role === "owner"
                            ? "Proprietário"
                            : profile?.role === "manager"
                              ? "Gerente"
                              : profile?.role === "accountant"
                                ? "Contador"
                                : "Usuário"}
                  </p>
                </div>
              )}
            </div>
          )}

          <SidebarMenuButton onClick={handleSignOut} className="w-full justify-start">
            <LogOut className="w-4 h-4" />
            {open && <span>Sair</span>}
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

const DashboardLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = React.useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  React.useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset className="bg-gradient-to-br from-background via-secondary/20 to-primary/5">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <h2 className="text-3xl font-semibold tracking-tight">{pageTitle}</h2>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </>
  );
};

export default DashboardLayout;
