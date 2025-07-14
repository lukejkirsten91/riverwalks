-- Add marketing consent column to user_agreements table
-- This allows users to control email preferences

-- Add marketing_consent column
ALTER TABLE user_agreements 
ADD COLUMN marketing_consent BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN user_agreements.marketing_consent IS 'Whether user has consented to receive educational updates and marketing emails';

-- Create index for faster lookups on marketing consent
CREATE INDEX idx_user_agreements_marketing_consent ON user_agreements(marketing_consent);