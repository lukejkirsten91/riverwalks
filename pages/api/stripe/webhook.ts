import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Use service role key for webhook (bypasses RLS)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parser for raw body access
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log the event for audit trail
    await logPaymentEvent(event);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { user_id, plan_type, voucher_code, discount_applied_pence, original_price_pence } = session.metadata!;
  
  const subscriptionEnd = plan_type === 'lifetime' 
    ? null 
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

  // Update subscription status
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: session.subscription as string || null,
      stripe_payment_intent_id: session.payment_intent as string,
      status: 'active',
      subscription_start: new Date().toISOString(),
      subscription_end: subscriptionEnd?.toISOString() || null,
      current_period_start: new Date().toISOString(),
      current_period_end: subscriptionEnd?.toISOString() || null,
      payment_method: 'card', // Stripe checkout default
    })
    .eq('user_id', user_id);

  if (updateError) {
    console.error('Error updating subscription:', updateError);
    throw updateError;
  }

  // Record voucher usage if applicable
  if (voucher_code) {
    await recordVoucherUsage(
      voucher_code,
      user_id,
      parseInt(discount_applied_pence),
      parseInt(original_price_pence),
      session.amount_total || 0,
      session.payment_intent as string
    );
  }

  console.log(`Subscription activated for user ${user_id}, plan: ${plan_type}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment succeeded: ${paymentIntent.id}`);
  // Additional payment success logic if needed
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment failed: ${paymentIntent.id}`);
  
  // Find and update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'unpaid' })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Error updating subscription after payment failure:', error);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by customer ID
  const { data: userSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!userSub) {
    console.error('No user found for customer:', customerId);
    return;
  }

  let status: string;
  switch (subscription.status) {
    case 'active':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
      status = 'canceled';
      break;
    default:
      status = 'inactive';
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('user_id', userSub.user_id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const { data: userSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!userSub) return;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', userSub.user_id);

  if (error) {
    console.error('Error updating canceled subscription:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Invoice payment succeeded: ${invoice.id}`);
  // Handle recurring payment success
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Invoice payment failed: ${invoice.id}`);
  // Handle recurring payment failure
}

async function recordVoucherUsage(
  voucherCode: string,
  userId: string,
  discountApplied: number,
  originalPrice: number,
  finalPrice: number,
  paymentIntentId: string
) {
  // Get voucher ID
  const { data: voucher } = await supabase
    .from('vouchers')
    .select('id')
    .eq('code', voucherCode)
    .single();

  if (!voucher) return;

  // Get user email
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  if (!user.user) return;

  // Record usage
  await supabase.from('voucher_usage').insert({
    voucher_id: voucher.id,
    user_id: userId,
    discount_applied_pence: discountApplied,
    original_price_pence: originalPrice,
    final_price_pence: finalPrice,
    user_email: user.user.email!,
    stripe_payment_intent_id: paymentIntentId,
  });

  // Update voucher usage count
  await supabase
    .from('vouchers')
    .update({ uses_count: supabase.sql`uses_count + 1` })
    .eq('id', voucher.id);
}

async function logPaymentEvent(event: Stripe.Event) {
  // Determine user_id based on event type
  let userId: string | null = null;
  let subscriptionId: string | null = null;
  let amount: number | null = null;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        userId = session.metadata?.user_id || null;
        amount = session.amount_total || null;
        break;
      
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        amount = paymentIntent.amount;
        // Try to find user by payment intent
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id, id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();
        userId = sub?.user_id || null;
        subscriptionId = sub?.id || null;
        break;
    }

    if (userId) {
      await supabase.from('payment_events').insert({
        user_id: userId,
        subscription_id: subscriptionId,
        event_type: mapEventType(event.type),
        stripe_event_id: event.id,
        amount_pence: amount,
        currency: 'gbp',
        stripe_data: event.data.object,
      });
    }
  } catch (error) {
    console.error('Error logging payment event:', error);
    // Don't throw - logging failures shouldn't break webhook processing
  }
}

function mapEventType(stripeEventType: string): string {
  switch (stripeEventType) {
    case 'payment_intent.succeeded':
      return 'payment_succeeded';
    case 'payment_intent.payment_failed':
      return 'payment_failed';
    case 'checkout.session.completed':
      return 'subscription_created';
    case 'customer.subscription.updated':
      return 'subscription_updated';
    case 'customer.subscription.deleted':
      return 'subscription_canceled';
    default:
      return stripeEventType;
  }
}