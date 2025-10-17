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

-- Insert default commitment groups
INSERT INTO public.commitment_groups (company_id, name, description, color) VALUES
('demo-company-id', 'Receitas', 'Todas as fontes de receita da empresa', '#10B981'),
('demo-company-id', 'Despesas', 'Gastos operacionais e administrativos', '#EF4444'),
('demo-company-id', 'Investimentos', 'Investimentos em ativos e melhorias', '#3B82F6'),
('demo-company-id', 'Transferências', 'Movimentações entre contas', '#6B7280');

-- Insert default commitments for Receitas
INSERT INTO public.commitments (commitment_group_id, company_id, name, description) 
SELECT cg.id, 'demo-company-id', commitment_name, commitment_desc
FROM public.commitment_groups cg,
(VALUES 
    ('Receita Operacional', 'Receitas das atividades principais'),
    ('Receita Financeira', 'Juros, rendimentos e aplicações')
) AS v(commitment_name, commitment_desc)
WHERE cg.name = 'Receitas';

-- Insert default commitments for Despesas
INSERT INTO public.commitments (commitment_group_id, company_id, name, description) 
SELECT cg.id, 'demo-company-id', commitment_name, commitment_desc
FROM public.commitment_groups cg,
(VALUES 
    ('Pessoal', 'Gastos com funcionários e encargos'),
    ('Manutenção', 'Manutenção de equipamentos e instalações'),
    ('Insumos', 'Matéria-prima e materiais de consumo'),
    ('Tributos', 'Impostos, taxas e contribuições'),
    ('Administrativas', 'Despesas administrativas gerais'),
    ('Comerciais', 'Despesas de vendas e marketing')
) AS v(commitment_name, commitment_desc)
WHERE cg.name = 'Despesas';

-- Insert default commitments for Investimentos
INSERT INTO public.commitments (commitment_group_id, company_id, name, description) 
SELECT cg.id, 'demo-company-id', commitment_name, commitment_desc
FROM public.commitment_groups cg,
(VALUES 
    ('Equipamentos', 'Aquisição de máquinas e equipamentos'),
    ('Infraestrutura', 'Melhorias em instalações e infraestrutura'),
    ('Tecnologia', 'Investimentos em TI e software')
) AS v(commitment_name, commitment_desc)
WHERE cg.name = 'Investimentos';

-- Insert default commitment types for Manutenção
INSERT INTO public.commitment_types (commitment_id, company_id, name, description) 
SELECT c.id, 'demo-company-id', type_name, type_desc
FROM public.commitments c,
(VALUES 
    ('Peças', 'Peças e componentes para manutenção'),
    ('Serviços', 'Serviços de manutenção terceirizados'),
    ('Terceiros', 'Mão de obra terceirizada para manutenção')
) AS v(type_name, type_desc)
WHERE c.name = 'Manutenção';

-- Insert default commitment types for Pessoal
INSERT INTO public.commitment_types (commitment_id, company_id, name, description) 
SELECT c.id, 'demo-company-id', type_name, type_desc
FROM public.commitments c,
(VALUES 
    ('Salários', 'Salários e ordenados'),
    ('Encargos', 'INSS, FGTS e outros encargos'),
    ('Benefícios', 'Vale alimentação, plano de saúde, etc.')
) AS v(type_name, type_desc)
WHERE c.name = 'Pessoal';