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
    logger.info('Voucher redeem API called');
    
    if (!supabaseAdmin) {
      logger.error('Service role not configured for voucher redemption');
      return res.status(500).json({ error: 'Service role not configured' });
    }

    const { code, email, planType } = req.body;

    if (!code || !email || !planType) {
      return res.status(400).json({ error: 'Voucher code, email, and plan type are required' });
    }

    logger.info('Processing voucher redemption', { planType });

    // Get voucher from database and validate
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (voucherError || !voucher) {
      logger.info('Voucher not found during redemption');
      return res.status(400).json({ 
        error: 'Invalid voucher code' 
      });
    }

    // Check if voucher has expired
    if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
      logger.info('Voucher has expired');
      return res.status(400).json({ 
        error: 'Voucher has expired' 
      });
    }

    // Check usage limits
    if (voucher.uses_count >= voucher.max_uses) {
      logger.info('Voucher usage limit reached');
      return res.status(400).json({ 
        error: 'Voucher usage limit reached' 
      });
    }

    // Check if voucher applies to this plan type
    if (voucher.plan_types && voucher.plan_types.length > 0 && !voucher.plan_types.includes(planType)) {
      logger.info('Voucher not valid for plan type', { planType, validPlans: voucher.plan_types });
      return res.status(400).json({ 
        error: `Voucher is not valid for ${planType} plan` 
      });
    }

    // Increment usage count
    const { error: updateError } = await supabaseAdmin
      .from('vouchers')
      .update({ 
        uses_count: voucher.uses_count + 1
      })
      .eq('id', voucher.id);

    if (updateError) {
      logger.error('Error updating voucher usage', { error: updateError.message });
      return res.status(500).json({ error: 'Failed to redeem voucher' });
    }

    // Log voucher usage
    const { error: logError } = await supabaseAdmin
      .from('voucher_usage')
      .insert({
        voucher_id: voucher.id,
        voucher_code: voucher.code,
        user_email: email,
        plan_type: planType,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        used_at: new Date()
      });

    if (logError) {
      logger.error('Error logging voucher usage', { error: logError.message });
      // Don't fail the request, just log the error
    }

    logger.info('Voucher redeemed successfully', {
      planType,
      usesRemaining: voucher.max_uses - (voucher.uses_count + 1)
    });

    return res.status(200).json({
      success: true,
      message: 'Voucher redeemed successfully',
      voucher: {
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        uses_remaining: voucher.max_uses - (voucher.uses_count + 1)
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Voucher redemption error', { error: errorMessage });
    return res.status(500).json({
      error: 'Failed to redeem voucher',
      details: errorMessage
    });
  }
}