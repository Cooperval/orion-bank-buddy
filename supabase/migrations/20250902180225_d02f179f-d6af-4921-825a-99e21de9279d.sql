-- Insert default commitment groups with valid UUIDs
INSERT INTO public.commitment_groups (id, company_id, name, description, color) VALUES
(gen_random_uuid(), gen_random_uuid(), 'Receitas', 'Todas as fontes de receita da empresa', '#10B981'),
(gen_random_uuid(), gen_random_uuid(), 'Despesas', 'Gastos operacionais e administrativos', '#EF4444'),
(gen_random_uuid(), gen_random_uuid(), 'Investimentos', 'Investimentos em ativos e melhorias', '#3B82F6'),
(gen_random_uuid(), gen_random_uuid(), 'Transferências', 'Movimentações entre contas', '#6B7280');

-- Insert default commitments for each group
WITH group_data AS (
    SELECT id as group_id, name as group_name FROM public.commitment_groups
)
INSERT INTO public.commitments (commitment_group_id, company_id, name, description) 
SELECT 
    gd.group_id,
    gen_random_uuid(),
    commitment_name,
    commitment_desc
FROM group_data gd
CROSS JOIN (
    VALUES 
        ('Receitas', 'Receita Operacional', 'Receitas das atividades principais'),
        ('Receitas', 'Receita Financeira', 'Juros, rendimentos e aplicações'),
        ('Despesas', 'Pessoal', 'Gastos com funcionários e encargos'),
        ('Despesas', 'Manutenção', 'Manutenção de equipamentos e instalações'),
        ('Despesas', 'Insumos', 'Matéria-prima e materiais de consumo'),
        ('Despesas', 'Tributos', 'Impostos, taxas e contribuições'),
        ('Despesas', 'Administrativas', 'Despesas administrativas gerais'),
        ('Despesas', 'Comerciais', 'Despesas de vendas e marketing'),
        ('Investimentos', 'Equipamentos', 'Aquisição de máquinas e equipamentos'),
        ('Investimentos', 'Infraestrutura', 'Melhorias em instalações e infraestrutura'),
        ('Investimentos', 'Tecnologia', 'Investimentos em TI e software')
) AS v(group_name, commitment_name, commitment_desc)
WHERE gd.group_name = v.group_name;

-- Insert default commitment types
WITH commitment_data AS (
    SELECT c.id as commitment_id, c.name as commitment_name 
    FROM public.commitments c
)
INSERT INTO public.commitment_types (commitment_id, company_id, name, description) 
SELECT 
    cd.commitment_id,
    gen_random_uuid(),
    type_name,
    type_desc
FROM commitment_data cd
CROSS JOIN (
    VALUES 
        ('Manutenção', 'Peças', 'Peças e componentes para manutenção'),
        ('Manutenção', 'Serviços', 'Serviços de manutenção terceirizados'),
        ('Manutenção', 'Terceiros', 'Mão de obra terceirizada para manutenção'),
        ('Pessoal', 'Salários', 'Salários e ordenados'),
        ('Pessoal', 'Encargos', 'INSS, FGTS e outros encargos'),
        ('Pessoal', 'Benefícios', 'Vale alimentação, plano de saúde, etc.'),
        ('Receita Operacional', 'Vendas', 'Receitas de vendas de produtos/serviços'),
        ('Receita Operacional', 'Prestação de Serviços', 'Receitas de prestação de serviços'),
        ('Receita Financeira', 'Juros', 'Juros recebidos'),
        ('Receita Financeira', 'Rendimentos', 'Rendimentos de aplicações')
) AS v(commitment_name, type_name, type_desc)
WHERE cd.commitment_name = v.commitment_name;