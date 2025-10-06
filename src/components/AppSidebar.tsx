import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  FileText,
  TrendingDown,
  FileSpreadsheet,
  FileCode,
  Upload,
  FileSearch,
  Tags,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const menuItems = [
  {
    title: "Geral",
    icon: LayoutDashboard,
    items: [
      { title: "Visão Geral", url: "/visao-geral", icon: LayoutDashboard },
      { title: "Indicadores", url: "/indicadores", icon: TrendingUp },
    ],
  },
  { title: "Saldos Bancários", url: "/", icon: Wallet },
  { title: "Demonstração Financeira", url: "/demonstracao", icon: FileText },
  { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: TrendingDown },
  { title: "Consultar OFX", url: "/consultar-ofx", icon: FileSpreadsheet },
  { title: "Consultar XML", url: "/consultar-xml", icon: FileCode },
  {
    title: "Operacional",
    icon: FileSearch,
    items: [
      { title: "Integrar OFX", url: "/integrar-ofx", icon: Upload },
      { title: "Importar XML", url: "/importar-xml", icon: FileSearch },
      { title: "Classificar", url: "/classificar", icon: Tags },
    ],
  },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-6">
          <h1 className={`font-bold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent transition-all ${open ? 'opacity-100' : 'opacity-0 w-0 h-0'}`}>
            Orion
          </h1>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.items ? (
                  <Collapsible key={item.title} defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={subItem.url}
                                  className={({ isActive }) =>
                                    isActive ? "bg-sidebar-accent" : ""
                                  }
                                >
                                  <subItem.icon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          isActive ? "bg-sidebar-accent" : ""
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
