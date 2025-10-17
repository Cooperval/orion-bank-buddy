-- Create table for future financial entries (accounts payable/receivable)
CREATE TABLE public.future_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('payable', 'receivable')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'received', 'overdue')),
  commitment_id UUID,
  commitment_group_id UUID,
  commitment_type_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.future_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage future entries of their companies" 
ON public.future_entries 
FOR ALL 
USING (user_has_demo_access());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_future_entries_updated_at
BEFORE UPDATE ON public.future_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();