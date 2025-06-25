-- Update only the token generation function to fix base64url issue
-- Run this instead of the full migration if you've already created the tables

-- Drop and recreate the token generation function with proper encoding
DROP FUNCTION IF EXISTS generate_invite_token();

CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  -- Use base64 and make it URL-safe by replacing characters
  RETURN replace(replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=', '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function works
SELECT generate_invite_token() as test_token;