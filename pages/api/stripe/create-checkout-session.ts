import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

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

    const { planType, voucherCode } = req.body;

    // Validate plan type
    if (!['yearly', 'lifetime'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Base prices in pence
    const basePrices = {
      yearly: 199, // £1.99
      lifetime: 350, // £3.50
    };

    let finalPrice = basePrices[planType as keyof typeof basePrices];
    let discountApplied = 0;
    let voucherRecord = null;

    // Apply voucher if provided
    if (voucherCode) {
      const { data: voucher, error: voucherError } = await supabase
        .rpc('validate_voucher', {
          voucher_code_input: voucherCode,
          user_uuid: user.id,
          plan_type_input: planType,
        })
        .single();

      const voucherResult = voucher as any;
      if (voucherError || !voucherResult?.is_valid) {
        return res.status(400).json({ 
          error: voucherResult?.error_message || 'Invalid voucher code' 
        });
      }

      discountApplied = voucherResult.final_discount_pence;
      finalPrice = Math.max(0, finalPrice - discountApplied);
      voucherRecord = voucherResult;
    }

    // Check if user already has active subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status, plan_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return res.status(400).json({ 
        error: 'You already have an active subscription' 
      });
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Riverwalks ${planType === 'yearly' ? 'Annual' : 'Lifetime'} Subscription`,
              description: planType === 'yearly' 
                ? 'Access to Riverwalks for one year' 
                : 'Lifetime access to Riverwalks',
            },
            unit_amount: finalPrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/subscription/cancel`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
        voucher_code: voucherCode || '',
        discount_applied_pence: discountApplied.toString(),
        original_price_pence: basePrices[planType as keyof typeof basePrices].toString(),
      },
      allow_promotion_codes: !voucherCode, // Allow Stripe promotion codes if no voucher used
    });

    // Store pending subscription in database
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      plan_type: planType,
      plan_price_pence: basePrices[planType as keyof typeof basePrices],
      status: 'inactive', // Will be updated by webhook
      voucher_code: voucherCode || null,
      discount_applied_pence: discountApplied,
      currency: 'gbp',
    }, {
      onConflict: 'user_id'
    });

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}