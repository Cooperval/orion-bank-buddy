-- Create sample company data
INSERT INTO public.companies (id, name, segment) VALUES 
('11111111-1111-1111-1111-111111111111', 'Profit Plot Demo', 'technology');

-- Create sample financial metrics data for the last 12 months (without calculated columns)
INSERT INTO public.financial_metrics (company_id, month_year, revenue, costs, expenses, average_ticket) VALUES
('11111111-1111-1111-1111-111111111111', '2024-01-01', 85000, 45000, 22000, 450),
('11111111-1111-1111-1111-111111111111', '2024-02-01', 92000, 48000, 23000, 460),
('11111111-1111-1111-1111-111111111111', '2024-03-01', 88000, 46000, 24000, 440),
('11111111-1111-1111-1111-111111111111', '2024-04-01', 95000, 50000, 25000, 475),
('11111111-1111-1111-1111-111111111111', '2024-05-01', 102000, 52000, 26000, 510),
('11111111-1111-1111-1111-111111111111', '2024-06-01', 98000, 51000, 25500, 490),
('11111111-1111-1111-1111-111111111111', '2024-07-01', 105000, 54000, 27000, 525),
('11111111-1111-1111-1111-111111111111', '2024-08-01', 110000, 56000, 28000, 550),
('11111111-1111-1111-1111-111111111111', '2024-09-01', 108000, 55000, 27500, 540),
('11111111-1111-1111-1111-111111111111', '2024-10-01', 115000, 58000, 29000, 575),
('11111111-1111-1111-1111-111111111111', '2024-11-01', 120000, 60000, 30000, 600),
('11111111-1111-1111-1111-111111111111', '2024-12-01', 125000, 62000, 31000, 625);

-- Create sample products (without margin_percentage as it's calculated)
INSERT INTO public.products (company_id, name, category, cost_price, selling_price) VALUES
('11111111-1111-1111-1111-111111111111', 'Software Premium', 'Software', 200, 800),
('11111111-1111-1111-1111-111111111111', 'Consultoria Estratégica', 'Serviços', 300, 1200),
('11111111-1111-1111-1111-111111111111', 'Plano Básico', 'Software', 150, 400),
('11111111-1111-1111-1111-111111111111', 'Treinamento Online', 'Educação', 100, 350),
('11111111-1111-1111-1111-111111111111', 'Suporte Técnico', 'Serviços', 180, 500),
('11111111-1111-1111-1111-111111111111', 'Analytics Pro', 'Software', 250, 900),
('11111111-1111-1111-1111-111111111111', 'Dashboard Enterprise', 'Software', 400, 1500),
('11111111-1111-1111-1111-111111111111', 'Integração API', 'Tecnologia', 120, 600);

-- Create sample employees (using only 'active' status)
INSERT INTO public.employees (company_id, name, position, department, monthly_cost, hire_date, status) VALUES
('11111111-1111-1111-1111-111111111111', 'João Silva', 'CEO', 'Executivo', 15000, '2023-01-15', 'active'),
('11111111-1111-1111-1111-111111111111', 'Maria Santos', 'CTO', 'Tecnologia', 12000, '2023-02-01', 'active'),
('11111111-1111-1111-1111-111111111111', 'Carlos Oliveira', 'Desenvolvedor Senior', 'Tecnologia', 8000, '2023-03-10', 'active'),
('11111111-1111-1111-1111-111111111111', 'Ana Costa', 'Designer UX/UI', 'Tecnologia', 6500, '2023-04-05', 'active'),
('11111111-1111-1111-1111-111111111111', 'Rafael Lima', 'Analista Financeiro', 'Financeiro', 5500, '2023-05-20', 'active'),
('11111111-1111-1111-1111-111111111111', 'Juliana Ferreira', 'Gerente de Vendas', 'Comercial', 7000, '2023-06-12', 'active'),
('11111111-1111-1111-1111-111111111111', 'Pedro Rocha', 'Desenvolvedor Junior', 'Tecnologia', 4500, '2023-08-01', 'active'),
('11111111-1111-1111-1111-111111111111', 'Lucia Mendes', 'Assistente Administrativo', 'Administrativo', 3500, '2023-09-15', 'active'),
('11111111-1111-1111-1111-111111111111', 'Bruno Alves', 'Especialista em Marketing', 'Marketing', 6000, '2023-10-20', 'active'),
('11111111-1111-1111-1111-111111111111', 'Camila Torres', 'Analista de Dados', 'Tecnologia', 5800, '2023-11-10', 'active');

-- Create sample budget categories for December 2024 (using valid types)
INSERT INTO public.budget_categories (company_id, name, type, budgeted_amount, actual_amount, month_year) VALUES
('11111111-1111-1111-1111-111111111111', 'Salários da Equipe', 'people', 45000, 47000, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Equipamentos e Hardware', 'materials', 8000, 7500, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Infraestrutura e Servidores', 'maintenance', 5000, 5200, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Material de Escritório', 'supplies', 2000, 1800, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Marketing e Publicidade', 'other', 10000, 9500, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Treinamento e Capacitação', 'people', 5000, 4500, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Software e Licenças', 'materials', 6000, 6200, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Manutenção de Equipamentos', 'maintenance', 3000, 2800, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Combustível e Transporte', 'supplies', 2500, 2200, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Consultorias Externas', 'other', 8000, 8500, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Seguro e Taxas', 'other', 3500, 3600, '2024-12-01'),
('11111111-1111-1111-1111-111111111111', 'Comunicação e Internet', 'maintenance', 1500, 1400, '2024-12-01');

-- Create a function to check if user has access to demo company
CREATE OR REPLACE FUNCTION public.user_has_demo_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Update RLS policies to allow demo access for authenticated users
DROP POLICY IF EXISTS "Users can manage budget categories of their companies" ON public.budget_categories;
CREATE POLICY "Users can manage budget categories of their companies" 
ON public.budget_categories 
FOR ALL
USING (user_has_demo_access());

DROP POLICY IF EXISTS "Users can view companies they belong to" ON public.companies;
CREATE POLICY "Users can view companies they belong to" 
ON public.companies 
FOR SELECT
USING (user_has_demo_access());

DROP POLICY IF EXISTS "Users can manage employees of their companies" ON public.employees;
CREATE POLICY "Users can manage employees of their companies" 
ON public.employees 
FOR ALL
USING (user_has_demo_access());

DROP POLICY IF EXISTS "Users can manage financial metrics of their companies" ON public.financial_metrics;
CREATE POLICY "Users can manage financial metrics of their companies" 
ON public.financial_metrics 
FOR ALL
USING (user_has_demo_access());

DROP POLICY IF EXISTS "Users can manage products of their companies" ON public.products;
CREATE POLICY "Users can manage products of their companies" 
ON public.products 
FOR ALL
USING (user_has_demo_access());