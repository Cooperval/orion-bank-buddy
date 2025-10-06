import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <header className="h-16 border-b flex items-center px-4 bg-card">
                <SidebarTrigger />
              </header>
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<SaldosBancarios />} />
                  <Route path="/visao-geral" element={<VisaoGeral />} />
                  <Route path="/indicadores" element={<Indicadores />} />
                  <Route path="/demonstracao" element={<DemonstracoesFinanceiras />} />
                  <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
                  <Route path="/consultar-ofx" element={<ConsultarOFX />} />
                  <Route path="/consultar-xml" element={<ConsultarXML />} />
                  <Route path="/integrar-ofx" element={<IntegrarOFX />} />
                  <Route path="/importar-xml" element={<ImportarXML />} />
                  <Route path="/classificar" element={<Classificar />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
