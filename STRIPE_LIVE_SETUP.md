# Stripe Live Payment Setup Guide
*Riverwalks Production Payment Processing*

## 🎯 Overview

This guide covers the steps needed to transition from Stripe test mode to live payment processing for the Riverwalks freemium SaaS platform.

## ✅ Pre-Requirements Checklist

Before switching to live payments, ensure these are completed:

- [x] **Legal Compliance**
  - [x] Terms of Service updated with payment terms
  - [x] Privacy Policy includes payment processing
  - [x] GDPR compliance implemented
  - [x] Refund policy clearly defined

- [x] **Technical Implementation**
  - [x] Webhook handling working correctly
  - [x] Subscription creation automated
  - [x] Error monitoring in place
  - [x] Payment security audit completed

- [ ] **Business Verification** (TO BE COMPLETED)
  - [ ] Company information provided to Stripe
  - [ ] Bank account details verified
  - [ ] Identity verification completed
  - [ ] Business documents submitted

## 🏢 Stripe Business Verification Steps

### Step 1: Company Information
**Location:** Stripe Dashboard → Settings → Business Settings

**Required Information:**
- **Business Name:** Riverwalks (or your legal entity name)
- **Business Type:** Software/Technology Company
- **Business Description:** Educational technology platform for GCSE Geography students
- **Website:** https://riverwalks.co.uk
- **Business Address:** Your registered business address
- **Tax ID/VAT Number:** If applicable

### Step 2: Identity Verification
**Required Documents:**
- Government-issued photo ID (passport/driving license)
- Proof of address (utility bill, bank statement)
- Business registration documents (if incorporated)

### Step 3: Bank Account Verification
**Required:**
- Business bank account details
- Account holder name must match business name
- UK bank account for GBP payouts

### Step 4: Activate Payments
**Final Steps:**
- Complete Stripe's compliance review
- Accept Stripe's terms of service
- Activate live payment processing

## 🔧 Technical Configuration for Live Mode

### Step 1: Update Environment Variables

**Create Production Environment Variables:**
```bash
# Stripe Live Keys (replace with your actual live keys)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Ensure these match your live Stripe account
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Step 2: Update Stripe Webhook for Live Mode

**Webhook Configuration:**
- **URL:** `https://riverwalks.co.uk/api/stripe/webhook`
- **Events to Listen For:**
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

### Step 3: Update Price IDs for Live Products

**Current Test Price IDs (to be replaced):**
```typescript
// These are test price IDs - replace with live versions
const testPriceIds = {
  annual: 'price_1RgTO54CotGwBUxNPQl3SLAP',
  lifetime: 'price_1RgTPF4CotGwBUxNiayDAzep'
};
```

**Action Required:**
1. Create identical products in Stripe live mode
2. Update all references to use live price IDs
3. Test with real payment methods

## 📊 Live Mode Testing Strategy

### Phase 1: Soft Launch Testing
**Duration:** 1-2 weeks
**Scope:** Limited user testing with real payments

**Test Scenarios:**
- [ ] Annual subscription purchase (£1.99)
- [ ] Lifetime subscription purchase (£3.49)
- [ ] Webhook delivery and subscription activation
- [ ] Subscription status verification
- [ ] Premium feature access after payment
- [ ] Refund processing (if needed)

### Phase 2: Full Production Launch
**Duration:** Ongoing
**Scope:** Public availability with monitoring

## 🛡️ Security Considerations for Live Mode

### Payment Security Checklist
- [x] **PCI DSS Compliance:** Stripe handles all card data
- [x] **HTTPS Enforcement:** All payment pages use HTTPS
- [x] **Webhook Security:** Signature verification implemented
- [x] **Environment Separation:** Test and live keys properly separated
- [x] **Error Handling:** No sensitive data in error logs
- [x] **Access Controls:** Limited access to live Stripe keys

### Monitoring & Alerts
- [x] **Error Monitoring:** Production error tracking implemented
- [x] **Performance Monitoring:** Payment flow performance tracked
- [x] **Webhook Monitoring:** Failed webhook delivery alerts
- [ ] **Business Alerts:** Revenue and conversion tracking

## 💰 Pricing Strategy Validation

### Current Pricing Structure
- **Free Tier:** Basic river walk creation and management
- **Annual Subscription:** £1.99/year (premium features)
- **Lifetime Access:** £3.49 one-time payment

### Competitive Analysis
- **Market Research:** Educational software pricing in UK
- **Value Proposition:** Less than 40p per month for annual plan
- **Student Budget:** Affordable for GCSE students and schools

## 📈 Launch Metrics & KPIs

### Business Metrics to Track
- **Conversion Rate:** Free to paid users
- **Revenue:** Monthly and annual recurring revenue
- **Churn Rate:** Subscription cancellations
- **Customer Acquisition Cost:** Marketing efficiency
- **Lifetime Value:** Revenue per customer

### Technical Metrics
- **Payment Success Rate:** >98% target
- **Webhook Processing:** <5 second processing time
- **Error Rate:** <1% payment failures
- **Page Load Time:** <2 seconds for checkout

## 🚨 Risk Management

### Payment Risks
- **Fraud Prevention:** Stripe's built-in fraud detection
- **Chargeback Protection:** Clear refund policy and terms
- **Technical Failures:** Webhook retry logic and monitoring
- **Compliance:** GDPR and UK payment regulations

### Mitigation Strategies
- Comprehensive testing before launch
- Gradual rollout with monitoring
- Clear customer communication
- Responsive customer support

## 📋 Pre-Launch Checklist

### Business Readiness
- [ ] Stripe business verification completed
- [ ] Bank account verified and ready for payouts
- [ ] Tax obligations understood (VAT, corporation tax)
- [ ] Customer support processes established

### Technical Readiness
- [ ] Live Stripe keys configured
- [ ] Webhook endpoints tested with live data
- [ ] Price IDs updated for live products
- [ ] Error monitoring and alerting active
- [ ] Backup and recovery procedures tested

### Legal & Compliance
- [x] Terms of Service finalized
- [x] Privacy Policy updated
- [x] Refund policy published
- [x] GDPR compliance verified
- [ ] Data processing agreements signed

## 🎯 Go-Live Action Plan

### Week 1: Final Preparations
- Complete Stripe business verification
- Update all price IDs to live versions
- Configure live webhook endpoints
- Final security and compliance review

### Week 2: Soft Launch
- Enable live payments for testing
- Process test transactions with real cards
- Monitor webhook delivery and processing
- Verify subscription activation end-to-end

### Week 3: Production Launch
- Public announcement of premium features
- Monitor conversion rates and technical metrics
- Respond to any customer support issues
- Optimize based on real user feedback

## 📞 Support & Resources

### Stripe Support
- **Documentation:** https://stripe.com/docs
- **Support Chat:** Available in Stripe Dashboard
- **Phone Support:** Available for live accounts

### Internal Resources
- **Technical Lead:** Responsible for webhook and integration issues
- **Business Owner:** Handles Stripe account and verification
- **Customer Support:** Manages payment-related user inquiries

---

*This document should be updated as verification progresses and live payments are activated.*