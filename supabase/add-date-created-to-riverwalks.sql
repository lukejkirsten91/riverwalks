-- Add date_created field to river_walks table
-- This will track when the river walk record was created, separate from the actual walk date

ALTER TABLE river_walks 
ADD COLUMN IF NOT EXISTS date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to set date_created to created_at if it exists, or current time
UPDATE river_walks 
SET date_created = COALESCE(created_at, NOW()) 
WHERE date_created IS NULL;

-- Add an index for better performance when sorting by date_created
CREATE INDEX IF NOT EXISTS idx_river_walks_date_created ON river_walks(date_created);

-- Add a comment to document the purpose of this field
COMMENT ON COLUMN river_walks.date_created IS 'When this river walk record was created in the system (separate from the actual walk date)';