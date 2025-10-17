-- Create commitment groups table (Grupo de Empenho)
CREATE TABLE public.commitment_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, name)
);

-- Create commitments table (Empenho)
CREATE TABLE public.commitments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    commitment_group_id UUID NOT NULL REFERENCES public.commitment_groups(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(commitment_group_id, name)
);

-- Create commitment types table (Tipo de Empenho)
CREATE TABLE public.commitment_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    commitment_id UUID NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(commitment_id, name)
);

-- Update transaction_classifications to use the new hierarchy
ALTER TABLE public.transaction_classifications 
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS custom_category,
ADD COLUMN commitment_group_id UUID REFERENCES public.commitment_groups(id),
ADD COLUMN commitment_id UUID REFERENCES public.commitments(id),
ADD COLUMN commitment_type_id UUID REFERENCES public.commitment_types(id);

-- Update classification_rules to use the new hierarchy
ALTER TABLE public.classification_rules 
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS custom_category,
ADD COLUMN commitment_group_id UUID REFERENCES public.commitment_groups(id),
ADD COLUMN commitment_id UUID REFERENCES public.commitments(id),
ADD COLUMN commitment_type_id UUID REFERENCES public.commitment_types(id);

-- Enable RLS for new tables
ALTER TABLE public.commitment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for commitment_groups
CREATE POLICY "Users can manage commitment groups of their companies" 
ON public.commitment_groups 
FOR ALL 
USING (user_has_demo_access());

-- Create RLS policies for commitments
CREATE POLICY "Users can manage commitments of their companies" 
ON public.commitments 
FOR ALL 
USING (user_has_demo_access());

-- Create RLS policies for commitment_types
CREATE POLICY "Users can manage commitment types of their companies" 
ON public.commitment_types 
FOR ALL 
USING (user_has_demo_access());

-- Create triggers for updated_at columns
CREATE TRIGGER update_commitment_groups_updated_at
    BEFORE UPDATE ON public.commitment_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commitments_updated_at
    BEFORE UPDATE ON public.commitments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commitment_types_updated_at
    BEFORE UPDATE ON public.commitment_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_commitments_group_id ON public.commitments(commitment_group_id);
CREATE INDEX idx_commitment_types_commitment_id ON public.commitment_types(commitment_id);
CREATE INDEX idx_transaction_classifications_hierarchy ON public.transaction_classifications(commitment_group_id, commitment_id, commitment_type_id);
CREATE INDEX idx_classification_rules_hierarchy ON public.classification_rules(commitment_group_id, commitment_id, commitment_type_id);