-- Add new fields to sites table for enhanced site management
ALTER TABLE sites ADD COLUMN IF NOT EXISTS weather_conditions TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS land_use TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS units TEXT DEFAULT 'm';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS sedimentation_photo_url TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS sedimentation_data JSONB;

-- Add constraints
ALTER TABLE sites ADD CONSTRAINT check_units CHECK (units IN ('m', 'cm', 'mm', 'ft'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sites_units ON sites(units);
CREATE INDEX IF NOT EXISTS idx_sites_sedimentation_data ON sites USING GIN (sedimentation_data);

-- Update RLS policies to include new fields (they should inherit from existing policies)
-- No additional RLS changes needed as the table already has proper policies