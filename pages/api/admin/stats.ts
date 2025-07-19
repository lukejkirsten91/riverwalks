import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../lib/auth';
import { logger } from '../../../lib/logger';
import { rateLimiters } from '../../../lib/rate-limit';

// Create service role client for admin operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply rate limiting for admin endpoints
  if (!rateLimiters.admin(req, res)) {
    return; // Rate limit exceeded
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access from request headers
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(403).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const adminCheck = await requireAdmin(user.id);
    if (!adminCheck.isAdmin) {
      return res.status(403).json({ error: adminCheck.error || 'Admin access required' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    // Load all users using service role
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      logger.error('Error loading users for admin stats', { error: usersError.message });
      return res.status(500).json({ error: 'Failed to load users' });
    }

    // Load subscriptions
    const { data: subscriptionsData, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('*');

    if (subsError) {
      console.error('Error loading subscriptions:', subsError);
      return res.status(500).json({ error: 'Failed to load subscriptions' });
    }

    // Calculate stats
    const totalUsers = usersData.users.length;
    const activeSubscriptions = subscriptionsData?.filter(s => s.status === 'active').length || 0;
    const totalRevenue = subscriptionsData?.reduce((sum, sub) => {
      if (sub.status === 'active') {
        return sum + (sub.subscription_type === 'lifetime' ? 3.49 : 1.99);
      }
      return sum;
    }, 0) || 0;

    const stats = {
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      conversionRate: totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0
    };

    // Create users array with subscription data
    const users = usersData.users.map(user => {
      const subscription = subscriptionsData?.find(s => s.user_id === user.id);
      
      return {
        id: user.id,
        email: user.email || 'No email',
        subscription_type: subscription?.subscription_type || null,
        status: subscription?.status || null,
        created_at: user.created_at,
        current_period_end: subscription?.current_period_end || null
      };
    });

    // Sort users by creation date (newest first)
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.status(200).json({
      stats,
      users
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}