-- Remove orphaned banks that have no OFX uploads and no transactions
DELETE FROM banks 
WHERE id IN (
  SELECT b.id 
  FROM banks b
  LEFT JOIN ofx_uploads ou ON b.id = ou.bank_id
  LEFT JOIN transactions t ON b.id = t.bank_id
  WHERE ou.id IS NULL AND t.id IS NULL
);