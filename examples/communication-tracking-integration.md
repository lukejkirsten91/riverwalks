# Communication Tracking Integration Examples

## 1. Email Sending (Bulk Email API)

```typescript
// In pages/api/admin/send-bulk-email.ts
import { logEmailCommunication } from '../../../lib/communication-tracking';

// After successfully sending email
const emailTrackingId = await logEmailCommunication({
  userId: user.id, // or undefined for anonymous
  fromEmail: 'noreply@riverwalks.co.uk',
  toEmail: user.email,
  subject: emailSubject,
  bodyHtml: finalHtmlContent,
  bodyText: emailContent,
  templateId: template?.id,
  campaignId: campaignId,
  emailType: 'bulk',
  metadata: {
    campaign_name: campaignName,
    sent_via: 'admin_bulk_send',
    user_count: selectedUsers.length
  }
});
```

## 2. Feedback Form Interactions

```typescript
// In pages/feedback/[id].tsx (when form is viewed)
import { logFormInteraction } from '../../lib/communication-tracking';

useEffect(() => {
  // Track form view
  logFormInteraction({
    userId: user?.id,
    formId: id,
    interactionType: 'form_viewed',
    sessionId: sessionStorage.getItem('session_id'),
    ipAddress: // get from headers,
    userAgent: navigator.userAgent,
    referrer: document.referrer
  });
}, []);

// When form is submitted
const handleSubmit = async (formData) => {
  const responseId = await submitFeedback(formData);
  
  // Track form submission
  await logFormInteraction({
    userId: user?.id,
    formId: id,
    interactionType: 'form_submitted',
    responseId: responseId,
    sessionId: sessionStorage.getItem('session_id'),
    metadata: {
      response_count: Object.keys(formData).length,
      completion_time_seconds: Date.now() - startTime
    }
  });
};
```

## 3. User Account Actions

```typescript
// In authentication pages/middleware
import { logUserActivity } from '../lib/communication-tracking';

// After successful login
await logUserActivity({
  userId: user.id,
  activityType: 'login',
  activityDescription: 'User logged in successfully',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  metadata: {
    login_method: 'email_password', // or 'google', 'apple', etc.
    session_id: sessionId
  }
});

// After profile update
await logUserActivity({
  userId: user.id,
  activityType: 'profile_update',
  activityDescription: 'User updated their profile',
  metadata: {
    fields_changed: changedFields,
    old_values: sanitizedOldValues, // Don't log sensitive data
    new_values: sanitizedNewValues
  }
});

// After subscription change
await logUserActivity({
  userId: user.id,
  activityType: 'subscription_change',
  activityDescription: `Subscription changed from ${oldPlan} to ${newPlan}`,
  metadata: {
    old_plan: oldPlan,
    new_plan: newPlan,
    payment_method: paymentMethod
  }
});
```

## 4. Feedback Request Tracking

```typescript
// In pages/api/admin/send-feedback-request.ts
import { logCommunication, logEmailCommunication } from '../../../lib/communication-tracking';

// When sending feedback request
const communicationLogId = await logCommunication({
  userId: user.id,
  userEmail: user.email,
  userName: user.user_metadata?.display_name,
  communicationType: 'email',
  communicationSubtype: 'feedback_request',
  direction: 'outbound',
  status: 'sent',
  subject: `Feedback Request: ${template.name}`,
  content: emailContent,
  contentType: 'html',
  metadata: {
    template_id: template.id,
    form_id: feedbackForm.id,
    campaign_id: campaignId
  }
});

// Then track the detailed email
await logEmailCommunication({
  userId: user.id,
  fromEmail: 'noreply@riverwalks.co.uk',
  toEmail: user.email,
  subject: `Feedback Request: ${template.name}`,
  bodyHtml: emailContent,
  templateId: template.id,
  campaignId: campaignId,
  emailType: 'feedback_request',
  metadata: {
    form_id: feedbackForm.id,
    expires_at: expiresAt
  }
}, communicationLogId);
```

## 5. API Middleware for Automatic Tracking

```typescript
// Create middleware/communication-tracker.ts
import { logCommunication } from '../lib/communication-tracking';

export function withCommunicationTracking(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    
    // Execute the handler
    const result = await handler(req, res);
    
    // Track API calls that modify data
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const user = req.user; // from auth middleware
      
      if (user) {
        await logCommunication({
          userId: user.id,
          userEmail: user.email,
          communicationType: 'system_notification',
          communicationSubtype: 'api_call',
          direction: 'inbound',
          status: res.statusCode < 400 ? 'received' : 'failed',
          subject: `API ${req.method} ${req.url}`,
          metadata: {
            method: req.method,
            url: req.url,
            status_code: res.statusCode,
            response_time_ms: Date.now() - startTime,
            body_size: JSON.stringify(req.body).length
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    }
    
    return result;
  };
}
```

## 6. Email Status Updates (for delivery tracking)

```typescript
// In webhook handlers for email providers
import { updateEmailStatus } from '../lib/communication-tracking';

// Email delivery webhook
export default async function handler(req, res) {
  const { email_id, event_type, failure_reason } = req.body;
  
  switch (event_type) {
    case 'delivered':
      await updateEmailStatus(email_id, 'delivered');
      break;
    case 'opened':
      await updateEmailStatus(email_id, 'opened');
      break;
    case 'clicked':
      await updateEmailStatus(email_id, 'clicked');
      break;
    case 'failed':
      await updateEmailStatus(email_id, 'failed', failure_reason);
      break;
  }
  
  res.status(200).json({ success: true });
}
```

## Integration Checklist

- [ ] Add tracking to all email sending functions
- [ ] Track feedback form interactions (view, start, submit, abandon)
- [ ] Log user authentication events (login, logout, signup)
- [ ] Track profile and subscription changes
- [ ] Add API call tracking middleware
- [ ] Set up email delivery status webhooks
- [ ] Test GDPR export includes all tracked data

## Privacy Notes

- Always use the service role client for tracking to bypass RLS
- Never log sensitive information (passwords, payment details)
- Sanitize data before logging
- Ensure GDPR compliance with data retention policies