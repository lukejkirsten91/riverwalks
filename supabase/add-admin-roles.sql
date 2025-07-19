-- Add admin role system to replace hardcoded email checks
-- This creates a secure role-based access control system

-- Add admin_role column to user metadata
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB DEFAULT '{}';

-- Create admin helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    COALESCE(
      (raw_user_meta_data->>'is_admin')::BOOLEAN,
      FALSE
    ) 
  FROM auth.users 
  WHERE id = user_id;
$$;

-- Create function to set admin status (can only be run by current admin or system)
CREATE OR REPLACE FUNCTION auth.set_admin_status(
  target_user_id UUID,
  is_admin BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is admin or this is the initial setup
  IF NOT auth.is_admin() AND EXISTS (SELECT 1 FROM auth.users WHERE (raw_user_meta_data->>'is_admin')::BOOLEAN = TRUE) THEN
    RAISE EXCEPTION 'Only admins can modify admin status';
  END IF;
  
  -- Update user metadata
  UPDATE auth.users 
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('is_admin', is_admin)
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant initial admin status to luke.kirsten@gmail.com (one-time setup)
DO $$
DECLARE
  luke_user_id UUID;
BEGIN
  -- Find Luke's user ID
  SELECT id INTO luke_user_id
  FROM auth.users 
  WHERE email = 'luke.kirsten@gmail.com';
  
  IF luke_user_id IS NOT NULL THEN
    -- Set admin status
    UPDATE auth.users 
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('is_admin', true)
    WHERE id = luke_user_id;
    
    RAISE NOTICE 'Admin status granted to luke.kirsten@gmail.com';
  ELSE
    RAISE NOTICE 'User luke.kirsten@gmail.com not found - admin status will need to be set manually';
  END IF;
END;
$$;

-- Create RLS policies that use the admin function instead of hardcoded emails

-- Update subscriptions table RLS policy
DROP POLICY IF EXISTS "Admin full access to subscriptions" ON subscriptions;
CREATE POLICY "Admin full access to subscriptions" ON subscriptions
  FOR ALL USING (auth.is_admin());

-- Update vouchers table RLS policy  
DROP POLICY IF EXISTS "Admin access to vouchers" ON vouchers;
CREATE POLICY "Admin access to vouchers" ON vouchers
  FOR ALL USING (auth.is_admin());

-- Verify the setup
SELECT 
  email,
  (raw_user_meta_data->>'is_admin')::BOOLEAN as is_admin,
  raw_user_meta_data
FROM auth.users 
WHERE (raw_user_meta_data->>'is_admin')::BOOLEAN = TRUE;