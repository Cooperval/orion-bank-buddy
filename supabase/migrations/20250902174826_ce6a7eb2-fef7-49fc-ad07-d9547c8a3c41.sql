-- Create enum for transaction categories
CREATE TYPE transaction_category AS ENUM (
    'receita_operacional',
    'receita_financeira', 
    'custo_operacional',
    'despesa_administrativa',
    'despesa_comercial',
    'investimento',
    'outros'
);

-- Create transaction classifications table
CREATE TABLE public.transaction_classifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    category transaction_category NOT NULL,
    custom_category TEXT,
    classified_by UUID REFERENCES auth.users(id),
    classification_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(transaction_id)
);

-- Create classification rules table for auto-classification
CREATE TABLE public.classification_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    rule_name TEXT NOT NULL,
    description_contains TEXT NOT NULL,
    category transaction_category NOT NULL,
    custom_category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_classifications
CREATE POLICY "Users can manage transaction classifications of their companies" 
ON public.transaction_classifications 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.transactions t 
        WHERE t.id = transaction_classifications.transaction_id 
        AND user_has_demo_access()
    )
);

-- RLS Policies for classification_rules
CREATE POLICY "Users can manage classification rules of their companies" 
ON public.classification_rules 
FOR ALL 
USING (user_has_demo_access());

-- Create triggers for updated_at
CREATE TRIGGER update_transaction_classifications_updated_at
    BEFORE UPDATE ON public.transaction_classifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classification_rules_updated_at
    BEFORE UPDATE ON public.classification_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_transaction_classifications_transaction_id ON public.transaction_classifications(transaction_id);
CREATE INDEX idx_classification_rules_company_id ON public.classification_rules(company_id);
CREATE INDEX idx_classification_rules_description_contains ON public.classification_rules(description_contains);