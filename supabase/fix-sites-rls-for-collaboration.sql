-- Fix RLS policies for sites and measurement_points to support collaboration
-- Current policies only allow river walk owners, need to include collaborators

-- Drop existing site policies
DROP POLICY IF EXISTS "Users can view their own sites" ON sites;
DROP POLICY IF EXISTS "Users can insert their own sites" ON sites;
DROP POLICY IF EXISTS "Users can update their own sites" ON sites;
DROP POLICY IF EXISTS "Users can delete their own sites" ON sites;

-- Create new policies that support both owners and collaborators
CREATE POLICY "Users can access sites for owned and collaborated river walks" ON sites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM river_walks rw
            WHERE rw.id = sites.river_walk_id
            AND (
                -- Owner access
                rw.user_id = auth.uid()
                OR
                -- Collaborator access
                EXISTS (
                    SELECT 1 
                    FROM collaboration_metadata cm
                    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
                    WHERE cm.river_walk_reference_id = rw.id
                    AND ca.user_email = auth.email()
                    AND ca.accepted_at IS NOT NULL
                )
            )
        )
    );

CREATE POLICY "Users can insert sites for owned and collaborated river walks" ON sites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM river_walks rw
            WHERE rw.id = sites.river_walk_id
            AND (
                -- Owner access
                rw.user_id = auth.uid()
                OR
                -- Collaborator access (only editors can insert)
                EXISTS (
                    SELECT 1 
                    FROM collaboration_metadata cm
                    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
                    WHERE cm.river_walk_reference_id = rw.id
                    AND ca.user_email = auth.email()
                    AND ca.accepted_at IS NOT NULL
                    AND ca.role = 'editor'
                )
            )
        )
    );

CREATE POLICY "Users can update sites for owned and collaborated river walks" ON sites
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM river_walks rw
            WHERE rw.id = sites.river_walk_id
            AND (
                -- Owner access
                rw.user_id = auth.uid()
                OR
                -- Collaborator access (only editors can update)
                EXISTS (
                    SELECT 1 
                    FROM collaboration_metadata cm
                    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
                    WHERE cm.river_walk_reference_id = rw.id
                    AND ca.user_email = auth.email()
                    AND ca.accepted_at IS NOT NULL
                    AND ca.role = 'editor'
                )
            )
        )
    );

CREATE POLICY "Users can delete sites for owned and collaborated river walks" ON sites
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM river_walks rw
            WHERE rw.id = sites.river_walk_id
            AND (
                -- Owner access
                rw.user_id = auth.uid()
                OR
                -- Collaborator access (only editors can delete)
                EXISTS (
                    SELECT 1 
                    FROM collaboration_metadata cm
                    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
                    WHERE cm.river_walk_reference_id = rw.id
                    AND ca.user_email = auth.email()
                    AND ca.accepted_at IS NOT NULL
                    AND ca.role = 'editor'
                )
            )
        )
    );

-- Drop existing measurement_points policies
DROP POLICY IF EXISTS "Users can view their own measurement points" ON measurement_points;
DROP POLICY IF EXISTS "Users can insert their own measurement points" ON measurement_points;
DROP POLICY IF EXISTS "Users can update their own measurement points" ON measurement_points;
DROP POLICY IF EXISTS "Users can delete their own measurement points" ON measurement_points;

-- Create new policies for measurement_points that support collaboration
CREATE POLICY "Users can access measurement points for owned and collaborated river walks" ON measurement_points
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sites s
            JOIN river_walks rw ON rw.id = s.river_walk_id
            WHERE s.id = measurement_points.site_id
            AND (
                -- Owner access
                rw.user_id = auth.uid()
                OR
                -- Collaborator access
                EXISTS (
                    SELECT 1 
                    FROM collaboration_metadata cm
                    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
                    WHERE cm.river_walk_reference_id = rw.id
                    AND ca.user_email = auth.email()
                    AND ca.accepted_at IS NOT NULL
                )
            )
        )
    );

CREATE POLICY "Users can insert measurement points for owned and collaborated river walks" ON measurement_points
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sites s
            JOIN river_walks rw ON rw.id = s.river_walk_id
            WHERE s.id = measurement_points.site_id
            AND (
                -- Owner access
                rw.user_id = auth.uid()
                OR
                -- Collaborator access (only editors can insert)
                EXISTS (
                    SELECT 1 
                    FROM collaboration_metadata cm
                    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
                    WHERE cm.river_walk_reference_id = rw.id
                    AND ca.user_email = auth.email()
                    AND ca.accepted_at IS NOT NULL
                    AND ca.role = 'editor'
                )
            )
        )
    );

CREATE POLICY "Users can update measurement points for owned and collaborated river walks" ON measurement_points
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sites s
            JOIN river_walks rw ON rw.id = s.river_walk_id
            WHERE s.id = measurement_points.site_id
            AND (
                -- Owner access
                rw.user_id = auth.uid()
                OR
                -- Collaborator access (only editors can update)
                EXISTS (
                    SELECT 1 
                    FROM collaboration_metadata cm
                    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
                    WHERE cm.river_walk_reference_id = rw.id
                    AND ca.user_email = auth.email()
                    AND ca.accepted_at IS NOT NULL
                    AND ca.role = 'editor'
                )
            )
        )
    );

CREATE POLICY "Users can delete measurement points for owned and collaborated river walks" ON measurement_points
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sites s
            JOIN river_walks rw ON rw.id = s.river_walk_id
            WHERE s.id = measurement_points.site_id
            AND (
                -- Owner access
                rw.user_id = auth.uid()
                OR
                -- Collaborator access (only editors can delete)
                EXISTS (
                    SELECT 1 
                    FROM collaboration_metadata cm
                    JOIN collaborator_access ca ON cm.id = ca.collaboration_id
                    WHERE cm.river_walk_reference_id = rw.id
                    AND ca.user_email = auth.email()
                    AND ca.accepted_at IS NOT NULL
                    AND ca.role = 'editor'
                )
            )
        )
    );

SELECT 'RLS policies updated for sites and measurement_points to support collaboration' as status;