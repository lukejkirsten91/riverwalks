-- Add archived field to river_walks table
-- Run this SQL in your Supabase dashboard to add archive functionality

ALTER TABLE river_walks 
ADD COLUMN archived BOOLEAN DEFAULT FALSE;

-- Create index for better performance when filtering archived/non-archived items
CREATE INDEX idx_river_walks_archived ON river_walks(user_id, archived);