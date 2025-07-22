-- Email Templates System
-- Store customizable email templates (welcome, feedback, etc.)
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'welcome', 'feedback_request', etc.
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
  name TEXT NOT NULL,
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
  options JSONB DEFAULT '[]', -- For multiple choice options or rating scale config
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

-- Admin access policies
CREATE POLICY "Admin full access to email_templates" ON email_templates
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Admin full access to feedback_forms" ON feedback_forms
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Admin full access to feedback_questions" ON feedback_questions
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Admin full access to feedback_campaigns" ON feedback_campaigns
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Admin full access to feedback_responses" ON feedback_responses
  FOR ALL USING (auth.is_admin());

CREATE POLICY "Admin full access to feedback_sent_tracking" ON feedback_sent_tracking
  FOR ALL USING (auth.is_admin());

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

-- Insert default welcome email template
INSERT INTO email_templates (name, type, subject, content, variables) VALUES (
  'Default Welcome Email',
  'welcome',
  'Welcome to Riverwalks, {{name}}! 🌊',
  '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Riverwalks</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .logo { font-size: 32px; margin-bottom: 16px; }
        .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌊</div>
            <h1 style="margin: 0; font-size: 28px;">Welcome to Riverwalks, {{name}}!</h1>
        </div>
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 24px;">Hi {{name}},</p>
            
            <p>I''m absolutely thrilled to welcome you to Riverwalks! You''ve just joined a community of passionate geography students who are transforming the way they learn about rivers and landscapes.</p>
            
            <p>Here at Riverwalks, I''ve poured my heart into creating something truly special - a platform that makes GCSE Geography not just easier to understand, but genuinely exciting to explore. Whether you''re planning your next river study or analyzing landscape data, you''re now equipped with tools that will make your geography journey both educational and enjoyable.</p>
            
            <p><strong>Here''s what you can dive into right away:</strong></p>
            <ul>
                <li>🗺️ <strong>Interactive river walks</strong> with detailed geographic analysis</li>
                <li>📊 <strong>Data collection tools</strong> for your field studies</li>
                <li>📚 <strong>Educational resources</strong> aligned with your GCSE curriculum</li>
                <li>🎯 <strong>Progress tracking</strong> to monitor your learning journey</li>
            </ul>
            
            <p>I''m here to support you every step of the way. If you have any questions, suggestions, or just want to share how Riverwalks is helping your studies, I''d love to hear from you!</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://riverwalks.co.uk/river-walks" class="cta-button">Start Exploring River Walks →</a>
            </div>
            
            <p>Happy exploring!</p>
            <p style="margin-top: 30px;"><strong>Luke Kirsten</strong><br>
            <span style="color: #6b7280;">Founder & Geography Enthusiast</span><br>
            <span style="color: #6b7280;">luke@riverwalks.co.uk</span></p>
        </div>
        <div class="footer">
            <p>You''re receiving this because you created an account at Riverwalks.</p>
            <p style="margin: 5px 0 0;">© 2025 Riverwalks. Made with ❤️ for geography students.</p>
        </div>
    </div>
</body>
</html>',
  '["name", "email"]'
);

-- Insert default feedback form with marketing-focused questions
INSERT INTO feedback_forms (name, description, is_active) VALUES (
  'User Satisfaction & Experience Survey',
  'A comprehensive survey to understand user satisfaction, feature preferences, and improvement opportunities for marketing insights.',
  true
) RETURNING id \gset

-- Insert questions for the default feedback form
-- Note: In a real migration, you'd need to handle the form_id differently
-- For now, we'll create a function to insert with the correct form_id

DO $$
DECLARE
  form_uuid UUID;
BEGIN
  -- Get the form ID we just created
  SELECT id INTO form_uuid FROM feedback_forms WHERE name = 'User Satisfaction & Experience Survey' LIMIT 1;
  
  -- Overall satisfaction (key marketing metric)
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'How satisfied are you with Riverwalks overall?', 'rating', '{"scale": 5, "labels": ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"]}', 1, true);
  
  -- Net Promoter Score (critical marketing metric)
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'How likely are you to recommend Riverwalks to a friend or classmate?', 'rating', '{"scale": 10, "labels": ["Not at all likely", "Extremely likely"], "nps": true}', 2, true);
  
  -- Feature satisfaction
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'How would you rate the interactive river walks feature?', 'rating', '{"scale": 5, "labels": ["Poor", "Fair", "Good", "Very Good", "Excellent"]}', 3, true);
  
  -- Educational value (key for marketing to students/teachers)
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'How much has Riverwalks helped improve your understanding of geography?', 'rating', '{"scale": 5, "labels": ["Not at all", "Slightly", "Moderately", "Significantly", "Extremely"]}', 4, true);
  
  -- Usage frequency (engagement metric)
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'How often do you use Riverwalks?', 'multiple_choice', '{"options": ["Daily", "Several times a week", "Weekly", "Monthly", "Rarely"]}', 5, true);
  
  -- Value perception (pricing/subscription marketing)
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'Do you feel Riverwalks provides good value for your geography studies?', 'rating', '{"scale": 5, "labels": ["Poor Value", "Fair Value", "Good Value", "Great Value", "Exceptional Value"]}', 6, true);
  
  -- Feature prioritization
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'Which features do you find most valuable?', 'multiple_choice', '{"options": ["Interactive river walks", "Data collection tools", "Educational resources", "Progress tracking", "Collaboration features"], "multiple": true}', 7, true);
  
  -- Pain points (improvement opportunities)
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'What challenges have you experienced with Riverwalks?', 'multiple_choice', '{"options": ["Too complex to use", "Not enough content", "Technical issues", "Poor mobile experience", "Unclear instructions", "None"], "multiple": true}', 8, false);
  
  -- Open feedback
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'What would you like to see improved or added to Riverwalks?', 'text', '{"placeholder": "Share your suggestions for new features or improvements..."}', 9, false);
  
  -- Usage context (marketing segmentation)
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'How do you primarily use Riverwalks?', 'multiple_choice', '{"options": ["GCSE preparation", "A-Level studies", "General interest", "Teaching/Education", "University studies"]}', 10, true);
  
  -- Discovery channel (marketing attribution)
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'How did you first hear about Riverwalks?', 'multiple_choice', '{"options": ["Google search", "Social media", "Friend/classmate recommendation", "Teacher recommendation", "Educational website", "Other"]}', 11, false);
  
  -- Final testimonial opportunity
  INSERT INTO feedback_questions (form_id, question_text, question_type, options, order_index, required) VALUES
  (form_uuid, 'Would you like to share a brief testimonial about your Riverwalks experience?', 'text', '{"placeholder": "Feel free to share what you love about Riverwalks (this may be used for marketing with your permission)..."}', 12, false);

END $$;

COMMENT ON TABLE email_templates IS 'Customizable email templates for automated emails';
COMMENT ON TABLE feedback_forms IS 'Feedback form definitions with questions and settings';
COMMENT ON TABLE feedback_questions IS 'Individual questions within feedback forms';
COMMENT ON TABLE feedback_campaigns IS 'Tracking of feedback form campaigns sent to users';
COMMENT ON TABLE feedback_responses IS 'User responses to feedback forms';
COMMENT ON TABLE feedback_sent_tracking IS 'Tracking who has been sent feedback requests and completion status';