-- Test collaborative update capability
-- Run this as a collaborator user to see if updates work

-- First, let's see what river walks the current user should have access to
SELECT 
    'Accessible River Walks' as test_type,
    rw.id,
    rw.name,
    rw.user_id,
    rw.user_id = auth.uid() as is_owner,
    EXISTS (
        SELECT 1 
        FROM collaboration_metadata cm
        JOIN collaborator_access ca ON cm.id = ca.collaboration_id
        WHERE cm.river_walk_reference_id = rw.id
        AND ca.user_email = auth.email()
        AND ca.accepted_at IS NOT NULL
        AND ca.role = 'editor'
    ) as has_editor_access
FROM river_walks rw
WHERE rw.user_id = auth.uid()
   OR EXISTS (
        SELECT 1 
        FROM collaboration_metadata cm
        JOIN collaborator_access ca ON cm.id = ca.collaboration_id
        WHERE cm.river_walk_reference_id = rw.id
        AND ca.user_email = auth.email()
        AND ca.accepted_at IS NOT NULL
    )
LIMIT 5;

-- Try a simple update test (comment out for actual testing)
-- UPDATE river_walks 
-- SET updated_at = NOW()
-- WHERE id = 'PUT_RIVER_WALK_ID_HERE';