-- Debug why collaborative updates aren't working despite correct RLS policy
-- Test the exact conditions the policy is checking

-- 1. Check what collaboration data exists for a specific river walk
SELECT 
    'Collaboration Data' as check_type,
    cm.river_walk_reference_id,
    cm.owner_id,
    ca.user_email,
    ca.role,
    ca.accepted_at,
    ca.accepted_at IS NOT NULL as is_accepted
FROM collaboration_metadata cm
JOIN collaborator_access ca ON cm.id = ca.collaboration_id
WHERE cm.river_walk_reference_id IN (
    SELECT id FROM river_walks LIMIT 3
)
ORDER BY cm.river_walk_reference_id;

-- 2. Test the policy condition manually for current user
SELECT 
    'Policy Test' as check_type,
    auth.email() as current_user_email,
    auth.uid() as current_user_id,
    EXISTS (
        SELECT 1 
        FROM collaboration_metadata cm
        JOIN collaborator_access ca ON cm.id = ca.collaboration_id
        WHERE ca.user_email = auth.email()
        AND ca.accepted_at IS NOT NULL
        AND ca.role = 'editor'
    ) as has_editor_access;

-- 3. Check if there are any collaborator records for current user
SELECT 
    'Current User Collaborations' as check_type,
    ca.*
FROM collaborator_access ca
WHERE ca.user_email = auth.email()
AND ca.accepted_at IS NOT NULL;