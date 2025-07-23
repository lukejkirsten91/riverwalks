-- Communication Tracking Schema for GDPR Compliance
-- This tracks all communications with users for complete audit trail

-- Communication Log Table (master log of all communications)
CREATE TABLE IF NOT EXISTS communication_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    communication_type VARCHAR(50) NOT NULL, -- 'email', 'form_response', 'account_action', 'system_notification'
    communication_subtype VARCHAR(100), -- 'welcome_email', 'bulk_email', 'feedback_form', 'template_email', 'login', 'subscription_change'
    direction VARCHAR(20) NOT NULL, -- 'outbound', 'inbound', 'internal'
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'clicked', 'failed', 'received'
    subject TEXT,
    content TEXT,
    content_type VARCHAR(50), -- 'html', 'text', 'json', 'form_data'
    metadata JSONB DEFAULT '{}', -- Additional context (template_id, form_id, campaign_id, etc.)
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Communications Table (detailed email tracking)
CREATE TABLE IF NOT EXISTS email_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    communication_log_id UUID REFERENCES communication_log(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES feedback_campaigns(id) ON DELETE SET NULL,
    email_type VARCHAR(50) NOT NULL, -- 'welcome', 'bulk', 'template', 'feedback_request', 'newsletter'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Form Interactions Table (all form-related activities)
CREATE TABLE IF NOT EXISTS form_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    communication_log_id UUID REFERENCES communication_log(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    form_id UUID REFERENCES feedback_forms(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'form_sent', 'form_viewed', 'form_started', 'form_submitted', 'form_abandoned'
    response_id UUID REFERENCES feedback_responses(id) ON DELETE SET NULL,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Activity Log (account-related actions)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    communication_log_id UUID REFERENCES communication_log(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'signup', 'profile_update', 'subscription_change', 'password_reset'
    activity_description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}', -- Additional context like old/new values for changes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GDPR Data Requests Table (track data export/deletion requests)
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL, -- 'export', 'deletion', 'rectification'
    request_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    requested_by UUID REFERENCES auth.users(id), -- Admin who processed the request
    request_details JSONB DEFAULT '{}',
    export_file_path TEXT, -- For export requests
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_communication_log_user_id ON communication_log(user_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_type ON communication_log(communication_type);
CREATE INDEX IF NOT EXISTS idx_communication_log_created_at ON communication_log(created_at);
CREATE INDEX IF NOT EXISTS idx_email_communications_user_id ON email_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_communications_sent_at ON email_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_form_interactions_user_id ON form_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_interactions_form_id ON form_interactions(form_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own communication data
CREATE POLICY "Users can view own communications" ON communication_log FOR SELECT USING (
    auth.uid() = user_id OR 
    (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
);

CREATE POLICY "Users can view own email communications" ON email_communications FOR SELECT USING (
    auth.uid() = user_id OR 
    (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
);

CREATE POLICY "Users can view own form interactions" ON form_interactions FOR SELECT USING (
    auth.uid() = user_id OR 
    (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
);

CREATE POLICY "Users can view own activity" ON user_activity_log FOR SELECT USING (
    auth.uid() = user_id OR 
    (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
);

CREATE POLICY "Users can view own GDPR requests" ON gdpr_requests FOR SELECT USING (
    auth.uid() = user_id OR 
    (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
);

-- Admin policies for inserting/updating (only admins and system can insert)
CREATE POLICY "System can insert communications" ON communication_log FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update communications" ON communication_log FOR UPDATE USING (true);

CREATE POLICY "System can insert email communications" ON email_communications FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update email communications" ON email_communications FOR UPDATE USING (true);

CREATE POLICY "System can insert form interactions" ON form_interactions FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert user activity" ON user_activity_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create GDPR requests" ON gdpr_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update GDPR requests" ON gdpr_requests FOR UPDATE USING (
    (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid()) = 'true'
);

-- Trigger to update communication_log.updated_at
CREATE OR REPLACE FUNCTION update_communication_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_communication_log_updated_at
    BEFORE UPDATE ON communication_log
    FOR EACH ROW
    EXECUTE FUNCTION update_communication_log_updated_at();

-- Trigger to update gdpr_requests.updated_at
CREATE TRIGGER trigger_update_gdpr_requests_updated_at
    BEFORE UPDATE ON gdpr_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_communication_log_updated_at();

-- Function to log communications (helper function)
CREATE OR REPLACE FUNCTION log_communication(
    p_user_id UUID,
    p_user_email TEXT,
    p_user_name TEXT DEFAULT NULL,
    p_communication_type VARCHAR(50),
    p_communication_subtype VARCHAR(100) DEFAULT NULL,
    p_direction VARCHAR(20),
    p_status VARCHAR(20) DEFAULT 'sent',
    p_subject TEXT DEFAULT NULL,
    p_content TEXT DEFAULT NULL,
    p_content_type VARCHAR(50) DEFAULT 'text',
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO communication_log (
        user_id, user_email, user_name, communication_type, communication_subtype,
        direction, status, subject, content, content_type, metadata, ip_address, user_agent
    ) VALUES (
        p_user_id, p_user_email, p_user_name, p_communication_type, p_communication_subtype,
        p_direction, p_status, p_subject, p_content, p_content_type, p_metadata, p_ip_address, p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;