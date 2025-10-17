-- Create tables for NFe (Nota Fiscal Eletrônica) data

-- Main NFe document table
CREATE TABLE public.nfe_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  nfe_number TEXT NOT NULL,
  serie TEXT NOT NULL,
  emission_date DATE NOT NULL,
  operation_nature TEXT NOT NULL,
  total_products_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_icms_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_pis_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cofins_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_ipi_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_iss_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_nfe_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  xml_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- NFe emitter (supplier) table
CREATE TABLE public.nfe_emitters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nfe_document_id UUID NOT NULL,
  cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  municipio TEXT NOT NULL,
  uf TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- NFe recipient (client) table  
CREATE TABLE public.nfe_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nfe_document_id UUID NOT NULL,
  cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  municipio TEXT NOT NULL,
  uf TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- NFe items table
CREATE TABLE public.nfe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nfe_document_id UUID NOT NULL,
  product_code TEXT NOT NULL,
  product_description TEXT NOT NULL,
  ncm TEXT NOT NULL,
  quantity NUMERIC(15,4) NOT NULL,
  unit_value NUMERIC(15,2) NOT NULL,
  total_value NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- NFe taxes table (per item)
CREATE TABLE public.nfe_taxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nfe_item_id UUID NOT NULL,
  tax_type TEXT NOT NULL, -- 'ICMS', 'PIS', 'COFINS', 'IPI', 'ISS'
  base_calculation NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0, -- Percentage (e.g., 0.1800 for 18%)
  tax_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.nfe_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_emitters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_taxes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage NFe documents of their companies" 
ON public.nfe_documents 
FOR ALL 
USING (user_has_demo_access());

CREATE POLICY "Users can manage NFe emitters of their companies" 
ON public.nfe_emitters 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM nfe_documents nd 
  WHERE nd.id = nfe_emitters.nfe_document_id 
  AND user_has_demo_access()
));

CREATE POLICY "Users can manage NFe recipients of their companies" 
ON public.nfe_recipients 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM nfe_documents nd 
  WHERE nd.id = nfe_recipients.nfe_document_id 
  AND user_has_demo_access()
));

CREATE POLICY "Users can manage NFe items of their companies" 
ON public.nfe_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM nfe_documents nd 
  WHERE nd.id = nfe_items.nfe_document_id 
  AND user_has_demo_access()
));

CREATE POLICY "Users can manage NFe taxes of their companies" 
ON public.nfe_taxes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM nfe_items ni 
  JOIN nfe_documents nd ON nd.id = ni.nfe_document_id
  WHERE ni.id = nfe_taxes.nfe_item_id 
  AND user_has_demo_access()
));

-- Add foreign key constraints
ALTER TABLE public.nfe_emitters 
ADD CONSTRAINT fk_nfe_emitters_document 
FOREIGN KEY (nfe_document_id) REFERENCES public.nfe_documents(id) ON DELETE CASCADE;

ALTER TABLE public.nfe_recipients 
ADD CONSTRAINT fk_nfe_recipients_document 
FOREIGN KEY (nfe_document_id) REFERENCES public.nfe_documents(id) ON DELETE CASCADE;

ALTER TABLE public.nfe_items 
ADD CONSTRAINT fk_nfe_items_document 
FOREIGN KEY (nfe_document_id) REFERENCES public.nfe_documents(id) ON DELETE CASCADE;

ALTER TABLE public.nfe_taxes 
ADD CONSTRAINT fk_nfe_taxes_item 
FOREIGN KEY (nfe_item_id) REFERENCES public.nfe_items(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_nfe_documents_company_id ON public.nfe_documents(company_id);
CREATE INDEX idx_nfe_documents_nfe_number ON public.nfe_documents(nfe_number);
CREATE INDEX idx_nfe_emitters_document_id ON public.nfe_emitters(nfe_document_id);
CREATE INDEX idx_nfe_recipients_document_id ON public.nfe_recipients(nfe_document_id);
CREATE INDEX idx_nfe_items_document_id ON public.nfe_items(nfe_document_id);
CREATE INDEX idx_nfe_taxes_item_id ON public.nfe_taxes(nfe_item_id);
CREATE INDEX idx_nfe_taxes_type ON public.nfe_taxes(tax_type);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_nfe_documents_updated_at
BEFORE UPDATE ON public.nfe_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nfe_emitters_updated_at
BEFORE UPDATE ON public.nfe_emitters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nfe_recipients_updated_at
BEFORE UPDATE ON public.nfe_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nfe_items_updated_at
BEFORE UPDATE ON public.nfe_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nfe_taxes_updated_at
BEFORE UPDATE ON public.nfe_taxes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();