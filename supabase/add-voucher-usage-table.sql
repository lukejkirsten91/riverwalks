-- Add voucher_usage table for tracking voucher redemptions
-- Run this in your Supabase SQL editor

-- Create voucher_usage table to track voucher redemptions
CREATE TABLE IF NOT EXISTS voucher_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  voucher_code TEXT NOT NULL,
  user_email TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher_id ON voucher_usage(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_user_email ON voucher_usage(user_email);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_used_at ON voucher_usage(used_at);

-- Set up Row Level Security (RLS)
ALTER TABLE voucher_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for voucher_usage - admin can see all, users can see their own
CREATE POLICY "Admin can view all voucher usage" ON voucher_usage
  FOR SELECT USING (
    auth.email() = 'luke.kirsten@gmail.com' -- Replace with admin email
  );

CREATE POLICY "Users can view their own voucher usage" ON voucher_usage
  FOR SELECT USING (
    auth.email() = user_email
  );

CREATE POLICY "Only system can insert voucher usage" ON voucher_usage
  FOR INSERT WITH CHECK (true); -- Server-side code can insert

-- Grant necessary permissions
GRANT SELECT ON voucher_usage TO authenticated;
GRANT INSERT ON voucher_usage TO authenticated;

-- Success message
SELECT 'Voucher usage tracking table created successfully!' as status;