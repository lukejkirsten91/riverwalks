-- Demo River Walk Data for Marketing Screenshots
-- User: luke.kirsten@gmail.com

-- Get user ID for luke.kirsten@gmail.com
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
    
    -- Create a realistic river walk
    INSERT INTO river_walks (
        id,
        user_id,
        river_name,
        location,
        study_date,
        weather_conditions,
        group_size,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        target_user_id,
        'River Dart Study',
        'Dartmoor National Park, Devon',
        '2024-09-15'::date,
        'Overcast, light breeze, 16°C - ideal conditions for river study',
        4,
        NOW(),
        NOW()
    ) RETURNING id INTO river_walk_id;
    
    -- Site 1: Upstream - Near source area
    INSERT INTO sites (
        id,
        river_walk_id,
        site_name,
        description,
        latitude,
        longitude,
        river_width,
        notes,
        photo_url,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        river_walk_id,
        'Upstream Site',
        'Upper reaches near Dartmoor, fast flowing over granite bedrock',
        50.5812,
        -3.9234,
        3.2,
        'Rocky riverbed with large granite boulders. Water very clear. Some small trout observed.',
        NULL,
        NOW(),
        NOW()
    ) RETURNING id INTO site1_id;
    
    -- Site 2: Middle reach
    INSERT INTO sites (
        id,
        river_walk_id,
        site_name,
        description,
        latitude,
        longitude,
        river_width,
        notes,
        photo_url,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        river_walk_id,
        'Middle Reach',
        'Meandering section through mixed woodland and farmland',
        50.5623,
        -3.8967,
        5.8,
        'Riverbed of mixed pebbles and sand. Some erosion on outer meander bends. Evidence of cattle access.',
        NULL,
        NOW(),
        NOW()
    ) RETURNING id INTO site2_id;
    
    -- Site 3: Downstream
    INSERT INTO sites (
        id,
        river_walk_id,
        site_name,
        description,
        latitude,
        longitude,
        river_width,
        notes,
        photo_url,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        river_walk_id,
        'Downstream Site',
        'Lower reaches before confluence with River Dart main channel',
        50.5445,
        -3.8701,
        8.1,
        'Wider, slower flowing section. Muddy banks with vegetation. Some pollution from agricultural runoff evident.',
        NULL,
        NOW(),
        NOW()
    ) RETURNING id INTO site3_id;
    
    -- Measurement points for Site 1 (Upstream - narrow and deep)
    INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
    (site1_id, 1, 0.0, 0.05),     -- Left bank
    (site1_id, 2, 0.4, 0.12),     -- Shallow edge
    (site1_id, 3, 0.8, 0.28),     -- Getting deeper
    (site1_id, 4, 1.2, 0.45),     -- Deep channel
    (site1_id, 5, 1.6, 0.52),     -- Deepest point
    (site1_id, 6, 2.0, 0.41),     -- Shallowing
    (site1_id, 7, 2.4, 0.26),     -- Near right bank
    (site1_id, 8, 2.8, 0.15),     -- Shallow edge
    (site1_id, 9, 3.2, 0.03);     -- Right bank
    
    -- Measurement points for Site 2 (Middle - moderate width and depth)
    INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
    (site2_id, 1, 0.0, 0.02),     -- Left bank
    (site2_id, 2, 0.7, 0.08),     -- Shallow area
    (site2_id, 3, 1.4, 0.19),     -- Gentle slope
    (site2_id, 4, 2.1, 0.32),     -- Deeper
    (site2_id, 5, 2.8, 0.41),     -- Main channel
    (site2_id, 6, 3.5, 0.38),     -- Still deep
    (site2_id, 7, 4.2, 0.27),     -- Shallowing on right
    (site2_id, 8, 4.9, 0.16),     -- Near bank
    (site2_id, 9, 5.6, 0.09),     -- Shallow edge
    (site2_id, 10, 5.8, 0.01);    -- Right bank
    
    -- Measurement points for Site 3 (Downstream - wide and varied depth)
    INSERT INTO measurement_points (site_id, point_number, distance_from_bank, depth) VALUES
    (site3_id, 1, 0.0, 0.01),     -- Left bank
    (site3_id, 2, 0.8, 0.06),     -- Shallow margin
    (site3_id, 3, 1.6, 0.14),     -- Gentle gradient
    (site3_id, 4, 2.4, 0.23),     -- Getting deeper
    (site3_id, 5, 3.2, 0.35),     -- Deeper section
    (site3_id, 6, 4.0, 0.42),     -- Main flow channel
    (site3_id, 7, 4.8, 0.39),     -- Still good depth
    (site3_id, 8, 5.6, 0.31),     -- Starting to shallow
    (site3_id, 9, 6.4, 0.22),     -- Shallower
    (site3_id, 10, 7.2, 0.13),    -- Near right bank
    (site3_id, 11, 8.0, 0.07),    -- Very shallow
    (site3_id, 12, 8.1, 0.02);    -- Right bank
    
    RAISE NOTICE 'Demo river walk data added successfully for luke.kirsten@gmail.com';
    RAISE NOTICE 'River walk ID: %', river_walk_id;
    RAISE NOTICE 'Site 1 ID: %', site1_id;
    RAISE NOTICE 'Site 2 ID: %', site2_id;
    RAISE NOTICE 'Site 3 ID: %', site3_id;
    
END $$;