import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Client-side admin check utility
 * Checks if the current user has admin privileges
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      logger.debug('No authenticated user for admin check');
      return false;
    }

    // Check user metadata for admin status
    const isAdmin = user.user_metadata?.is_admin === true;
    logger.debug('Client admin check', { userId: user.id, isAdmin });
    
    return isAdmin;
  } catch (error) {
    logger.error('Error checking client admin status', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

/**
 * Get current user with admin status
 * @returns Promise<{ user: User | null, isAdmin: boolean }>
 */
export async function getCurrentUserWithAdminStatus() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { user: null, isAdmin: false };
    }

    const isAdmin = user.user_metadata?.is_admin === true;
    
    return { user, isAdmin };
  } catch (error) {
    logger.error('Error getting user with admin status', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return { user: null, isAdmin: false };
  }
}

// Note: React hook moved to separate hook file to avoid import issues