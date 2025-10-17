-- Add ofx_upload_id column to transactions table to link transactions to their OFX upload
ALTER TABLE public.transactions 
ADD COLUMN ofx_upload_id uuid REFERENCES public.ofx_uploads(id) ON DELETE CASCADE;

-- Create index for better performance on queries
CREATE INDEX idx_transactions_ofx_upload_id ON public.transactions(ofx_upload_id);

-- Update existing transactions to link them to ofx_uploads based on bank_id and date proximity
-- This is a best-effort migration for existing data
UPDATE public.transactions 
SET ofx_upload_id = (
  SELECT ofx_uploads.id 
  FROM public.ofx_uploads 
  WHERE ofx_uploads.bank_id = transactions.bank_id 
    AND ofx_uploads.company_id = transactions.company_id
    AND DATE(ofx_uploads.upload_date) <= transactions.transaction_date
  ORDER BY ofx_uploads.upload_date DESC 
  LIMIT 1
)
WHERE ofx_upload_id IS NULL;