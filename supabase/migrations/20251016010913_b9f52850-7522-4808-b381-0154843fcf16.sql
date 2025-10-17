-- 1. Tornar company_id NULLABLE nas tabelas
ALTER TABLE commitment_types ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE commitment_groups ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE commitments ALTER COLUMN company_id DROP NOT NULL;

-- 2. Atualizar políticas RLS para commitment_types
DROP POLICY IF EXISTS "Users can view commitment types of their companies" ON commitment_types;
CREATE POLICY "Users can view commitment types of their companies or universal"
  ON commitment_types FOR SELECT
  USING (company_id IS NULL OR user_has_company_access_via_profile(company_id));

DROP POLICY IF EXISTS "Users can insert commitment types in their companies" ON commitment_types;
CREATE POLICY "Users can insert commitment types"
  ON commitment_types FOR INSERT
  WITH CHECK (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users can update commitment types of their companies" ON commitment_types;
CREATE POLICY "Users can update commitment types"
  ON commitment_types FOR UPDATE
  USING (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users can delete commitment types of their companies" ON commitment_types;
CREATE POLICY "Users can delete commitment types"
  ON commitment_types FOR DELETE
  USING (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

-- 3. Atualizar políticas RLS para commitment_groups
DROP POLICY IF EXISTS "Users can view commitment groups of their companies" ON commitment_groups;
CREATE POLICY "Users can view commitment groups of their companies or universal"
  ON commitment_groups FOR SELECT
  USING (company_id IS NULL OR user_has_company_access_via_profile(company_id));

DROP POLICY IF EXISTS "Users can insert commitment groups in their companies" ON commitment_groups;
CREATE POLICY "Users can insert commitment groups"
  ON commitment_groups FOR INSERT
  WITH CHECK (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users can update commitment groups of their companies" ON commitment_groups;
CREATE POLICY "Users can update commitment groups"
  ON commitment_groups FOR UPDATE
  USING (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users can delete commitment groups of their companies" ON commitment_groups;
CREATE POLICY "Users can delete commitment groups"
  ON commitment_groups FOR DELETE
  USING (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

-- 4. Atualizar políticas RLS para commitments
DROP POLICY IF EXISTS "Users can view commitments of their companies" ON commitments;
CREATE POLICY "Users can view commitments of their companies or universal"
  ON commitments FOR SELECT
  USING (company_id IS NULL OR user_has_company_access_via_profile(company_id));

DROP POLICY IF EXISTS "Users can insert commitments in their companies" ON commitments;
CREATE POLICY "Users can insert commitments"
  ON commitments FOR INSERT
  WITH CHECK (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users can update commitments of their companies" ON commitments;
CREATE POLICY "Users can update commitments"
  ON commitments FOR UPDATE
  USING (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users can delete commitments of their companies" ON commitments;
CREATE POLICY "Users can delete commitments"
  ON commitments FOR DELETE
  USING (
    (company_id IS NOT NULL AND user_has_company_access_via_profile(company_id))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'))
  );

-- 5. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_commitment_types_company_null 
  ON commitment_types(is_active) WHERE company_id IS NULL;
  
CREATE INDEX IF NOT EXISTS idx_commitment_groups_company_null 
  ON commitment_groups(is_active) WHERE company_id IS NULL;
  
CREATE INDEX IF NOT EXISTS idx_commitments_company_null 
  ON commitments(is_active) WHERE company_id IS NULL;