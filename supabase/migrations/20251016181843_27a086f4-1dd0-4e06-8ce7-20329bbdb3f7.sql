-- Atualizar commitment_type_id dos grupos baseado nas naturezas existentes
UPDATE commitment_groups cg
SET commitment_type_id = (
  SELECT c.commitment_type_id
  FROM commitments c
  WHERE c.commitment_group_id = cg.id
    AND c.is_active = true
    AND c.commitment_type_id IS NOT NULL
  GROUP BY c.commitment_type_id
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
WHERE cg.commitment_type_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM commitments c 
    WHERE c.commitment_group_id = cg.id 
      AND c.commitment_type_id IS NOT NULL
  );