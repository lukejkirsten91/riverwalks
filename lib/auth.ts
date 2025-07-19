import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Create service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Check if a user has admin privileges
 * @param userId - The user ID to check
 * @returns Promise<boolean> - Whether the user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    // Get user from Supabase Auth (simpler approach)
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      logger.error('Error checking admin status', { error: error.message, userId });
      return false;
    }

    const isAdmin = data?.user?.user_metadata?.is_admin === true;
    logger.debug('Admin status checked', { userId, isAdmin });
    
    return isAdmin;
  } catch (error) {
    logger.error('Exception checking admin status', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId 
    });
    return false;
  }
}

/**
 * Check if a user with given email has admin privileges
 * @param email - The user email to check
 * @returns Promise<boolean> - Whether the user is an admin
 */
export async function isEmailAdmin(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      logger.error('Error listing users for admin check', { error: error.message });
      return false;
    }

    const user = data.users.find(u => u.email === email);
    if (!user) {
      logger.warn('User not found for admin check', { email });
      return false;
    }

    return isUserAdmin(user.id);
  } catch (error) {
    logger.error('Exception checking email admin status', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      email 
    });
    return false;
  }
}

/**
 * Set admin status for a user (requires current user to be admin)
 * @param targetUserId - User ID to modify
 * @param isAdmin - Whether to grant or revoke admin status
 * @param currentUserId - ID of user making the change (must be admin)
 * @returns Promise<boolean> - Whether the operation succeeded
 */
export async function setAdminStatus(
  targetUserId: string, 
  isAdmin: boolean, 
  currentUserId: string
): Promise<boolean> {
  try {
    // Check if current user is admin
    const currentUserIsAdmin = await isUserAdmin(currentUserId);
    if (!currentUserIsAdmin) {
      logger.warn('Non-admin attempted to modify admin status', { 
        currentUserId, 
        targetUserId 
      });
      return false;
    }

    // Update user metadata directly using Supabase Auth Admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: { is_admin: isAdmin }
    });

    if (error) {
      logger.error('Error setting admin status', { 
        error: error.message, 
        targetUserId, 
        isAdmin 
      });
      return false;
    }

    logger.info('Admin status updated', { 
      targetUserId, 
      isAdmin, 
      modifiedBy: currentUserId 
    });
    
    return true;
  } catch (error) {
    logger.error('Exception setting admin status', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      targetUserId,
      isAdmin
    });
    return false;
  }
}

/**
 * Middleware function to check admin access for API routes
 * @param userId - User ID to check
 * @returns Promise<{ isAdmin: boolean, error?: string }> 
 */
export async function requireAdmin(userId: string): Promise<{ isAdmin: boolean, error?: string }> {
  try {
    const isAdmin = await isUserAdmin(userId);
    
    if (!isAdmin) {
      logger.warn('Admin access denied', { userId });
      return { 
        isAdmin: false, 
        error: 'Admin privileges required' 
      };
    }

    return { isAdmin: true };
  } catch (error) {
    logger.error('Error in admin middleware', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId 
    });
    return { 
      isAdmin: false, 
      error: 'Authentication error' 
    };
  }
}