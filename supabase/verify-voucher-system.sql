-- Verify voucher system setup
-- Run this to check if all tables and policies are properly configured

-- Check if voucher_usage table exists
SELECT 
  'voucher_usage table exists' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'voucher_usage'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check voucher_usage table structure
SELECT 
  'voucher_usage columns' as check_name,
  STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_name = 'voucher_usage';

-- Check RLS policies on voucher_usage
SELECT 
  'voucher_usage RLS policies' as check_name,
  COUNT(*) || ' policies configured' as status
FROM pg_policies 
WHERE tablename = 'voucher_usage';

-- List all policies on voucher_usage
SELECT 
  policyname as policy_name,
  cmd as command,
  CASE WHEN roles = '{authenticated}' THEN 'authenticated users'
       WHEN roles = '{anon}' THEN 'anonymous users'
       ELSE array_to_string(roles, ', ') END as applies_to
FROM pg_policies 
WHERE tablename = 'voucher_usage'
ORDER BY policyname;

-- Check if indexes exist
SELECT 
  'voucher_usage indexes' as check_name,
  COUNT(*) || ' indexes configured' as status
FROM pg_indexes 
WHERE tablename = 'voucher_usage';

-- Test voucher table access
SELECT 
  'vouchers table access' as check_name,
  CASE WHEN EXISTS (SELECT 1 FROM vouchers LIMIT 1) 
       THEN '✅ ACCESSIBLE' 
       ELSE '❌ NO ACCESS OR EMPTY' END as status;

-- Show sample vouchers if any exist
SELECT 
  'Sample vouchers' as info,
  code,
  discount_type,
  discount_value,
  max_uses,
  uses_count,
  is_active
FROM vouchers 
WHERE is_active = true
LIMIT 5;

SELECT 'Voucher system verification completed!' as final_status;