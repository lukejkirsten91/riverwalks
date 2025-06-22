-- Add terms acceptance tracking for legal compliance
-- This creates a simple table to track when users accept terms

-- Create user_agreements table
CREATE TABLE user_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  privacy_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy so users can only see their own agreements
ALTER TABLE user_agreements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own agreement records
CREATE POLICY "Users can view own agreements" ON user_agreements
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own agreement records  
CREATE POLICY "Users can insert own agreements" ON user_agreements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own agreement records (for updated terms)
CREATE POLICY "Users can update own agreements" ON user_agreements
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_agreements_user_id ON user_agreements(user_id);
CREATE INDEX idx_user_agreements_terms_accepted ON user_agreements(terms_accepted_at);

-- Add comment for documentation
COMMENT ON TABLE user_agreements IS 'Tracks user acceptance of terms of service and privacy policy for legal compliance';
COMMENT ON COLUMN user_agreements.terms_accepted_at IS 'Timestamp when user accepted the terms of service';
COMMENT ON COLUMN user_agreements.privacy_accepted_at IS 'Timestamp when user accepted the privacy policy';
COMMENT ON COLUMN user_agreements.ip_address IS 'IP address when agreement was made (optional for legal evidence)';
COMMENT ON COLUMN user_agreements.user_agent IS 'Browser user agent when agreement was made (optional for legal evidence)';