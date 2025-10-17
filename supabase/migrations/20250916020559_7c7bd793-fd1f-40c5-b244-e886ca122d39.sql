-- First check if app_role type exists and recreate it
DO $$
BEGIN
  -- Drop the type if it exists
  DROP TYPE IF EXISTS public.app_role CASCADE;
  
  -- Create the enum with the correct values
  CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'gestor');
END $$;

-- Update the profiles table to use the correct type
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role 
USING role::text::public.app_role;

-- Set the default value
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'operador'::public.app_role;

-- Recreate the trigger function with the correct enum type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'operador'::public.app_role
  );
  RETURN NEW;
END;
$function$;