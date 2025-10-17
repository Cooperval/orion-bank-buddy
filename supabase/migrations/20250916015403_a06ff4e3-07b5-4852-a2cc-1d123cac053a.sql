-- Drop all policies that depend on the role column
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Company owners can update company info" ON public.companies;

-- Remove the default constraint
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Update existing roles
UPDATE public.profiles 
SET role = 'admin'::app_role
WHERE role::text = 'owner';

UPDATE public.profiles 
SET role = 'gestor'::app_role  
WHERE role::text = 'manager';

UPDATE public.profiles 
SET role = 'operador'::app_role
WHERE role::text = 'accountant';

-- Create new enum
CREATE TYPE public.app_role_new AS ENUM ('admin', 'operador', 'gestor');

-- Change column type
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role_new 
USING role::text::public.app_role_new;

-- Drop old enum and rename
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Set new default
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'operador'::app_role;

-- Recreate policies with new enum values
CREATE POLICY "Admins can insert companies" ON public.companies
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can delete companies" ON public.companies
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

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
    AND role = 'admin'::app_role
  )
);

-- Update trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'operador'::app_role
  );
  RETURN NEW;
END;
$function$;