-- Add photos, coordinates, and notes functionality
-- Run this SQL in your Supabase dashboard to add new features

-- Add notes field to river_walks table
ALTER TABLE river_walks 
ADD COLUMN notes TEXT;

-- Add coordinates, photo, and notes fields to sites table
ALTER TABLE sites 
ADD COLUMN latitude DECIMAL(10,8),
ADD COLUMN longitude DECIMAL(11,8),
ADD COLUMN photo_url TEXT,
ADD COLUMN notes TEXT;

-- Create index for better performance when searching by coordinates
CREATE INDEX idx_sites_coordinates ON sites(latitude, longitude);

-- Create a table for storing photo metadata (for future expansion)
CREATE TABLE site_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  filename TEXT,
  file_size INTEGER,
  content_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one photo per site for now
  UNIQUE(site_id)
);

-- Enable Row Level Security for site_photos
ALTER TABLE site_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_photos table
CREATE POLICY "Users can view their own site photos" 
ON site_photos FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN river_walks ON river_walks.id = sites.river_walk_id
    WHERE sites.id = site_photos.site_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own site photos" 
ON site_photos FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN river_walks ON river_walks.id = sites.river_walk_id
    WHERE sites.id = site_photos.site_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own site photos" 
ON site_photos FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN river_walks ON river_walks.id = sites.river_walk_id
    WHERE sites.id = site_photos.site_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own site photos" 
ON site_photos FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN river_walks ON river_walks.id = sites.river_walk_id
    WHERE sites.id = site_photos.site_id 
    AND river_walks.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_site_photos_site_id ON site_photos(site_id);