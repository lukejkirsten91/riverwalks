-- Grant Free Subscription for Testing
-- This script gives ljkirsten91@gmail.com a free subscription for testing the freemium flow

-- First, find the user ID for ljkirsten91@gmail.com
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get user ID for ljkirsten91@gmail.com
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'ljkirsten91@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email ljkirsten91@gmail.com not found';
    END IF;
    
    -- Check if subscription already exists
    IF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = target_user_id) THEN
        -- Update existing subscription to free/basic
        UPDATE subscriptions 
        SET 
            subscription_type = 'free',
            status = 'active',
            stripe_customer_id = NULL,
            stripe_price_id = NULL,
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '1 year',
            updated_at = NOW()
        WHERE user_id = target_user_id;
        
        RAISE NOTICE 'Updated existing subscription for ljkirsten91@gmail.com to free tier';
    ELSE
        -- Create new free subscription
        INSERT INTO subscriptions (
            user_id,
            subscription_type,
            status,
            stripe_customer_id,
            stripe_price_id,
            current_period_start,
            current_period_end,
            created_at,
            updated_at
        ) VALUES (
            target_user_id,
            'free',
            'active',
            NULL,
            NULL,
            NOW(),
            NOW() + INTERVAL '1 year',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created new free subscription for ljkirsten91@gmail.com';
    END IF;
    
    -- Show the result
    RAISE NOTICE 'User ID: %', target_user_id;
    RAISE NOTICE 'Subscription created/updated successfully';
END $$;

-- Verify the subscription was created/updated
SELECT 
    u.email,
    s.subscription_type,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.created_at,
    s.updated_at
FROM auth.users u
JOIN subscriptions s ON u.id = s.user_id
WHERE u.email = 'ljkirsten91@gmail.com';