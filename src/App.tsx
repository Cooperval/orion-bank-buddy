import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import MarginAnalysis from "./pages/MarginAnalysis";
import Budget from "./pages/Budget";
import Indicators from "./pages/Indicators";
import Team from "./pages/Team";
import Scenarios from "./pages/Scenarios";
import Settings from "./pages/Settings";
import Plan from "./pages/Plan";
import Auth from "./pages/Auth";
import SetPassword from "./pages/SetPassword";
import NotFound from "./pages/NotFound";
import UploadOFX from "./pages/UploadOFX";
import UploadNFe from "./pages/UploadNFe";
import NFeList from "./pages/NFeList";
import Transactions from "./pages/Transactions";
import TransactionClassification from "./pages/TransactionClassification";
import BankBalances from "./pages/BankBalances";
import FinancialStatement from "./pages/FinancialStatement";
import CashFlow from "./pages/CashFlow";
import HierarchyManagement from "./pages/HierarchyManagement";
import SaldosBancarios from "./pages/SaldosBancarios";
import VisaoGeral from "./pages/VisaoGeral";
import Indicadores from "./pages/Indicadores";
import DemonstracoesFinanceiras from "./pages/DemonstracoesFinanceiras";
import FluxoCaixa from "./pages/FluxoCaixa";
import ConsultarOFX from "./pages/ConsultarOFX";
import ConsultarXML from "./pages/ConsultarXML";
import IntegrarOFX from "./pages/IntegrarOFX";
import ImportarXML from "./pages/ImportarXML";
import Classificar from "./pages/Classificar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidebarProvider defaultOpen={true}>
              <div className="min-h-screen flex w-full">
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/set-password" element={<SetPassword />} />
                  <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="margins" element={<MarginAnalysis />} />
                    <Route path="budget" element={<Budget />} />
                    <Route path="indicators" element={<Indicators />} />
                    <Route path="team" element={<Team />} />
                    <Route path="scenarios" element={<Scenarios />} />
                    <Route path="upload-ofx" element={<UploadOFX />} />
                    <Route path="upload-nfe" element={<UploadNFe />} />
                    <Route path="nfe-list" element={<NFeList />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="transaction-classification" element={<TransactionClassification />} />
                    <Route path="bank-balances" element={<BankBalances />} />
                    <Route path="financial-statement" element={<FinancialStatement />} />
                    <Route path="cash-flow" element={<CashFlow />} />
                    <Route path="plan" element={<Plan />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="hierarchy-management" element={<HierarchyManagement />} />
                    {/* Rotas Orion - Financeiro BR */}
                    <Route path="saldos-bancarios" element={<SaldosBancarios />} />
                    <Route path="visao-geral" element={<VisaoGeral />} />
                    <Route path="indicadores" element={<Indicadores />} />
                    <Route path="demonstracao" element={<DemonstracoesFinanceiras />} />
                    <Route path="fluxo-caixa" element={<FluxoCaixa />} />
                    <Route path="consultar-ofx" element={<ConsultarOFX />} />
                    <Route path="consultar-xml" element={<ConsultarXML />} />
                    <Route path="integrar-ofx" element={<IntegrarOFX />} />
                    <Route path="importar-xml" element={<ImportarXML />} />
                    <Route path="classificar" element={<Classificar />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
