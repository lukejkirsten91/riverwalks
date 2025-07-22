import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { isUserAdmin } from '../../../lib/auth';
import { logger } from '../../../lib/logger';

// Create service role client for admin operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    // Check admin privileges
    const { isAdmin, error: adminError } = await requireAdmin(user.id);
    if (!isAdmin) {
      logger.warn('Non-admin user attempted to update user name', { 
        userId: user.id,
        email: user.email 
      });
      return res.status(403).json({ error: adminError || 'Admin privileges required' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    // Validate request body
    const { userId, first_name, last_name, display_name } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Validate that at least one name field is provided
    if (!first_name && !last_name && !display_name) {
      return res.status(400).json({ error: 'At least one name field must be provided' });
    }

    // Get current user data to preserve existing metadata
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError || !userData.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare updated metadata
    const currentMetadata = userData.user.user_metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      first_name: first_name?.trim() || null,
      last_name: last_name?.trim() || null,
      display_name: display_name?.trim() || null
    };

    // Remove null/empty values
    Object.keys(updatedMetadata).forEach(key => {
      if (updatedMetadata[key] === null || updatedMetadata[key] === '') {
        delete updatedMetadata[key];
      }
    });

    // Update user metadata
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata
    });

    if (updateError) {
      logger.error('Failed to update user metadata', { 
        error: updateError,
        userId,
        adminId: user.id 
      });
      return res.status(500).json({ error: 'Failed to update user name' });
    }

    logger.info('User name updated successfully', {
      adminId: user.id,
      adminEmail: user.email,
      targetUserId: userId,
      targetUserEmail: userData.user.email,
      updatedFields: {
        first_name: updatedMetadata.first_name || 'removed',
        last_name: updatedMetadata.last_name || 'removed',
        display_name: updatedMetadata.display_name || 'removed'
      }
    });

    res.status(200).json({ 
      success: true, 
      message: 'User name updated successfully',
      user: {
        id: userId,
        first_name: updatedMetadata.first_name,
        last_name: updatedMetadata.last_name,
        display_name: updatedMetadata.display_name
      }
    });

  } catch (error) {
    logger.error('Failed to update user name', { error });
    res.status(500).json({ 
      error: 'Failed to update user name',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function for admin check
async function requireAdmin(userId: string): Promise<{ isAdmin: boolean, error?: string }> {
  const isAdmin = await isUserAdmin(userId);
  
  if (!isAdmin) {
    return { isAdmin: false, error: 'Admin privileges required' };
  }
  return { isAdmin: true };
}