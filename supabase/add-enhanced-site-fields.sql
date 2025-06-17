-- Add new fields to sites table for enhanced site management
ALTER TABLE sites ADD COLUMN IF NOT EXISTS weather_conditions TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS land_use TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS depth_units TEXT DEFAULT 'm';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS sedimentation_units TEXT DEFAULT 'mm';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS sedimentation_photo_url TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS sedimentation_data JSONB;

-- Add constraints
ALTER TABLE sites ADD CONSTRAINT check_depth_units CHECK (depth_units IN ('m', 'cm', 'mm', 'ft', 'in', 'yd'));
ALTER TABLE sites ADD CONSTRAINT check_sedimentation_units CHECK (sedimentation_units IN ('m', 'cm', 'mm', 'ft', 'in', 'yd'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sites_depth_units ON sites(depth_units);
CREATE INDEX IF NOT EXISTS idx_sites_sedimentation_units ON sites(sedimentation_units);
CREATE INDEX IF NOT EXISTS idx_sites_sedimentation_data ON sites USING GIN (sedimentation_data);

-- Update RLS policies to include new fields (they should inherit from existing policies)
-- No additional RLS changes needed as the table already has proper policies