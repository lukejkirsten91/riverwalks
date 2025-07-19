-- Simple admin setup - just sets the admin flag directly
-- No custom functions needed, works around Supabase auth schema restrictions

-- Grant initial admin status to luke.kirsten@gmail.com
DO $$
DECLARE
  luke_user_id UUID;
BEGIN
  -- Find Luke's user ID
  SELECT id INTO luke_user_id
  FROM auth.users 
  WHERE email = 'luke.kirsten@gmail.com';
  
  IF luke_user_id IS NOT NULL THEN
    -- Set admin status in user metadata
    UPDATE auth.users 
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('is_admin', true)
    WHERE id = luke_user_id;
    
    RAISE NOTICE 'Admin status granted to luke.kirsten@gmail.com';
  ELSE
    RAISE NOTICE 'User luke.kirsten@gmail.com not found';
    RAISE NOTICE 'You will need to manually set admin status after creating your account';
  END IF;
END;
$$;

-- Verify the setup
SELECT 
  email,
  (raw_user_meta_data->>'is_admin')::BOOLEAN as is_admin,
  created_at
FROM auth.users 
WHERE email = 'luke.kirsten@gmail.com';

-- Show all users for reference
SELECT 
  email,
  id,
  created_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at;