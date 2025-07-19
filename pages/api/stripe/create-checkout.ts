import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';
import { getCurrentPrices, getStripeMode } from '../../../lib/stripe-config';
import { logger } from '../../../lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  logger.info('Create checkout session initiated');

  try {
    const { planType, voucherCode, successUrl, cancelUrl } = req.body;

    if (!planType || !successUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Map frontend plan types to database plan types
    const planTypeMapping: { [key: string]: string } = {
      'yearly': 'annual',
      'annual': 'annual',
      'lifetime': 'lifetime'
    };

    const dbPlanType = planTypeMapping[planType];
    if (!dbPlanType) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Get current prices
    const currentPrices = getCurrentPrices();
    const priceId = dbPlanType === 'lifetime' ? currentPrices.lifetime : currentPrices.annual;

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    logger.info('Checkout plan configured', { planType, dbPlanType });

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
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Riverwalks ${dbPlanType === 'lifetime' ? 'Lifetime' : 'Annual'} Subscription`,
        },
      },
      metadata: {
        plan_type: dbPlanType,
        stripe_mode: getStripeMode(),
      },
    };

    // Apply voucher if provided
    if (voucherCode) {
      logger.info('Validating voucher code');

      // Validate voucher from database
      const { data: voucher, error: voucherError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (voucherError || !voucher) {
        logger.warn('Invalid voucher code provided');
        return res.status(400).json({ error: 'Invalid or expired voucher code' });
      }

      // Check if voucher is still valid
      if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
        logger.warn('Expired voucher code provided');
        return res.status(400).json({ error: 'Voucher has expired' });
      }

      // Check usage limits
      if (voucher.uses_count >= voucher.max_uses) {
        logger.warn('Voucher usage limit reached');
        return res.status(400).json({ error: 'Voucher usage limit reached' });
      }

      // Check if voucher applies to this plan (use mapped plan type)
      if (!voucher.plan_types.includes(dbPlanType)) {
        logger.warn('Voucher not valid for plan type', { planType: dbPlanType });
        return res.status(400).json({ error: `Voucher not valid for ${planType} plan` });
      }

      // Create or get Stripe coupon
      let stripeCouponId: string;
      
      try {
        // Try to get existing coupon
        const existingCoupon = await stripe.coupons.retrieve(voucherCode.toUpperCase());
        stripeCouponId = existingCoupon.id;
        logger.debug('Using existing Stripe coupon');
      } catch (error) {
        // Create new Stripe coupon
        logger.info('Creating new Stripe coupon');
        
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
        logger.info('Created new Stripe coupon');
      }

      // Add discount to session
      sessionParams.discounts = [
        {
          coupon: stripeCouponId,
        },
      ];

      // Add voucher to metadata
      sessionParams.metadata!.voucher_code = voucherCode.toUpperCase();

      logger.info('Applied voucher to checkout session', {
        discountType: voucher.discount_type,
        discountValue: voucher.discount_value
      });
    }

    // Create checkout session
    logger.info('Creating Stripe checkout session');
    const session = await stripe.checkout.sessions.create(sessionParams);

    logger.info('Checkout session created successfully');

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
        logger.error('Failed to update voucher usage', { error: updateError.message });
        // Don't fail the checkout for this, just log it
      } else {
        logger.info('Updated voucher usage count');
      }
    }

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    logger.error('Checkout session creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'Unknown'
    });
    
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
    });
  }
}