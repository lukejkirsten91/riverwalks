import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

    const { code, email, planType } = req.body;

    if (!code || !email || !planType) {
      return res.status(400).json({ error: 'Voucher code, email, and plan type are required' });
    }

    console.log('🎫 Redeeming voucher:', { code, email, planType });

    // Get voucher from database and validate
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (voucherError || !voucher) {
      console.log('❌ Voucher not found:', code);
      return res.status(400).json({ 
        error: 'Invalid voucher code' 
      });
    }

    // Check if voucher has expired
    if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
      console.log('❌ Voucher expired:', code);
      return res.status(400).json({ 
        error: 'Voucher has expired' 
      });
    }

    // Check usage limits
    if (voucher.uses_count >= voucher.max_uses) {
      console.log('❌ Voucher usage limit reached:', code);
      return res.status(400).json({ 
        error: 'Voucher usage limit reached' 
      });
    }

    // Check if voucher applies to this plan type
    if (voucher.plan_types && voucher.plan_types.length > 0 && !voucher.plan_types.includes(planType)) {
      console.log('❌ Voucher not valid for plan type:', { code, planType, validPlans: voucher.plan_types });
      return res.status(400).json({ 
        error: `Voucher is not valid for ${planType} plan` 
      });
    }

    // Increment usage count
    const { error: updateError } = await supabaseAdmin
      .from('vouchers')
      .update({ 
        uses_count: voucher.uses_count + 1,
        updated_at: new Date()
      })
      .eq('id', voucher.id);

    if (updateError) {
      console.error('❌ Error updating voucher usage:', updateError);
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
      console.error('❌ Error logging voucher usage:', logError);
      // Don't fail the request, just log the error
    }

    console.log('✅ Voucher redeemed successfully:', {
      code: voucher.code,
      email,
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
    console.error('❌ Voucher redemption error:', error);
    return res.status(500).json({
      error: 'Failed to redeem voucher'
    });
  }
}