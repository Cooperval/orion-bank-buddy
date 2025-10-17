-- Add CFOP field to nfe_documents table
ALTER TABLE public.nfe_documents 
ADD COLUMN cfop TEXT;