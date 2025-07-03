-- Create demo river walk and sites for interactive preview
-- This will create a sample river study that users can interact with

-- First, get luke.kirsten@gmail.com user ID
-- Run this query to get your user ID: SELECT id FROM auth.users WHERE email = 'luke.kirsten@gmail.com';
-- Then replace 'USER_ID_HERE' below with the actual UUID

-- Insert demo river walk
INSERT INTO river_walks (id, name, date, country, county, user_id, archived, notes) 
VALUES (
  '72618ab0-5079-43e3-a4ea-bbdb773196d9',
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
  '11b74132-9613-41f3-a4b0-7f8196c23c11',
  '72618ab0-5079-43e3-a4ea-bbdb773196d9',
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
  'bf4f8cf8-c76b-451e-af85-1259decd0898',
  '72618ab0-5079-43e3-a4ea-bbdb773196d9',
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
  '33e2c1d1-e4b1-487a-bddb-3616b05cbbe0',
  '72618ab0-5079-43e3-a4ea-bbdb773196d9', 
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
  'be6d91b3-71da-4882-840a-a8d2f29b8dae',
  '72618ab0-5079-43e3-a4ea-bbdb773196d9',
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
  '3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6',
  '72618ab0-5079-43e3-a4ea-bbdb773196d9',
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
('11b74132-9613-41f3-a4b0-7f8196c23c11', 1, 0, 0),
('11b74132-9613-41f3-a4b0-7f8196c23c11', 2, 0.8, 0.4),
('11b74132-9613-41f3-a4b0-7f8196c23c11', 3, 1.6, 0.8),
('11b74132-9613-41f3-a4b0-7f8196c23c11', 4, 2.4, 0.6),
('11b74132-9613-41f3-a4b0-7f8196c23c11', 5, 3.2, 0);

-- Site 2 measurement points
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('bf4f8cf8-c76b-451e-af85-1259decd0898', 1, 0, 0),
('bf4f8cf8-c76b-451e-af85-1259decd0898', 2, 0.7, 0.6),
('bf4f8cf8-c76b-451e-af85-1259decd0898', 3, 1.4, 1.2),
('bf4f8cf8-c76b-451e-af85-1259decd0898', 4, 2.1, 0.8),
('bf4f8cf8-c76b-451e-af85-1259decd0898', 5, 2.8, 0);

-- Site 3 measurement points  
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', 1, 0, 0),
('33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', 2, 1.0, 0.3),
('33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', 3, 2.0, 0.7),
('33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', 4, 3.1, 0.5),
('33e2c1d1-e4b1-487a-bddb-3616b05cbbe0', 5, 4.1, 0);

-- Site 4 measurement points
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('be6d91b3-71da-4882-840a-a8d2f29b8dae', 1, 0, 0),
('be6d91b3-71da-4882-840a-a8d2f29b8dae', 2, 0.6, 0.5),
('be6d91b3-71da-4882-840a-a8d2f29b8dae', 3, 1.25, 0.9),
('be6d91b3-71da-4882-840a-a8d2f29b8dae', 4, 1.9, 0.4),
('be6d91b3-71da-4882-840a-a8d2f29b8dae', 5, 2.5, 0);

-- Site 5 measurement points
INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
('3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', 1, 0, 0),
('3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', 2, 0.95, 0.4),
('3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', 3, 1.9, 0.8),
('3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', 4, 2.85, 0.6),
('3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6', 5, 3.8, 0);

-- Add sedimentation data to sites (store as JSONB)
UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 45, "roundness": 3, "point": 1},
    {"size_mm": 52, "roundness": 4, "point": 2}, 
    {"size_mm": 38, "roundness": 3, "point": 3}
  ]
}' WHERE id = '11b74132-9613-41f3-a4b0-7f8196c23c11';

UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 128, "roundness": 2, "point": 1},
    {"size_mm": 156, "roundness": 2, "point": 2},
    {"size_mm": 142, "roundness": 3, "point": 3}
  ]
}' WHERE id = 'bf4f8cf8-c76b-451e-af85-1259decd0898';

UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 8, "roundness": 4, "point": 1},
    {"size_mm": 12, "roundness": 5, "point": 2},
    {"size_mm": 6, "roundness": 4, "point": 3}
  ]
}' WHERE id = '33e2c1d1-e4b1-487a-bddb-3616b05cbbe0';

UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 380, "roundness": 1, "point": 1},
    {"size_mm": 425, "roundness": 2, "point": 2},
    {"size_mm": 356, "roundness": 1, "point": 3}
  ]
}' WHERE id = 'be6d91b3-71da-4882-840a-a8d2f29b8dae';

UPDATE sites SET sedimentation_data = '{
  "measurements": [
    {"size_mm": 1.2, "roundness": 5, "point": 1},
    {"size_mm": 0.8, "roundness": 6, "point": 2},
    {"size_mm": 1.5, "roundness": 5, "point": 3}
  ]
}' WHERE id = '3b3d1e3d-69c6-42e2-8c54-ef63a6837ae6';

-- Instructions:
-- 1. First run: SELECT id FROM auth.users WHERE email = 'luke.kirsten@gmail.com';
-- 2. Copy the returned UUID
-- 3. Replace 'USER_ID_HERE' in the river_walks INSERT with the actual UUID  
-- 4. Run this script in Supabase SQL editor
-- 5. All other UUIDs have been pre-filled!