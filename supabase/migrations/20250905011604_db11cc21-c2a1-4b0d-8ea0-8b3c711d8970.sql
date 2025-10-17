-- Update schema to make commitment types independent and link commitments to types

-- First, remove the foreign key constraint from commitment_types.commitment_id
ALTER TABLE commitment_types DROP CONSTRAINT IF EXISTS commitment_types_commitment_id_fkey;

-- Make commitment_id nullable in commitment_types (so types can exist independently)
ALTER TABLE commitment_types ALTER COLUMN commitment_id DROP NOT NULL;

-- Add commitment_type_id column to commitments table
ALTER TABLE commitments ADD COLUMN commitment_type_id UUID REFERENCES commitment_types(id);

-- Update existing data: for each commitment, link it to any existing type that was linked to it
-- This is a simple approach - in production you might want more sophisticated data migration
UPDATE commitments 
SET commitment_type_id = (
  SELECT ct.id 
  FROM commitment_types ct 
  WHERE ct.commitment_id = commitments.id 
  LIMIT 1
);

-- Now we can drop the commitment_id column from commitment_types since types are now independent
ALTER TABLE commitment_types DROP COLUMN commitment_id;