-- Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem criar seu próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Criar tabela de arquivos OFX
CREATE TABLE IF NOT EXISTS public.ofx_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  bank_name TEXT,
  account_id TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ofx_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios arquivos OFX"
  ON public.ofx_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios arquivos OFX"
  ON public.ofx_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios arquivos OFX"
  ON public.ofx_files FOR DELETE
  USING (auth.uid() = user_id);

-- Criar tabela de transações OFX
CREATE TABLE IF NOT EXISTS public.ofx_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ofx_file_id UUID REFERENCES public.ofx_files(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
  bank_name TEXT,
  classification TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ofx_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias transações OFX"
  ON public.ofx_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias transações OFX"
  ON public.ofx_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias transações OFX"
  ON public.ofx_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias transações OFX"
  ON public.ofx_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Criar tabela de arquivos XML (NF-e)
CREATE TABLE IF NOT EXISTS public.xml_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  nf_number TEXT,
  nf_date DATE,
  total_value DECIMAL(15,2),
  status TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.xml_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios arquivos XML"
  ON public.xml_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios arquivos XML"
  ON public.xml_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios arquivos XML"
  ON public.xml_files FOR DELETE
  USING (auth.uid() = user_id);

-- Criar tabela de lançamentos de fluxo de caixa
CREATE TABLE IF NOT EXISTS public.cash_flow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  category TEXT,
  entry_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios lançamentos"
  ON public.cash_flow_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios lançamentos"
  ON public.cash_flow_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios lançamentos"
  ON public.cash_flow_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios lançamentos"
  ON public.cash_flow_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para melhor performance
CREATE INDEX idx_ofx_transactions_user_date ON public.ofx_transactions(user_id, transaction_date);
CREATE INDEX idx_ofx_transactions_file ON public.ofx_transactions(ofx_file_id);
CREATE INDEX idx_xml_files_user_date ON public.xml_files(user_id, nf_date);
CREATE INDEX idx_cash_flow_user_date ON public.cash_flow_entries(user_id, entry_date);