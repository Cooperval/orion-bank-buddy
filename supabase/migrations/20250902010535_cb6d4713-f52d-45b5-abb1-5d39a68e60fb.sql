-- Create tables for OFX financial transactions
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  agency TEXT,
  account_number TEXT NOT NULL,
  account_type TEXT DEFAULT 'checking',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, bank_code, account_number)
);

-- Enable RLS for banks
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Create policies for banks
CREATE POLICY "Users can manage banks of their companies" 
ON public.banks 
FOR ALL 
USING (user_has_demo_access());

-- Create transactions table for OFX data
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  balance NUMERIC(15,2),
  fitid TEXT, -- OFX Financial Institution Transaction ID for duplicate detection
  ofx_import_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can manage transactions of their companies" 
ON public.transactions 
FOR ALL 
USING (user_has_demo_access());

-- Create OFX uploads tracking table
CREATE TABLE public.ofx_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  bank_id UUID REFERENCES public.banks(id),
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transactions_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processing', 'processed', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for ofx_uploads
ALTER TABLE public.ofx_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for ofx_uploads
CREATE POLICY "Users can manage ofx uploads of their companies" 
ON public.ofx_uploads 
FOR ALL 
USING (user_has_demo_access());

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_banks_updated_at
BEFORE UPDATE ON public.banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ofx_uploads_updated_at
BEFORE UPDATE ON public.ofx_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_transactions_company_date ON public.transactions(company_id, transaction_date);
CREATE INDEX idx_transactions_bank_id ON public.transactions(bank_id);
CREATE INDEX idx_transactions_fitid ON public.transactions(fitid) WHERE fitid IS NOT NULL;
CREATE INDEX idx_banks_company_id ON public.banks(company_id);

-- Insert sample bank data for demo
INSERT INTO public.banks (company_id, bank_code, bank_name, agency, account_number, account_type)
SELECT 
  id,
  '001',
  'Banco do Brasil',
  '1234-5',
  '12345-6',
  'checking'
FROM public.companies
WHERE name = 'Acme Corp'
LIMIT 1;

INSERT INTO public.banks (company_id, bank_code, bank_name, agency, account_number, account_type)
SELECT 
  id,
  '341',
  'Itaú Unibanco',
  '0567',
  '98765-4',
  'savings'
FROM public.companies
WHERE name = 'Acme Corp'
LIMIT 1;