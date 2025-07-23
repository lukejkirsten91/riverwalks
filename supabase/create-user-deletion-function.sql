-- Complete User Deletion Function
-- This function safely deletes a user and all their associated data
-- Should be run with service role privileges

CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS TABLE (
  status TEXT,
  deleted_records JSONB
) AS $$
DECLARE
  deleted_count INTEGER;
  deletion_log JSONB := '{}';
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN QUERY SELECT 'error'::TEXT, '{"error": "User not found"}'::JSONB;
    RETURN;
  END IF;

  -- Log the deletion attempt
  RAISE NOTICE 'Starting complete deletion for user ID: %', target_user_id;

  -- 1. Delete collaboration access records by email
  WITH user_email AS (
    SELECT email FROM auth.users WHERE id = target_user_id
  )
  DELETE FROM collaborator_access 
  WHERE user_email = (SELECT email FROM user_email);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  deletion_log := deletion_log || jsonb_build_object('collaborator_access', deleted_count);
  RAISE NOTICE 'Deleted % collaborator_access records', deleted_count;

  -- 2. Delete collaboration metadata owned by this user
  DELETE FROM collaboration_metadata WHERE owner_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  deletion_log := deletion_log || jsonb_build_object('collaboration_metadata', deleted_count);
  RAISE NOTICE 'Deleted % collaboration_metadata records', deleted_count;

  -- 3. Delete payment events (not CASCADE, so manual delete)
  DELETE FROM payment_events WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  deletion_log := deletion_log || jsonb_build_object('payment_events', deleted_count);
  RAISE NOTICE 'Deleted % payment_events records', deleted_count;

  -- 4. Delete vouchers created by this user
  DELETE FROM vouchers WHERE created_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  deletion_log := deletion_log || jsonb_build_object('vouchers', deleted_count);
  RAISE NOTICE 'Deleted % vouchers created by user', deleted_count;

  -- 5. Delete storage objects (site photos)
  DELETE FROM storage.objects 
  WHERE bucket_id = 'site-photos' 
  AND (storage.foldername(name))[1] = target_user_id::text;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  deletion_log := deletion_log || jsonb_build_object('storage_objects', deleted_count);
  RAISE NOTICE 'Deleted % storage objects', deleted_count;

  -- 6. Delete voucher usage records
  DELETE FROM voucher_usage WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  deletion_log := deletion_log || jsonb_build_object('voucher_usage', deleted_count);
  RAISE NOTICE 'Deleted % voucher_usage records', deleted_count;

  -- 7. Count CASCADE deletions before deleting user
  SELECT COUNT(*) INTO deleted_count FROM river_walks WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('river_walks', deleted_count);

  SELECT COUNT(*) INTO deleted_count 
  FROM sites s 
  JOIN river_walks rw ON s.river_walk_id = rw.id 
  WHERE rw.user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('sites', deleted_count);

  SELECT COUNT(*) INTO deleted_count 
  FROM measurement_points mp
  JOIN sites s ON mp.site_id = s.id
  JOIN river_walks rw ON s.river_walk_id = rw.id 
  WHERE rw.user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('measurement_points', deleted_count);

  SELECT COUNT(*) INTO deleted_count FROM subscriptions WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('subscriptions', deleted_count);

  SELECT COUNT(*) INTO deleted_count FROM user_agreements WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('user_agreements', deleted_count);

  -- Count feedback and communication tracking data
  SELECT COUNT(*) INTO deleted_count FROM feedback_responses WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('feedback_responses', deleted_count);

  SELECT COUNT(*) INTO deleted_count FROM feedback_sent_tracking WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('feedback_sent_tracking', deleted_count);

  SELECT COUNT(*) INTO deleted_count FROM communication_log WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('communication_log', deleted_count);

  SELECT COUNT(*) INTO deleted_count FROM email_communications WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('email_communications', deleted_count);

  SELECT COUNT(*) INTO deleted_count FROM form_interactions WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('form_interactions', deleted_count);

  SELECT COUNT(*) INTO deleted_count FROM user_activity_log WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('user_activity_log', deleted_count);

  SELECT COUNT(*) INTO deleted_count FROM gdpr_requests WHERE user_id = target_user_id;
  deletion_log := deletion_log || jsonb_build_object('gdpr_requests', deleted_count);

  -- 8. Delete the user (this will CASCADE delete river_walks, sites, measurement_points, subscriptions, user_agreements, 
  --    feedback_responses, feedback_sent_tracking, communication_log, email_communications, form_interactions, 
  --    user_activity_log, gdpr_requests)
  DELETE FROM auth.users WHERE id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  deletion_log := deletion_log || jsonb_build_object('auth_users', deleted_count);
  RAISE NOTICE 'Deleted % auth.users record (cascaded to related data)', deleted_count;

  -- Return success status with deletion log
  RETURN QUERY SELECT 
    'success'::TEXT, 
    deletion_log || jsonb_build_object(
      'user_id', target_user_id,
      'deleted_at', NOW()
    );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during user deletion: %', SQLERRM;
    RETURN QUERY SELECT 
      'error'::TEXT, 
      jsonb_build_object(
        'error', SQLERRM,
        'user_id', target_user_id,
        'partial_deletions', deletion_log
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (will be called via service role)
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;

-- Test the function (commented out - uncomment only for testing)
-- SELECT * FROM delete_user_completely('00000000-0000-0000-0000-000000000000'::UUID);