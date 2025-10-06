import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ImportarXML() {
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
      <h1 className="text-3xl font-bold mb-2">Carregar XML</h1>
      <p className="text-muted-foreground mb-6">
        Importe arquivos XML de notas fiscais eletrônicas
      </p>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("xml-file-input")?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              Arraste e solte os arquivos XML aqui
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou clique para selecionar múltiplos arquivos
            </p>
            <Button>Escolher arquivo</Button>
            <input
              id="xml-file-input"
              type="file"
              accept=".xml"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NF-e's Carregadas</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma NF-e carregada ainda
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Faça upload de arquivos XML para começar
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
                    <FileText className="h-5 w-5 text-primary" />
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
