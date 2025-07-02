import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient<Database>({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { voucherCode, planType } = req.body;

    if (!voucherCode || !planType) {
      return res.status(400).json({ error: 'Voucher code and plan type are required' });
    }

    if (!['yearly', 'lifetime'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Use the validation function from the database
    const { data: validation, error } = await supabase
      .rpc('validate_voucher', {
        voucher_code_input: voucherCode,
        user_uuid: user.id,
        plan_type_input: planType,
      })
      .single();

    if (error) {
      console.error('Error validating voucher:', error);
      return res.status(500).json({ error: 'Failed to validate voucher' });
    }

    const result = validation as any;
    if (!result.is_valid) {
      return res.status(400).json({ 
        error: result.error_message || 'Invalid voucher code',
        isValid: false 
      });
    }

    // Calculate final price
    const basePrice = planType === 'yearly' ? 199 : 350; // in pence
    const finalPrice = Math.max(0, basePrice - result.final_discount_pence);

    res.status(200).json({
      isValid: true,
      discountType: result.discount_type,
      discountValue: result.discount_value,
      discountAmountPence: result.final_discount_pence,
      originalPricePence: basePrice,
      finalPricePence: finalPrice,
      savedAmount: result.final_discount_pence,
      savedPercentage: Math.round((result.final_discount_pence / basePrice) * 100),
    });

  } catch (error) {
    console.error('Error in voucher validation endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}