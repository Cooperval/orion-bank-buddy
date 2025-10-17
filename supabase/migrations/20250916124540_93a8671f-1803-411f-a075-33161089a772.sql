-- Create table for CFOP classifications
CREATE TABLE public.cfop_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  cfop TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('custo', 'venda')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, cfop)
);

-- Enable RLS
ALTER TABLE public.cfop_classifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage CFOP classifications of their companies" 
ON public.cfop_classifications 
FOR ALL 
USING (user_has_demo_access());

-- Add trigger for updated_at
CREATE TRIGGER update_cfop_classifications_updated_at
BEFORE UPDATE ON public.cfop_classifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();