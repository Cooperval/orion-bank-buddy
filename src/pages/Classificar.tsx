import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, FileSearch } from "lucide-react";

export default function Classificar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Classificar</h1>
          <p className="text-muted-foreground">
            Classifique transações e categorize movimentações financeiras
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Aplicar Regras</Button>
          <Button>Exportar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Classificado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold text-success">0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total não classificado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">0</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ofx" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ofx">Transações OFX</TabsTrigger>
          <TabsTrigger value="nf">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarquia</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
        </TabsList>

        <TabsContent value="ofx" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    <SelectItem value="unclassified">Não classificados</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Data inicial" />
                <Input type="date" placeholder="Data final" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma movimentação encontrada
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Importe arquivos OFX para começar a classificar transações
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nf">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma nota fiscal encontrada
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Configure a hierarquia de classificação
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma regra de classificação configurada
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
