-- Add commitment_type_id column to commitment_groups table
ALTER TABLE commitment_groups 
ADD COLUMN commitment_type_id UUID REFERENCES commitment_types(id);

-- Create index for better performance
CREATE INDEX idx_commitment_groups_type ON commitment_groups(commitment_type_id);

-- Add comment explaining the column
COMMENT ON COLUMN commitment_groups.commitment_type_id IS 'Links group to a specific commitment type, creating Type -> Group -> Commitment hierarchy';