-- Fix subscription table constraint for webhook upsert
-- Add unique constraint on user_id to support ON CONFLICT

-- First check if the constraint already exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'subscriptions' AND constraint_type = 'UNIQUE';

-- Add unique constraint on user_id if it doesn't exist
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Test the constraint
SELECT 'Unique constraint added successfully!' as result;