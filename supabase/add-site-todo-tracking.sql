-- Add todo tracking fields to sites table
-- This tracks the completion status of the 4 main tasks for each site

ALTER TABLE sites ADD COLUMN IF NOT EXISTS todo_site_info_status TEXT DEFAULT 'not_started' CHECK (todo_site_info_status IN ('not_started', 'in_progress', 'complete'));
ALTER TABLE sites ADD COLUMN IF NOT EXISTS todo_cross_section_status TEXT DEFAULT 'not_started' CHECK (todo_cross_section_status IN ('not_started', 'in_progress', 'complete'));
ALTER TABLE sites ADD COLUMN IF NOT EXISTS todo_velocity_status TEXT DEFAULT 'not_started' CHECK (todo_velocity_status IN ('not_started', 'in_progress', 'complete'));
ALTER TABLE sites ADD COLUMN IF NOT EXISTS todo_sediment_status TEXT DEFAULT 'not_started' CHECK (todo_sediment_status IN ('not_started', 'in_progress', 'complete'));

-- Add velocity measurement fields to sites table
-- These will be used in the new Velocity todo form
ALTER TABLE sites ADD COLUMN IF NOT EXISTS velocity_measurement_count INTEGER DEFAULT 3;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS velocity_data JSONB;

-- Add index for faster queries on todo statuses
CREATE INDEX IF NOT EXISTS idx_sites_todo_statuses ON sites (todo_site_info_status, todo_cross_section_status, todo_velocity_status, todo_sediment_status);

-- Comment for documentation
COMMENT ON COLUMN sites.todo_site_info_status IS 'Status of Site Info todo: not_started, in_progress, complete';
COMMENT ON COLUMN sites.todo_cross_section_status IS 'Status of Cross-Sectional Area todo: not_started, in_progress, complete';
COMMENT ON COLUMN sites.todo_velocity_status IS 'Status of Velocity todo: not_started, in_progress, complete';
COMMENT ON COLUMN sites.todo_sediment_status IS 'Status of Sediment Analysis todo: not_started, in_progress, complete';
COMMENT ON COLUMN sites.velocity_measurement_count IS 'Number of velocity measurements to take at this site';
COMMENT ON COLUMN sites.velocity_data IS 'JSON data containing velocity measurements and related data';