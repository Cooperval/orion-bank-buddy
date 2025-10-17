-- Fix search path for security
CREATE OR REPLACE FUNCTION cleanup_orphaned_banks()
RETURNS void AS $$
BEGIN
  DELETE FROM banks 
  WHERE id IN (
    SELECT b.id 
    FROM banks b
    LEFT JOIN ofx_uploads ou ON b.id = ou.bank_id
    LEFT JOIN transactions t ON b.id = t.bank_id
    WHERE ou.id IS NULL AND t.id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;