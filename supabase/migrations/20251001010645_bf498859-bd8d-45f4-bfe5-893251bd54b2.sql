-- Add billing fields to nfe_documents table
ALTER TABLE nfe_documents
ADD COLUMN fatura_numero text,
ADD COLUMN fatura_valor_original numeric DEFAULT 0,
ADD COLUMN fatura_valor_desconto numeric DEFAULT 0,
ADD COLUMN fatura_valor_liquido numeric DEFAULT 0;

-- Create table for payment installments (duplicatas)
CREATE TABLE nfe_duplicatas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_document_id uuid NOT NULL REFERENCES nfe_documents(id) ON DELETE CASCADE,
  numero_parcela text NOT NULL,
  data_vencimento date NOT NULL,
  valor_parcela numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE nfe_duplicatas ENABLE ROW LEVEL SECURITY;

-- Create policy for duplicatas
CREATE POLICY "Users can manage NFe duplicatas of their companies"
ON nfe_duplicatas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM nfe_documents nd
    WHERE nd.id = nfe_duplicatas.nfe_document_id
    AND user_has_demo_access()
  )
);

-- Create index for better performance
CREATE INDEX idx_nfe_duplicatas_document_id ON nfe_duplicatas(nfe_document_id);

-- Add trigger for updated_at
CREATE TRIGGER update_nfe_duplicatas_updated_at
  BEFORE UPDATE ON nfe_duplicatas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();