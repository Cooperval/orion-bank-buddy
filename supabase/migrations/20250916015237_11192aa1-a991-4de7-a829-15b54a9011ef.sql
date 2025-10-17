-- First, update all existing roles to the new system
UPDATE public.profiles 
SET role = CASE 
  WHEN role = 'owner' THEN 'admin'
  WHEN role = 'manager' THEN 'gestor'
  WHEN role = 'accountant' THEN 'operador'
  ELSE role
END
WHERE role IN ('owner', 'manager', 'accountant');

-- Drop the old enum and create a new one with only the required roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'gestor');

-- Update the profiles table to use the new enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role 
USING role::public.app_role;

-- Set default role to 'operador'
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'operador'::public.app_role;

-- Update the trigger function to use 'admin' instead of 'owner'
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