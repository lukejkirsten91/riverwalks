import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../../lib/logger';

// Create service role client for voucher operations (bypass RLS)
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
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Service role not configured' });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Voucher code is required' });
    }

    logger.info('Validating voucher code');

    // Get voucher from database
    const { data: voucher, error } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !voucher) {
      logger.info('Voucher not found');
      return res.status(200).json({ 
        valid: false, 
        error: 'Invalid voucher code' 
      });
    }

    // Check if voucher has expired
    if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
      logger.info('Voucher has expired');
      return res.status(200).json({ 
        valid: false, 
        error: 'Voucher has expired' 
      });
    }

    // Check usage limits
    if (voucher.uses_count >= voucher.max_uses) {
      logger.info('Voucher usage limit reached');
      return res.status(200).json({ 
        valid: false, 
        error: 'Voucher usage limit reached' 
      });
    }

    logger.info('Voucher validation successful', {
      discountType: voucher.discount_type,
      usesRemaining: voucher.max_uses - voucher.uses_count
    });

    return res.status(200).json({
      valid: true,
      voucher: {
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        plan_types: voucher.plan_types,
        uses_remaining: voucher.max_uses - voucher.uses_count
      }
    });

  } catch (error) {
    logger.error('Voucher validation error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({
      valid: false,
      error: 'Failed to validate voucher'
    });
  }
}