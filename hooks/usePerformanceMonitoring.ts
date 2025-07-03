import { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
}

export function usePerformanceMonitoring() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
      return;
    }

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Track Core Web Vitals safely
        if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
          const metric: PerformanceMetric = {
            name: entry.name,
            value: entry.duration || (entry as any).value,
            timestamp: Date.now(),
            url: window.location.pathname
          };

          logPerformanceMetric(metric);
        }
      }
    });

    // Observe performance entries
    try {
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (e) {
      console.warn('Performance monitoring not supported in this browser');
    }

    // Monitor custom metrics
    monitorCustomMetrics();

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);
}

function logPerformanceMetric(metric: PerformanceMetric) {
  // Only log significant performance issues to avoid spam
  const isSlowOperation = metric.value > 1000; // More than 1 second
  const isPageLoad = metric.name.includes('navigation') || metric.name.includes('load');
  
  if (isSlowOperation || isPageLoad) {
    console.log('📊 Performance Metric:', {
      metric: metric.name,
      duration: `${Math.round(metric.value)}ms`,
      page: metric.url,
      timestamp: new Date(metric.timestamp).toISOString()
    });

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      sendToMonitoringService(metric);
    }
  }
}

function monitorCustomMetrics() {
  // Monitor subscription check performance
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const startTime = performance.now();
    const url = args[0]?.toString() || '';
    
    try {
      const response = await originalFetch(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log slow API calls (subscription checks, etc.)
      if (duration > 2000 && (url.includes('/api/') || url.includes('supabase'))) {
        logPerformanceMetric({
          name: `api-call-${url.split('/').pop() || 'unknown'}`,
          value: duration,
          timestamp: Date.now(),
          url: window.location.pathname
        });
      }

      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log failed API calls
      logPerformanceMetric({
        name: `api-error-${url.split('/').pop() || 'unknown'}`,
        value: duration,
        timestamp: Date.now(),
        url: window.location.pathname
      });
      
      throw error;
    }
  };
}

function sendToMonitoringService(metric: PerformanceMetric) {
  // Send performance data to monitoring endpoint
  try {
    fetch('/api/log-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric)
    }).catch(e => {
      // Silently fail - don't disrupt user experience for monitoring
      console.debug('Performance logging failed:', e);
    });
  } catch (e) {
    // Silently fail
    console.debug('Performance monitoring error:', e);
  }
}

// Hook for tracking specific user actions
export function trackUserAction(action: string, metadata?: Record<string, any>) {
  if (process.env.NODE_ENV !== 'production') return;

  const actionData = {
    action,
    metadata: metadata || {},
    timestamp: Date.now(),
    url: window.location.pathname,
    userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
  };

  console.log('👤 User Action:', {
    action,
    page: actionData.url,
    timestamp: new Date(actionData.timestamp).toISOString()
  });

  // Send to analytics
  try {
    fetch('/api/log-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionData)
    }).catch(e => console.debug('Action tracking failed:', e));
  } catch (e) {
    console.debug('Action tracking error:', e);
  }
}