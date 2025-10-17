-- Drop existing policies for commitment hierarchy tables
DROP POLICY IF EXISTS "Users can manage commitment groups of their companies" ON public.commitment_groups;
DROP POLICY IF EXISTS "Users can manage commitments of their companies" ON public.commitments;
DROP POLICY IF EXISTS "Users can manage commitment types of their companies" ON public.commitment_types;

-- Create security definer function to check company access
CREATE OR REPLACE FUNCTION public.user_has_company_access_via_profile(company_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE company_id = company_uuid
      AND user_id = auth.uid()
  )
$$;

-- Create RLS policies for commitment_groups
CREATE POLICY "Users can view commitment groups of their companies"
ON public.commitment_groups
FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert commitment groups in their companies"
ON public.commitment_groups
FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update commitment groups of their companies"
ON public.commitment_groups
FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete commitment groups of their companies"
ON public.commitment_groups
FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- Create RLS policies for commitments
CREATE POLICY "Users can view commitments of their companies"
ON public.commitments
FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert commitments in their companies"
ON public.commitments
FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update commitments of their companies"
ON public.commitments
FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete commitments of their companies"
ON public.commitments
FOR DELETE
USING (user_has_company_access_via_profile(company_id));

-- Create RLS policies for commitment_types
CREATE POLICY "Users can view commitment types of their companies"
ON public.commitment_types
FOR SELECT
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can insert commitment types in their companies"
ON public.commitment_types
FOR INSERT
WITH CHECK (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can update commitment types of their companies"
ON public.commitment_types
FOR UPDATE
USING (user_has_company_access_via_profile(company_id));

CREATE POLICY "Users can delete commitment types of their companies"
ON public.commitment_types
FOR DELETE
USING (user_has_company_access_via_profile(company_id));