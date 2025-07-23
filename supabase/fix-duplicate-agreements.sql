-- Fix Duplicate User Agreement Records
-- This script removes duplicate user_agreements records, keeping only the most recent one per user

-- First, let's see what duplicates exist
WITH duplicate_check AS (
  SELECT 
    user_id,
    COUNT(*) as agreement_count,
    array_agg(id ORDER BY terms_accepted_at DESC) as agreement_ids,
    array_agg(terms_accepted_at ORDER BY terms_accepted_at DESC) as agreement_dates
  FROM user_agreements 
  GROUP BY user_id 
  HAVING COUNT(*) > 1
)
SELECT 
  user_id,
  agreement_count,
  agreement_ids[1] as keep_this_id,
  agreement_dates[1] as keep_this_date,
  array_length(agreement_ids, 1) - 1 as records_to_delete
FROM duplicate_check;

-- Delete duplicate records, keeping only the most recent one per user
WITH ranked_agreements AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY terms_accepted_at DESC) as rn
  FROM user_agreements
),
duplicates_to_delete AS (
  SELECT id 
  FROM ranked_agreements 
  WHERE rn > 1
)
DELETE FROM user_agreements 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Report what was cleaned up
SELECT 
  'Cleanup completed' as status,
  COUNT(DISTINCT user_id) as unique_users_remaining,
  COUNT(*) as total_agreements_remaining
FROM user_agreements;