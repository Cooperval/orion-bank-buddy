-- Remove the default constraint first
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Update existing roles to the new values
UPDATE public.profiles 
SET role = 'admin'::app_role
WHERE role = 'owner'::app_role;

UPDATE public.profiles 
SET role = 'gestor'::app_role  
WHERE role = 'manager'::app_role;

UPDATE public.profiles 
SET role = 'operador'::app_role
WHERE role = 'accountant'::app_role;

-- Create new enum type
CREATE TYPE public.app_role_new AS ENUM ('admin', 'operador', 'gestor');

-- Update the column type
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role_new 
USING role::text::public.app_role_new;

-- Drop old enum and rename new one
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Set new default
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'operador'::app_role;

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