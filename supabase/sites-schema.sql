-- Sites and Measurement Points Schema for Phase 1: Sites Foundation
-- Run this SQL in your Supabase dashboard after cleanup.sql

-- Create sites table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  river_walk_id UUID NOT NULL REFERENCES river_walks(id) ON DELETE CASCADE,
  site_number INTEGER NOT NULL,
  site_name TEXT NOT NULL,
  river_width DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure site numbers are unique within a river walk
  UNIQUE(river_walk_id, site_number)
);

-- Create measurement points table
CREATE TABLE measurement_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  point_number INTEGER NOT NULL,
  distance_from_bank DECIMAL(8,2) NOT NULL,
  depth DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure point numbers are unique within a site
  UNIQUE(site_id, point_number),
  
  -- Constraints for sensible values
  CHECK (distance_from_bank >= 0),
  CHECK (depth >= 0),
  CHECK (point_number > 0)
);

-- Enable Row Level Security
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_points ENABLE ROW LEVEL SECURITY;

-- RLS policies for sites table
CREATE POLICY "Users can view their own sites" 
ON sites FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM river_walks 
    WHERE river_walks.id = sites.river_walk_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own sites" 
ON sites FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM river_walks 
    WHERE river_walks.id = sites.river_walk_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own sites" 
ON sites FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM river_walks 
    WHERE river_walks.id = sites.river_walk_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own sites" 
ON sites FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM river_walks 
    WHERE river_walks.id = sites.river_walk_id 
    AND river_walks.user_id = auth.uid()
  )
);

-- RLS policies for measurement_points table
CREATE POLICY "Users can view their own measurement points" 
ON measurement_points FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN river_walks ON river_walks.id = sites.river_walk_id
    WHERE sites.id = measurement_points.site_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own measurement points" 
ON measurement_points FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN river_walks ON river_walks.id = sites.river_walk_id
    WHERE sites.id = measurement_points.site_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own measurement points" 
ON measurement_points FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN river_walks ON river_walks.id = sites.river_walk_id
    WHERE sites.id = measurement_points.site_id 
    AND river_walks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own measurement points" 
ON measurement_points FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM sites 
    JOIN river_walks ON river_walks.id = sites.river_walk_id
    WHERE sites.id = measurement_points.site_id 
    AND river_walks.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_sites_river_walk_id ON sites(river_walk_id);
CREATE INDEX idx_measurement_points_site_id ON measurement_points(site_id);
CREATE INDEX idx_sites_site_number ON sites(river_walk_id, site_number);
CREATE INDEX idx_measurement_points_point_number ON measurement_points(site_id, point_number);