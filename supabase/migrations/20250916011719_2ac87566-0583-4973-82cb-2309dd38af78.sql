-- Update the app_role enum to include the new roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'operador';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'gestor';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';