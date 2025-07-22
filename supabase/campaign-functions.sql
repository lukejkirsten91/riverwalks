-- Function to increment campaign response count
CREATE OR REPLACE FUNCTION increment_campaign_responses(campaign_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE feedback_campaigns 
  SET response_count = response_count + 1
  WHERE id = campaign_uuid;
END;
$$;

-- Function to get feedback form for user (checking if they should see it)
CREATE OR REPLACE FUNCTION get_user_feedback_form(
  user_uuid UUID,
  form_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  form_id UUID,
  form_name TEXT,
  form_description TEXT,
  campaign_id UUID,
  campaign_name TEXT,
  questions JSONB,
  already_responded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If specific form is requested, return it if active
  IF form_uuid IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      f.id as form_id,
      f.name as form_name,
      f.description as form_description,
      NULL::UUID as campaign_id,
      NULL::TEXT as campaign_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', q.id,
            'question_text', q.question_text,
            'question_type', q.question_type,
            'options', q.options,
            'order_index', q.order_index,
            'required', q.required
          )
          ORDER BY q.order_index
        ) FILTER (WHERE q.id IS NOT NULL),
        '[]'::json
      )::jsonb as questions,
      EXISTS(
        SELECT 1 FROM feedback_responses fr 
        WHERE fr.form_id = f.id AND fr.user_id = user_uuid
      ) as already_responded
    FROM feedback_forms f
    LEFT JOIN feedback_questions q ON f.id = q.form_id
    WHERE f.id = form_uuid AND f.is_active = true
    GROUP BY f.id, f.name, f.description;
    RETURN;
  END IF;

  -- Otherwise, return forms that user has been sent but not completed
  RETURN QUERY
  SELECT 
    f.id as form_id,
    f.name as form_name,
    f.description as form_description,
    fst.campaign_id,
    fc.name as campaign_name,
    COALESCE(
      json_agg(
        json_build_object(
          'id', q.id,
          'question_text', q.question_text,
          'question_type', q.question_type,
          'options', q.options,
          'order_index', q.order_index,
          'required', q.required
        )
        ORDER BY q.order_index
      ) FILTER (WHERE q.id IS NOT NULL),
      '[]'::json
    )::jsonb as questions,
    false as already_responded -- They haven't responded since we filter for incomplete
  FROM feedback_sent_tracking fst
  JOIN feedback_forms f ON fst.form_id = f.id
  LEFT JOIN feedback_campaigns fc ON fst.campaign_id = fc.id
  LEFT JOIN feedback_questions q ON f.id = q.form_id
  WHERE fst.user_id = user_uuid 
    AND fst.completed_at IS NULL
    AND f.is_active = true
  GROUP BY f.id, f.name, f.description, fst.campaign_id, fc.name
  ORDER BY fst.sent_at DESC;
END;
$$;

-- Function to get feedback analytics summary
CREATE OR REPLACE FUNCTION get_feedback_analytics_summary()
RETURNS TABLE (
  total_forms INTEGER,
  total_active_forms INTEGER,
  total_campaigns INTEGER,
  total_responses INTEGER,
  total_sent INTEGER,
  completion_rate NUMERIC,
  recent_responses INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM feedback_forms) as total_forms,
    (SELECT COUNT(*)::INTEGER FROM feedback_forms WHERE is_active = true) as total_active_forms,
    (SELECT COUNT(*)::INTEGER FROM feedback_campaigns) as total_campaigns,
    (SELECT COUNT(*)::INTEGER FROM feedback_responses) as total_responses,
    (SELECT COUNT(*)::INTEGER FROM feedback_sent_tracking) as total_sent,
    CASE 
      WHEN (SELECT COUNT(*) FROM feedback_sent_tracking) > 0 
      THEN ROUND(
        (SELECT COUNT(*)::NUMERIC FROM feedback_sent_tracking WHERE completed_at IS NOT NULL) / 
        (SELECT COUNT(*)::NUMERIC FROM feedback_sent_tracking) * 100, 2
      )
      ELSE 0
    END as completion_rate,
    (SELECT COUNT(*)::INTEGER FROM feedback_responses 
     WHERE submitted_at >= NOW() - INTERVAL '7 days') as recent_responses;
END;
$$;

-- Grant execute permissions to authenticated users for user-facing functions
GRANT EXECUTE ON FUNCTION get_user_feedback_form(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_campaign_responses(UUID) TO authenticated;

-- Grant execute permissions to admins for analytics
GRANT EXECUTE ON FUNCTION get_feedback_analytics_summary() TO authenticated;