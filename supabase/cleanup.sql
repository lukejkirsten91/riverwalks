-- Drop existing tables if they exist
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS river_walks;
DROP FUNCTION IF EXISTS get_tables();

-- Create river_walks table
CREATE TABLE river_walks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  country TEXT NOT NULL DEFAULT 'UK',
  county TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create RLS policies
ALTER TABLE river_walks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own river walks
CREATE POLICY "Users can view their own river walks" 
ON river_walks FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own river walks
CREATE POLICY "Users can insert their own river walks" 
ON river_walks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own river walks
CREATE POLICY "Users can update their own river walks" 
ON river_walks FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own river walks
CREATE POLICY "Users can delete their own river walks" 
ON river_walks FOR DELETE 
USING (auth.uid() = user_id);