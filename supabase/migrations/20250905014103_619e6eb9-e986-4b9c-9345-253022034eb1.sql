-- Create table for DRE line configurations
CREATE TABLE public.dre_line_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  line_type TEXT NOT NULL CHECK (line_type IN ('revenue', 'cost', 'expense')),
  commitment_group_id UUID REFERENCES public.commitment_groups(id),
  commitment_id UUID REFERENCES public.commitments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, commitment_group_id, commitment_id)
);

-- Enable RLS
ALTER TABLE public.dre_line_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage DRE configurations of their companies" 
ON public.dre_line_configurations 
FOR ALL 
USING (user_has_demo_access());

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_dre_line_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dre_line_configurations_updated_at
BEFORE UPDATE ON public.dre_line_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_dre_line_configurations_updated_at();