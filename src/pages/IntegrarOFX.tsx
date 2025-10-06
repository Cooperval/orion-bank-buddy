import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Info } from "lucide-react";
import { toast } from "sonner";

export default function IntegrarOFX() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
      toast.success(`${newFiles.length} arquivo(s) selecionado(s)`);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles([...files, ...newFiles]);
      toast.success(`${newFiles.length} arquivo(s) adicionado(s)`);
    }
  };

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold mb-2">Carregar OFX</h1>
      <p className="text-muted-foreground mb-6">
        Importe extratos bancários no formato OFX
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("ofx-file-input")?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              Selecione ou arraste múltiplos arquivos .ofx
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Clique aqui ou arraste múltiplos arquivos .ofx
            </p>
            <Button className="bg-primary">Selecionar Arquivos</Button>
            <input
              id="ofx-file-input"
              type="file"
              accept=".ofx"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-2">Informações sobre arquivos OFX:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Formato padrão para intercâmbio de dados financeiros</li>
                <li>• Gerado pela maioria dos bancos brasileiros</li>
                <li>• Contém informações detalhadas sobre transações</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Arquivos OFX enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum upload encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Faça upload de arquivos OFX para começar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
