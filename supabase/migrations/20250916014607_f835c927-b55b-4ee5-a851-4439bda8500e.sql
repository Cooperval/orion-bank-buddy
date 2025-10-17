-- Add company_id column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
    ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id);
  END IF;
END $$;

-- Migrate existing data from company_members to profiles (only if data hasn't been migrated yet)
UPDATE public.profiles 
SET company_id = cm.company_id
FROM public.company_members cm 
WHERE profiles.user_id = cm.user_id AND profiles.company_id IS NULL;

-- Drop all policies that depend on company_members table
DROP POLICY IF EXISTS "Company owners can update company info" ON public.companies;
DROP POLICY IF EXISTS "Users can view company members of their companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they belong to" ON public.companies;

-- Drop the company_members table
DROP TABLE IF EXISTS public.company_members CASCADE;

-- Create policies using profiles table
CREATE POLICY "Users can view their companies" ON public.companies
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