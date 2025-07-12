declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Initialize Google Analytics
export const initGA = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics Measurement ID not found');
    return;
  }

  // Load gtag script
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      page_title: document.title,
      page_location: window.location.href,
    });
  `;
  document.head.appendChild(script2);
};

// Track page views
export const trackPageView = (url: string, title?: string) => {
  if (!GA_MEASUREMENT_ID || typeof window.gtag === 'undefined') return;
  
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: title || document.title,
    page_location: url,
  });
};

// Track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (!GA_MEASUREMENT_ID || typeof window.gtag === 'undefined') return;
  
  window.gtag('event', eventName, {
    event_category: 'engagement',
    ...parameters,
  });
};

// Track user signup
export const trackSignup = (method: string = 'google') => {
  trackEvent('sign_up', {
    method,
    event_category: 'authentication',
  });
};

// Track subscription events
export const trackPurchase = (transactionId: string, value: number, currency: string = 'GBP') => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    event_category: 'ecommerce',
  });
};

// Track form submissions
export const trackFormSubmission = (formName: string, success: boolean = true) => {
  trackEvent('form_submit', {
    form_name: formName,
    success,
    event_category: 'engagement',
  });
};

// Track button clicks
export const trackButtonClick = (buttonName: string, location: string) => {
  trackEvent('click', {
    button_name: buttonName,
    click_location: location,
    event_category: 'engagement',
  });
};

// Track file downloads/exports
export const trackFileDownload = (fileType: string, fileName?: string) => {
  trackEvent('file_download', {
    file_type: fileType,
    file_name: fileName,
    event_category: 'engagement',
  });
};

// Track search events
export const trackSearch = (searchTerm: string, resultsCount?: number) => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
    event_category: 'engagement',
  });
};

// Track video/tutorial engagement
export const trackVideoPlay = (videoName: string, progress?: number) => {
  trackEvent('video_play', {
    video_title: videoName,
    progress,
    event_category: 'engagement',
  });
};

// Track collaboration events
export const trackCollaboration = (action: string, collaboratorCount?: number) => {
  trackEvent('collaboration', {
    action,
    collaborator_count: collaboratorCount,
    event_category: 'collaboration',
  });
};

// Track educational progress
export const trackEducationalProgress = (milestone: string, level?: string) => {
  trackEvent('educational_progress', {
    milestone,
    level,
    event_category: 'education',
  });
};

// Enhanced ecommerce events
export const trackViewItem = (itemId: string, itemName: string, price: number) => {
  trackEvent('view_item', {
    currency: 'GBP',
    value: price,
    items: [{
      item_id: itemId,
      item_name: itemName,
      item_category: 'subscription',
      price,
      quantity: 1
    }]
  });
};

export const trackBeginCheckout = (items: any[], source?: string) => {
  const value = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  trackEvent('begin_checkout', {
    currency: 'GBP',
    value,
    items,
    source
  });
};

export const trackAddPaymentInfo = (paymentType: string) => {
  trackEvent('add_payment_info', {
    currency: 'GBP',
    payment_type: paymentType,
    event_category: 'ecommerce'
  });
};

// Track PDF downloads and exports
export const trackReportGeneration = (reportType: string, isSuccessful: boolean = true) => {
  trackEvent('generate_report', {
    report_type: reportType,
    success: isSuccessful,
    event_category: 'report_generation'
  });
};