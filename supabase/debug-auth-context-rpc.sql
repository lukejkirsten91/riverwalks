-- Create RPC function to test auth context from the application
CREATE OR REPLACE FUNCTION debug_auth_context_test()
RETURNS TABLE (
  current_user_id UUID,
  current_user_email TEXT,
  is_authenticated BOOLEAN,
  test_timestamp TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    (auth.uid() IS NOT NULL AND auth.email() IS NOT NULL) as is_authenticated,
    NOW() as test_timestamp;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_auth_context_test() TO authenticated;