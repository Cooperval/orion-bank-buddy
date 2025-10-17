-- First, add company_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Migrate existing data from company_members to profiles
UPDATE public.profiles 
SET company_id = cm.company_id
FROM public.company_members cm 
WHERE profiles.user_id = cm.user_id;

-- Drop the company_members table
DROP TABLE public.company_members;

-- Update RLS policies to use profiles table instead of company_members

-- Drop old policies that referenced company_members
DROP POLICY "Users can view company members of their companies" ON public.companies;

-- Create new policy for companies based on profiles
CREATE POLICY "Users can view companies they belong to" ON public.companies
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE company_id = companies.id 
    AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Update function to check company access based on profiles
CREATE OR REPLACE FUNCTION public.user_has_company_access(company_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE company_id = company_uuid
      AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$function$;