-- Demo River Walk Data for Marketing Screenshots
-- User: luke.kirsten@gmail.com
-- CORRECTED COLUMN NAMES

DO $$
DECLARE
    target_user_id UUID;
    river_walk_id UUID;
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
    
    -- Create a realistic river walk (using correct column names)
    INSERT INTO river_walks (
        id,
        user_id,
        name,
        date,
        country,
        county,
        notes,
        archived,
        created_at,
        updated_at,
        date_created
    ) VALUES (
        gen_random_uuid(),
        target_user_id,
        'River Dart Study',
        '2024-09-15'::date,
        'UK',
        'Devon',
        'Comprehensive river study conducted at three sites along the River Dart in Dartmoor National Park. Weather conditions: Overcast, light breeze, 16°C - ideal conditions for field work. Group size: 4 students.',
        false,
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id INTO river_walk_id;
    
    -- Site 1: Upstream - Near source area
    INSERT INTO sites (
        id,
        river_walk_id,
        site_number,
        site_name,
        latitude,
        longitude,
        river_width,
        notes,
        weather_conditions,
        land_use,
        depth_units,
        sedimentation_units,
        velocity_measurement_count,
        todo_site_info_status,
        todo_cross_section_status,
        todo_velocity_status,
        todo_sediment_status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        river_walk_id,
        1,
        'Upstream Site',
        50.5812,
        -3.9234,
        3.2,
        'Rocky riverbed with large granite boulders. Water very clear. Some small trout observed.',
        'Overcast, 16°C, light breeze',
        'Moorland - natural vegetation, minimal human impact',
        'cm',
        'mm',
        0,
        'complete',
        'complete',
        'not_started',
        'not_started',
        NOW(),
        NOW()
    ) RETURNING id INTO site1_id;
    
    -- Site 2: Middle reach
    INSERT INTO sites (
        id,
        river_walk_id,
        site_number,
        site_name,
        latitude,
        longitude,
        river_width,
        notes,
        weather_conditions,
        land_use,
        depth_units,
        sedimentation_units,
        velocity_measurement_count,
        todo_site_info_status,
        todo_cross_section_status,
        todo_velocity_status,
        todo_sediment_status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        river_walk_id,
        2,
        'Middle Reach',
        50.5623,
        -3.8967,
        5.8,
        'Riverbed of mixed pebbles and sand. Some erosion on outer meander bends. Evidence of cattle access.',
        'Overcast, 16°C, light breeze',
        'Mixed woodland and farmland - moderate human impact',
        'cm',
        'mm',
        0,
        'complete',
        'complete',
        'not_started',
        'not_started',
        NOW(),
        NOW()
    ) RETURNING id INTO site2_id;
    
    -- Site 3: Downstream
    INSERT INTO sites (
        id,
        river_walk_id,
        site_number,
        site_name,
        latitude,
        longitude,
        river_width,
        notes,
        weather_conditions,
        land_use,
        depth_units,
        sedimentation_units,
        velocity_measurement_count,
        todo_site_info_status,
        todo_cross_section_status,
        todo_velocity_status,
        todo_sediment_status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        river_walk_id,
        3,
        'Downstream Site',
        50.5445,
        -3.8701,
        8.1,
        'Wider, slower flowing section. Muddy banks with vegetation. Some pollution from agricultural runoff evident.',
        'Overcast, 16°C, light breeze',
        'Agricultural land - higher human impact, some pollution',
        'cm',
        'mm',
        0,
        'complete',
        'complete',
        'not_started',
        'not_started',
        NOW(),
        NOW()
    ) RETURNING id INTO site3_id;
    
    -- Measurement points for Site 1 (Upstream - narrow and deep)
    INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth, created_at) VALUES
    (site1_id, 1, 0.0, 5.0, NOW()),     -- Left bank (5cm)
    (site1_id, 2, 0.4, 12.0, NOW()),    -- Shallow edge (12cm)
    (site1_id, 3, 0.8, 28.0, NOW()),    -- Getting deeper (28cm)
    (site1_id, 4, 1.2, 45.0, NOW()),    -- Deep channel (45cm)
    (site1_id, 5, 1.6, 52.0, NOW()),    -- Deepest point (52cm)
    (site1_id, 6, 2.0, 41.0, NOW()),    -- Shallowing (41cm)
    (site1_id, 7, 2.4, 26.0, NOW()),    -- Near right bank (26cm)
    (site1_id, 8, 2.8, 15.0, NOW()),    -- Shallow edge (15cm)
    (site1_id, 9, 3.2, 3.0, NOW());     -- Right bank (3cm)
    
    -- Measurement points for Site 2 (Middle - moderate width and depth)
    INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth, created_at) VALUES
    (site2_id, 1, 0.0, 2.0, NOW()),     -- Left bank (2cm)
    (site2_id, 2, 0.7, 8.0, NOW()),     -- Shallow area (8cm)
    (site2_id, 3, 1.4, 19.0, NOW()),    -- Gentle slope (19cm)
    (site2_id, 4, 2.1, 32.0, NOW()),    -- Deeper (32cm)
    (site2_id, 5, 2.8, 41.0, NOW()),    -- Main channel (41cm)
    (site2_id, 6, 3.5, 38.0, NOW()),    -- Still deep (38cm)
    (site2_id, 7, 4.2, 27.0, NOW()),    -- Shallowing on right (27cm)
    (site2_id, 8, 4.9, 16.0, NOW()),    -- Near bank (16cm)
    (site2_id, 9, 5.6, 9.0, NOW()),     -- Shallow edge (9cm)
    (site2_id, 10, 5.8, 1.0, NOW());    -- Right bank (1cm)
    
    -- Measurement points for Site 3 (Downstream - wide and varied depth)
    INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth, created_at) VALUES
    (site3_id, 1, 0.0, 1.0, NOW()),     -- Left bank (1cm)
    (site3_id, 2, 0.8, 6.0, NOW()),     -- Shallow margin (6cm)
    (site3_id, 3, 1.6, 14.0, NOW()),    -- Gentle gradient (14cm)
    (site3_id, 4, 2.4, 23.0, NOW()),    -- Getting deeper (23cm)
    (site3_id, 5, 3.2, 35.0, NOW()),    -- Deeper section (35cm)
    (site3_id, 6, 4.0, 42.0, NOW()),    -- Main flow channel (42cm)
    (site3_id, 7, 4.8, 39.0, NOW()),    -- Still good depth (39cm)
    (site3_id, 8, 5.6, 31.0, NOW()),    -- Starting to shallow (31cm)
    (site3_id, 9, 6.4, 22.0, NOW()),    -- Shallower (22cm)
    (site3_id, 10, 7.2, 13.0, NOW()),   -- Near right bank (13cm)
    (site3_id, 11, 8.0, 7.0, NOW()),    -- Very shallow (7cm)
    (site3_id, 12, 8.1, 2.0, NOW());    -- Right bank (2cm)
    
    RAISE NOTICE 'Demo river walk data added successfully for luke.kirsten@gmail.com';
    RAISE NOTICE 'River walk ID: %', river_walk_id;
    RAISE NOTICE 'Site 1 ID: %', site1_id;
    RAISE NOTICE 'Site 2 ID: %', site2_id;
    RAISE NOTICE 'Site 3 ID: %', site3_id;
    
END $$;