-- Create a function to get user subscription that bypasses RLS
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  subscription_type TEXT,
  status TEXT,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.user_id, s.subscription_type, s.status, s.stripe_customer_id, 
         s.stripe_price_id, s.current_period_start, s.current_period_end, 
         s.created_at, s.updated_at
  FROM subscriptions s
  WHERE s.user_id = user_uuid AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO anon;

-- Test the function
SELECT * FROM get_user_subscription('92071462-23ad-4815-afa5-8ea7f54cb411'::UUID);

SELECT 'Function created successfully!' as result;