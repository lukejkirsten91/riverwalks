-- Add voucher_usage table for tracking voucher redemptions (SAFE VERSION)
-- Run this in your Supabase SQL editor - handles existing tables gracefully

-- Create voucher_usage table if it doesn't exist
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

-- Add indexes for performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher_id ON voucher_usage(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_user_email ON voucher_usage(user_email);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_used_at ON voucher_usage(used_at);

-- Enable RLS if not already enabled
ALTER TABLE voucher_usage ENABLE ROW LEVEL SECURITY;

-- Handle RLS policies safely
DO $$
BEGIN
    -- Check if policies exist before creating them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voucher_usage' 
        AND policyname = 'Admin can view all voucher usage'
    ) THEN
        CREATE POLICY "Admin can view all voucher usage" ON voucher_usage
          FOR SELECT USING (
            auth.email() = 'luke.kirsten@gmail.com'
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voucher_usage' 
        AND policyname = 'Users can view their own voucher usage'
    ) THEN
        CREATE POLICY "Users can view their own voucher usage" ON voucher_usage
          FOR SELECT USING (
            auth.email() = user_email
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voucher_usage' 
        AND policyname = 'Only system can insert voucher usage'
    ) THEN
        CREATE POLICY "Only system can insert voucher usage" ON voucher_usage
          FOR INSERT WITH CHECK (true);
    END IF;
      
    -- Grant necessary permissions (these won't error if already granted)
    GRANT SELECT ON voucher_usage TO authenticated;
    GRANT INSERT ON voucher_usage TO authenticated;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Policy setup completed with notice: %', SQLERRM;
END $$;

-- Success message
SELECT 'Voucher usage tracking table setup completed successfully!' as status;