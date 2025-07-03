import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';
import { getCurrentPrices, getStripeMode } from '../../../lib/stripe-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🚀 Create checkout session called');

  try {
    const { planType, voucherCode, successUrl, cancelUrl } = req.body;

    if (!planType || !successUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get current prices
    const currentPrices = getCurrentPrices();
    const priceId = planType === 'lifetime' ? currentPrices.lifetime : currentPrices.annual;

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    console.log('💰 Plan type:', planType, 'Price ID:', priceId);

    // Base checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl || `${new URL(successUrl).origin}/subscription`,
      metadata: {
        plan_type: planType,
        stripe_mode: getStripeMode(),
      },
    };

    // Apply voucher if provided
    if (voucherCode) {
      console.log('🎫 Checking voucher:', voucherCode);

      // Validate voucher from database
      const { data: voucher, error: voucherError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (voucherError || !voucher) {
        console.log('❌ Invalid voucher:', voucherCode);
        return res.status(400).json({ error: 'Invalid or expired voucher code' });
      }

      // Check if voucher is still valid
      if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
        console.log('❌ Expired voucher:', voucherCode);
        return res.status(400).json({ error: 'Voucher has expired' });
      }

      // Check usage limits
      if (voucher.uses_count >= voucher.max_uses) {
        console.log('❌ Voucher usage limit reached:', voucherCode);
        return res.status(400).json({ error: 'Voucher usage limit reached' });
      }

      // Check if voucher applies to this plan
      if (!voucher.plan_types.includes(planType)) {
        console.log('❌ Voucher not valid for plan:', voucherCode, planType);
        return res.status(400).json({ error: `Voucher not valid for ${planType} plan` });
      }

      // Create or get Stripe coupon
      let stripeCouponId: string;
      
      try {
        // Try to get existing coupon
        const existingCoupon = await stripe.coupons.retrieve(voucherCode.toUpperCase());
        stripeCouponId = existingCoupon.id;
        console.log('✅ Using existing Stripe coupon:', stripeCouponId);
      } catch (error) {
        // Create new Stripe coupon
        console.log('🔨 Creating new Stripe coupon for voucher:', voucherCode);
        
        const couponParams: Stripe.CouponCreateParams = {
          id: voucherCode.toUpperCase(),
          name: `Voucher: ${voucherCode.toUpperCase()}`,
        };

        if (voucher.discount_type === 'percentage') {
          couponParams.percent_off = voucher.discount_value;
        } else {
          couponParams.amount_off = voucher.discount_value; // Amount in pence
          couponParams.currency = 'gbp';
        }

        const newCoupon = await stripe.coupons.create(couponParams);
        stripeCouponId = newCoupon.id;
        console.log('✅ Created Stripe coupon:', stripeCouponId);
      }

      // Add discount to session
      sessionParams.discounts = [
        {
          coupon: stripeCouponId,
        },
      ];

      // Add voucher to metadata
      sessionParams.metadata!.voucher_code = voucherCode.toUpperCase();

      console.log('🎯 Applied voucher to checkout session:', {
        code: voucherCode,
        discountType: voucher.discount_type,
        discountValue: voucher.discount_value,
        stripeCouponId
      });
    }

    // Create checkout session
    console.log('🔄 Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('✅ Checkout session created:', session.id);

    // If voucher was used, increment usage count
    if (voucherCode) {
      // Get current usage count and increment it
      const { data: currentVoucher } = await supabase
        .from('vouchers')
        .select('uses_count')
        .eq('code', voucherCode.toUpperCase())
        .single();

      const { error: updateError } = await supabase
        .from('vouchers')
        .update({ uses_count: (currentVoucher?.uses_count || 0) + 1 })
        .eq('code', voucherCode.toUpperCase());

      if (updateError) {
        console.error('❌ Failed to update voucher usage:', updateError);
        // Don't fail the checkout for this, just log it
      } else {
        console.log('✅ Updated voucher usage count for:', voucherCode);
      }
    }

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('❌ Checkout session creation failed:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}