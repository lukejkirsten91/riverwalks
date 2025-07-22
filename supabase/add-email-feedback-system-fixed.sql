-- Email Templates System
-- Store customizable email templates (welcome, feedback, etc.)
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'welcome', 'feedback_request', 'newsletter', etc.
  subject TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML content with variables like {{name}}
  variables JSONB DEFAULT '[]', -- Array of available variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_email_templates_type ON email_templates(type);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- Feedback Forms System
-- Main feedback form definitions
CREATE TABLE feedback_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions within feedback forms
CREATE TABLE feedback_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'rating', 'text', 'multiple_choice', 'yes_no'
  options JSONB DEFAULT '{}', -- For multiple choice options or rating scale config
  order_index INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback campaigns (when forms are sent out)
CREATE TABLE feedback_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sent_to JSONB NOT NULL, -- Array of user IDs who were sent this campaign
  sent_count INTEGER DEFAULT 0,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Individual feedback responses
CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES feedback_campaigns(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  responses JSONB NOT NULL, -- Array of {question_id, answer}
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracking who has been sent feedback requests and their status
CREATE TABLE feedback_sent_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES feedback_forms(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES feedback_campaigns(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_opened_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  response_id UUID REFERENCES feedback_responses(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX idx_feedback_questions_form_id ON feedback_questions(form_id);
CREATE INDEX idx_feedback_questions_order ON feedback_questions(form_id, order_index);
CREATE INDEX idx_feedback_responses_form_id ON feedback_responses(form_id);
CREATE INDEX idx_feedback_responses_user_id ON feedback_responses(user_id);
CREATE INDEX idx_feedback_responses_campaign_id ON feedback_responses(campaign_id);
CREATE INDEX idx_feedback_sent_tracking_user_form ON feedback_sent_tracking(user_id, form_id);
CREATE INDEX idx_feedback_sent_tracking_campaign ON feedback_sent_tracking(campaign_id);

-- Add RLS policies for security
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_sent_tracking ENABLE ROW LEVEL SECURITY;

-- Create a helper function to check if current user is admin
-- This checks the user metadata for is_admin flag
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_is_admin BOOLEAN := FALSE;
BEGIN
  -- Get the current user's metadata and check admin flag
  SELECT COALESCE((raw_user_meta_data->>'is_admin')::BOOLEAN, FALSE)
  INTO user_is_admin
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN user_is_admin;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Admin access policies using the is_admin() function
CREATE POLICY "Admin full access to email_templates" ON email_templates
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to feedback_forms" ON feedback_forms
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to feedback_questions" ON feedback_questions
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to feedback_campaigns" ON feedback_campaigns
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to feedback_responses" ON feedback_responses
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to feedback_sent_tracking" ON feedback_sent_tracking
  FOR ALL USING (is_admin());

-- User access policies (users can submit their own responses)
CREATE POLICY "Users can view active feedback forms" ON feedback_forms
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view questions for active forms" ON feedback_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_forms 
      WHERE id = form_id AND is_active = true
    )
  );

CREATE POLICY "Users can insert their own feedback responses" ON feedback_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback responses" ON feedback_responses
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE email_templates IS 'Customizable email templates for automated emails';
COMMENT ON TABLE feedback_forms IS 'Feedback form definitions with questions and settings';
COMMENT ON TABLE feedback_questions IS 'Individual questions within feedback forms';
COMMENT ON TABLE feedback_campaigns IS 'Tracking of feedback form campaigns sent to users';
COMMENT ON TABLE feedback_responses IS 'User responses to feedback forms';
COMMENT ON TABLE feedback_sent_tracking IS 'Tracking who has been sent feedback requests and completion status';