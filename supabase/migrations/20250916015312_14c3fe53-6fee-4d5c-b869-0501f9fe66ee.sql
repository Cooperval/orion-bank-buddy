-- First, update all existing roles that need to be converted
UPDATE public.profiles 
SET role = 'admin'::app_role
WHERE role = 'owner'::app_role;

UPDATE public.profiles 
SET role = 'gestor'::app_role  
WHERE role = 'manager'::app_role;

UPDATE public.profiles 
SET role = 'operador'::app_role
WHERE role = 'accountant'::app_role;

-- Create a new enum with only the required roles
CREATE TYPE public.app_role_new AS ENUM ('admin', 'operador', 'gestor');

-- Update the column to use the new enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role_new 
USING role::text::public.app_role_new;

-- Drop the old enum and rename the new one
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Set the default value to 'operador'
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'operador'::app_role;

-- Update the trigger function to use 'operador' as default
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