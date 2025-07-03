-- Create demo river walk and sites for interactive preview
-- This will create a sample river study that users can interact with

-- First, get luke.kirsten@gmail.com user ID
-- This query helps identify the user ID for the demo data
-- SELECT id FROM auth.users WHERE email = 'luke.kirsten@gmail.com';

-- Insert demo river walk (replace USER_ID with actual ID from above query)
-- You'll need to replace this UUID with the actual user ID
INSERT INTO river_walks (id, name, date, country, county, user_id, archived, notes) 
VALUES (
  'demo-river-walk-uuid',
  'River Dart Interactive Demo',
  '2024-06-15',
  'UK',
  'Devon',
  'USER_ID_HERE', -- Replace with actual luke.kirsten@gmail.com user ID
  false,
  'Demonstration river walk for interactive preview feature. Contains 5 pre-filled sites with realistic data from the River Dart in Devon.'
);

-- Insert demo sites
INSERT INTO sites (
  id, river_walk_id, site_number, site_name, river_width, latitude, longitude, 
  photo_url, notes, todo_site_info_status, todo_cross_section_status, 
  todo_velocity_status, todo_sediment_status, velocity_data
) VALUES 
-- Site 1: Upstream Meadow
(
  'demo-site-1-uuid',
  'demo-river-walk-uuid',
  1,
  'Upstream Meadow',
  3.2,
  50.5547,
  -3.7281,
  null,
  'Shallow section with gravel bed, moderate flow through open meadowland',
  'complete',
  'complete', 
  'complete',
  'complete',
  '{"measurements": [{"time": 12.5, "distance": 10, "velocity": 0.8}, {"time": 11.8, "distance": 10, "velocity": 0.85}, {"time": 13.2, "distance": 10, "velocity": 0.76}], "average_velocity": 0.35}'
),
-- Site 2: Bridge Crossing  
(
  'demo-site-2-uuid',
  'demo-river-walk-uuid',
  2,
  'Bridge Crossing',
  2.8,
  50.5532,
  -3.7295,
  null,
  'Narrower channel under stone bridge, deeper water with faster flow',
  'complete',
  'complete',
  'complete', 
  'complete',
  '{"measurements": [{"time": 8.2, "distance": 10, "velocity": 1.22}, {"time": 7.9, "distance": 10, "velocity": 1.27}, {"time": 8.5, "distance": 10, "velocity": 1.18}], "average_velocity": 0.58}'
),
-- Site 3: Wooded Bend
(
  'demo-site-3-uuid',
  'demo-river-walk-uuid', 
  3,
  'Wooded Bend',
  4.1,
  50.5518,
  -3.7312,
  null,
  'Wide meander through woodland, shallower with leaf litter on banks',
  'complete',
  'complete',
  'complete',
  'complete', 
  '{"measurements": [{"time": 18.5, "distance": 10, "velocity": 0.54}, {"time": 19.2, "distance": 10, "velocity": 0.52}, {"time": 17.8, "distance": 10, "velocity": 0.56}], "average_velocity": 0.22}'
),
-- Site 4: Rocky Rapids
(
  'demo-site-4-uuid',
  'demo-river-walk-uuid',
  4,
  'Rocky Rapids', 
  2.5,
  50.5503,
  -3.7328,
  null,
  'Steep rocky section with turbulent flow over granite boulders',
  'complete',
  'complete',
  'complete',
  'complete',
  '{"measurements": [{"time": 6.1, "distance": 10, "velocity": 1.64}, {"time": 5.8, "distance": 10, "velocity": 1.72}, {"time": 6.4, "distance": 10, "velocity": 1.56}], "average_velocity": 0.84}'
),
-- Site 5: Village Outflow
(
  'demo-site-5-uuid',
  'demo-river-walk-uuid',
  5,
  'Village Outflow',
  3.8,
  50.5489,
  -3.7345,
  null,
  'Wider section downstream of village, silty bed with slower flow',
  'complete', 
  'complete',
  'complete',
  'complete',
  '{"measurements": [{"time": 14.8, "distance": 10, "velocity": 0.68}, {"time": 15.2, "distance": 10, "velocity": 0.66}, {"time": 14.5, "distance": 10, "velocity": 0.69}], "average_velocity": 0.41}'
);

-- Insert measurement points for each site
-- Site 1 measurement points
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('demo-site-1-uuid', 1, 0, 0),
('demo-site-1-uuid', 2, 0.8, 0.4),
('demo-site-1-uuid', 3, 1.6, 0.8),
('demo-site-1-uuid', 4, 2.4, 0.6),
('demo-site-1-uuid', 5, 3.2, 0);

-- Site 2 measurement points
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('demo-site-2-uuid', 1, 0, 0),
('demo-site-2-uuid', 2, 0.7, 0.6),
('demo-site-2-uuid', 3, 1.4, 1.2),
('demo-site-2-uuid', 4, 2.1, 0.8),
('demo-site-2-uuid', 5, 2.8, 0);

-- Site 3 measurement points  
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('demo-site-3-uuid', 1, 0, 0),
('demo-site-3-uuid', 2, 1.0, 0.3),
('demo-site-3-uuid', 3, 2.0, 0.7),
('demo-site-3-uuid', 4, 3.1, 0.5),
('demo-site-3-uuid', 5, 4.1, 0);

-- Site 4 measurement points
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('demo-site-4-uuid', 1, 0, 0),
('demo-site-4-uuid', 2, 0.6, 0.5),
('demo-site-4-uuid', 3, 1.25, 0.9),
('demo-site-4-uuid', 4, 1.9, 0.4),
('demo-site-4-uuid', 5, 2.5, 0);

-- Site 5 measurement points
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('demo-site-5-uuid', 1, 0, 0),
('demo-site-5-uuid', 2, 0.95, 0.4),
('demo-site-5-uuid', 3, 1.9, 0.8),
('demo-site-5-uuid', 4, 2.85, 0.6),
('demo-site-5-uuid', 5, 3.8, 0);

-- Add sedimentation data to sites (store as JSONB)
UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 45, "roundness": 3, "point": 1},
    {"size_mm": 52, "roundness": 4, "point": 2}, 
    {"size_mm": 38, "roundness": 3, "point": 3}
  ]
}' WHERE id = 'demo-site-1-uuid';

UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 128, "roundness": 2, "point": 1},
    {"size_mm": 156, "roundness": 2, "point": 2},
    {"size_mm": 142, "roundness": 3, "point": 3}
  ]
}' WHERE id = 'demo-site-2-uuid';

UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 8, "roundness": 4, "point": 1},
    {"size_mm": 12, "roundness": 5, "point": 2},
    {"size_mm": 6, "roundness": 4, "point": 3}
  ]
}' WHERE id = 'demo-site-3-uuid';

UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 380, "roundness": 1, "point": 1},
    {"size_mm": 425, "roundness": 2, "point": 2},
    {"size_mm": 356, "roundness": 1, "point": 3}
  ]
}' WHERE id = 'demo-site-4-uuid';

UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 1.2, "roundness": 5, "point": 1},
    {"size_mm": 0.8, "roundness": 6, "point": 2},
    {"size_mm": 1.5, "roundness": 5, "point": 3}
  ]
}' WHERE id = 'demo-site-5-uuid';

-- Instructions:
-- 1. First run: SELECT id FROM auth.users WHERE email = 'luke.kirsten@gmail.com';
-- 2. Copy the returned UUID
-- 3. Replace 'USER_ID_HERE' in the river_walks INSERT with the actual UUID
-- 4. Replace all 'demo-*-uuid' values with actual generated UUIDs
-- 5. Run this script in Supabase SQL editor