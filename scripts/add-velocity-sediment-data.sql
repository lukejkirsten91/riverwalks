-- Add velocity and sedimentation data to existing River Dart demo sites
-- Run this after the main demo data script

DO $$
DECLARE
    target_user_id UUID;
    site1_id UUID;
    site2_id UUID;
    site3_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'luke.kirsten@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User luke.kirsten@gmail.com not found';
        RETURN;
    END IF;
    
    -- Get the site IDs from the River Dart study
    SELECT id INTO site1_id FROM sites 
    WHERE site_name = 'Upstream Site' 
    AND river_walk_id IN (
        SELECT id FROM river_walks 
        WHERE user_id = target_user_id 
        AND name = 'River Dart Study'
    );
    
    SELECT id INTO site2_id FROM sites 
    WHERE site_name = 'Middle Reach' 
    AND river_walk_id IN (
        SELECT id FROM river_walks 
        WHERE user_id = target_user_id 
        AND name = 'River Dart Study'
    );
    
    SELECT id INTO site3_id FROM sites 
    WHERE site_name = 'Downstream Site' 
    AND river_walk_id IN (
        SELECT id FROM river_walks 
        WHERE user_id = target_user_id 
        AND name = 'River Dart Study'
    );
    
    -- Update Site 1 with velocity data (fast upstream flow)
    UPDATE sites SET 
        velocity_measurement_count = 5,
        velocity_data = '{
            "measurements": [
                {"measurement_number": 1, "time_seconds": 8.2, "float_travel_distance": 10, "velocity_ms": 1.22},
                {"measurement_number": 2, "time_seconds": 7.8, "float_travel_distance": 10, "velocity_ms": 1.28},
                {"measurement_number": 3, "time_seconds": 8.5, "float_travel_distance": 10, "velocity_ms": 1.18},
                {"measurement_number": 4, "time_seconds": 8.1, "float_travel_distance": 10, "velocity_ms": 1.23},
                {"measurement_number": 5, "time_seconds": 7.9, "float_travel_distance": 10, "velocity_ms": 1.27}
            ],
            "average_velocity": 1.24,
            "float_distance_units": "m",
            "time_units": "seconds"
        }',
        sedimentation_data = '{
            "measurements": [
                {"sediment_size": 45, "sediment_roundness": 2},
                {"sediment_size": 52, "sediment_roundness": 1},
                {"sediment_size": 38, "sediment_roundness": 3},
                {"sediment_size": 41, "sediment_roundness": 2},
                {"sediment_size": 48, "sediment_roundness": 1},
                {"sediment_size": 35, "sediment_roundness": 3},
                {"sediment_size": 56, "sediment_roundness": 1},
                {"sediment_size": 43, "sediment_roundness": 2},
                {"sediment_size": 39, "sediment_roundness": 2},
                {"sediment_size": 51, "sediment_roundness": 1}
            ]
        }',
        todo_velocity_status = 'complete',
        todo_sediment_status = 'complete'
    WHERE id = site1_id;
    
    -- Update Site 2 with velocity data (moderate flow)
    UPDATE sites SET 
        velocity_measurement_count = 5,
        velocity_data = '{
            "measurements": [
                {"measurement_number": 1, "time_seconds": 12.1, "float_travel_distance": 10, "velocity_ms": 0.83},
                {"measurement_number": 2, "time_seconds": 11.8, "float_travel_distance": 10, "velocity_ms": 0.85},
                {"measurement_number": 3, "time_seconds": 12.5, "float_travel_distance": 10, "velocity_ms": 0.80},
                {"measurement_number": 4, "time_seconds": 11.9, "float_travel_distance": 10, "velocity_ms": 0.84},
                {"measurement_number": 5, "time_seconds": 12.2, "float_travel_distance": 10, "velocity_ms": 0.82}
            ],
            "average_velocity": 0.83,
            "float_distance_units": "m",
            "time_units": "seconds"
        }',
        sedimentation_data = '{
            "measurements": [
                {"sediment_size": 28, "sediment_roundness": 3},
                {"sediment_size": 32, "sediment_roundness": 4},
                {"sediment_size": 25, "sediment_roundness": 3},
                {"sediment_size": 30, "sediment_roundness": 4},
                {"sediment_size": 27, "sediment_roundness": 3},
                {"sediment_size": 35, "sediment_roundness": 4},
                {"sediment_size": 29, "sediment_roundness": 3},
                {"sediment_size": 31, "sediment_roundness": 4},
                {"sediment_size": 26, "sediment_roundness": 3},
                {"sediment_size": 33, "sediment_roundness": 4}
            ]
        }',
        todo_velocity_status = 'complete',
        todo_sediment_status = 'complete'
    WHERE id = site2_id;
    
    -- Update Site 3 with velocity data (slow downstream flow)
    UPDATE sites SET 
        velocity_measurement_count = 5,
        velocity_data = '{
            "measurements": [
                {"measurement_number": 1, "time_seconds": 18.3, "float_travel_distance": 10, "velocity_ms": 0.55},
                {"measurement_number": 2, "time_seconds": 17.8, "float_travel_distance": 10, "velocity_ms": 0.56},
                {"measurement_number": 3, "time_seconds": 19.1, "float_travel_distance": 10, "velocity_ms": 0.52},
                {"measurement_number": 4, "time_seconds": 18.5, "float_travel_distance": 10, "velocity_ms": 0.54},
                {"measurement_number": 5, "time_seconds": 18.0, "float_travel_distance": 10, "velocity_ms": 0.56}
            ],
            "average_velocity": 0.55,
            "float_distance_units": "m",
            "time_units": "seconds"
        }',
        sedimentation_data = '{
            "measurements": [
                {"sediment_size": 15, "sediment_roundness": 5},
                {"sediment_size": 18, "sediment_roundness": 5},
                {"sediment_size": 12, "sediment_roundness": 4},
                {"sediment_size": 16, "sediment_roundness": 5},
                {"sediment_size": 14, "sediment_roundness": 4},
                {"sediment_size": 19, "sediment_roundness": 5},
                {"sediment_size": 13, "sediment_roundness": 4},
                {"sediment_size": 17, "sediment_roundness": 5},
                {"sediment_size": 11, "sediment_roundness": 4},
                {"sediment_size": 20, "sediment_roundness": 5}
            ]
        }',
        todo_velocity_status = 'complete',
        todo_sediment_status = 'complete'
    WHERE id = site3_id;
    
    RAISE NOTICE 'Velocity and sedimentation data added successfully';
    RAISE NOTICE 'Site 1: Fast flow (1.24 m/s), large angular rocks';
    RAISE NOTICE 'Site 2: Moderate flow (0.83 m/s), medium rounded pebbles';
    RAISE NOTICE 'Site 3: Slow flow (0.55 m/s), small rounded sediment';
    
END $$;