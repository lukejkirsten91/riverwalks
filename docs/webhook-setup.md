# Stripe Webhook Setup Instructions

## 1. Environment Variables Needed

Add these to your deployment environment (Vercel, Netlify, etc.):

```bash
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret (from step 3)
```

## 2. Deploy the Webhook Endpoint

The webhook endpoint is now available at:
```
https://your-domain.com/api/stripe/webhook
```

## 3. Configure Stripe Webhook

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Click "Add endpoint"**
3. **Set endpoint URL**: `https://www.riverwalks.co.uk/api/stripe/webhook`
4. **Select events to listen for**:
   - `checkout.session.completed`
   - `payment_intent.succeeded` 
   - `payment_intent.payment_failed`
5. **Copy the webhook signing secret** (starts with `whsec_`)
6. **Add to environment variables** as `STRIPE_WEBHOOK_SECRET`

## 4. Test the Webhook

1. Make a test payment
2. Check Stripe Dashboard → Webhooks → your endpoint → Recent deliveries
3. Should see successful delivery (200 response)
4. Check Supabase → subscriptions table for new record
5. User should immediately show as Pro when they refresh

## 5. What the Webhook Does

- **Listens for** successful Stripe payments
- **Finds user** by email from checkout session
- **Creates subscription record** in Supabase database
- **Logs payment events** for debugging
- **Automatically grants Pro access** without manual intervention

## 6. Troubleshooting

- **500 errors**: Check server logs for webhook processing errors
- **400 errors**: Usually webhook signature verification issues
- **No subscription created**: Check if user email matches between Stripe and Supabase
- **Wrong subscription type**: Verify price IDs match your Stripe products

## 7. Price ID Mapping

```typescript
'price_1RgTO54CotGwBUxNPQl3SLAP' → 'annual' subscription
'price_1RgTPF4CotGwBUxNiayDAzep' → 'lifetime' subscription
```

Once configured, all future payments will automatically grant Pro access! 🚀