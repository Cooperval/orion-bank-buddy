-- Create function to estimate storage size per company
CREATE OR REPLACE FUNCTION public.calculate_company_storage_size(company_uuid uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_size bigint := 0;
  transactions_size bigint := 0;
  nfe_docs_size bigint := 0;
  nfe_items_size bigint := 0;
  classifications_size bigint := 0;
  future_entries_size bigint := 0;
  budget_size bigint := 0;
  other_tables_size bigint := 0;
BEGIN
  -- Estimate transactions table size (avg 500 bytes per row)
  SELECT COUNT(*) * 500 INTO transactions_size
  FROM transactions
  WHERE company_id = company_uuid;
  
  -- Estimate NFe documents (with XML content - larger, avg 10KB per doc)
  SELECT COUNT(*) * 10240 INTO nfe_docs_size
  FROM nfe_documents
  WHERE company_id = company_uuid;
  
  -- Estimate NFe items (avg 300 bytes per item)
  SELECT COUNT(ni.*) * 300 INTO nfe_items_size
  FROM nfe_items ni
  JOIN nfe_documents nd ON ni.nfe_document_id = nd.id
  WHERE nd.company_id = company_uuid;
  
  -- Estimate transaction classifications (avg 200 bytes)
  SELECT COUNT(tc.*) * 200 INTO classifications_size
  FROM transaction_classifications tc
  JOIN transactions t ON tc.transaction_id = t.id
  WHERE t.company_id = company_uuid;
  
  -- Estimate future entries (avg 400 bytes)
  SELECT COUNT(*) * 400 INTO future_entries_size
  FROM future_entries
  WHERE company_id = company_uuid;
  
  -- Estimate budget categories (avg 300 bytes)
  SELECT COUNT(*) * 300 INTO budget_size
  FROM budget_categories
  WHERE company_id = company_uuid;
  
  -- Estimate other tables (banks, commitments, etc - avg 250 bytes each)
  SELECT (
    (SELECT COUNT(*) FROM banks WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM commitments WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM commitment_groups WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM commitment_types WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM classification_rules WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM cfop_classifications WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM dre_line_configurations WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM employees WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM financial_metrics WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM products WHERE company_id = company_uuid) +
    (SELECT COUNT(*) FROM ofx_uploads WHERE company_id = company_uuid)
  ) * 250 INTO other_tables_size;
  
  total_size := transactions_size + nfe_docs_size + nfe_items_size + 
                classifications_size + future_entries_size + budget_size + 
                other_tables_size;
  
  RETURN total_size;
END;
$$;