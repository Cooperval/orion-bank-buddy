-- Drop existing policy for classification_rules
DROP POLICY IF EXISTS "Users can manage classification rules of their companies" ON public.classification_rules;

-- Create RLS policies for classification_rules
CREATE POLICY "Users can view classification rules of their companies"
ON public.classification_rules
FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert classification rules in their companies"
ON public.classification_rules
FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update classification rules of their companies"
ON public.classification_rules
FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete classification rules of their companies"
ON public.classification_rules
FOR DELETE
USING (user_has_company_access_via_profile(company_id));