import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Voucher code is required' });
    }

    console.log('🎫 Validating voucher:', code);

    // Get voucher from database
    const { data: voucher, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !voucher) {
      console.log('❌ Voucher not found:', code);
      return res.status(200).json({ 
        valid: false, 
        error: 'Invalid voucher code' 
      });
    }

    // Check if voucher has expired
    if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
      console.log('❌ Voucher expired:', code);
      return res.status(200).json({ 
        valid: false, 
        error: 'Voucher has expired' 
      });
    }

    // Check usage limits
    if (voucher.uses_count >= voucher.max_uses) {
      console.log('❌ Voucher usage limit reached:', code);
      return res.status(200).json({ 
        valid: false, 
        error: 'Voucher usage limit reached' 
      });
    }

    console.log('✅ Voucher is valid:', {
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      uses_remaining: voucher.max_uses - voucher.uses_count
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
    console.error('❌ Voucher validation error:', error);
    return res.status(500).json({
      valid: false,
      error: 'Failed to validate voucher'
    });
  }
}