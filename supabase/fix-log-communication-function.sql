-- Fix for log_communication function parameter order
-- Run this if you get "input parameters after one with a default value must also have defaults" error

-- Drop the existing function first
DROP FUNCTION IF EXISTS log_communication(UUID, TEXT, TEXT, VARCHAR(50), VARCHAR(100), VARCHAR(20), VARCHAR(20), TEXT, TEXT, VARCHAR(50), JSONB, INET, TEXT);

-- Recreate with correct parameter order (required parameters first, then optional ones)
CREATE OR REPLACE FUNCTION log_communication(
    p_user_id UUID,
    p_user_email TEXT,
    p_communication_type VARCHAR(50),
    p_direction VARCHAR(20),
    p_user_name TEXT DEFAULT NULL,
    p_communication_subtype VARCHAR(100) DEFAULT NULL,
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