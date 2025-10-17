-- Delete all orphaned transactions that don't have ofx_upload_id
DELETE FROM transaction_classifications 
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE ofx_upload_id IS NULL
);

DELETE FROM transactions WHERE ofx_upload_id IS NULL;

-- Ensure foreign key constraint exists with CASCADE DELETE
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_ofx_upload_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_ofx_upload_id_fkey 
  FOREIGN KEY (ofx_upload_id) REFERENCES ofx_uploads(id) ON DELETE CASCADE;

-- Make ofx_upload_id NOT NULL to ensure all transactions are linked to an upload
ALTER TABLE transactions ALTER COLUMN ofx_upload_id SET NOT NULL;