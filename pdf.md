# Playwright PDF Generation for Next.js on Vercel

Implementing Playwright for PDF generation in Next.js applications on Vercel requires navigating serverless constraints while achieving superior rendering quality compared to jsPDF and html2canvas. **The key breakthrough is using @sparticuz/chromium with playwright-core, which reduces the browser binary from 280MB to ~50MB** - making deployment within Vercel's 50MB function limit possible.

## Server-side vs client-side PDF generation approaches

### Why server-side with Playwright wins

**Server-side Playwright** delivers **95% visual fidelity** compared to 70-80% for client-side solutions like jsPDF/html2canvas. Your transition will eliminate common rendering issues: missing fonts, broken layouts, and inconsistent styling across browsers. Playwright uses real browser engines (Chromium/WebKit/Firefox) ensuring pixel-perfect rendering of complex CSS, JavaScript-heavy content, and modern web standards.

**Performance comparison reveals**:
- **Playwright**: 2-8 seconds per PDF (including browser startup), 200-800MB memory per instance
- **jsPDF/html2canvas**: 0.5-3 seconds per PDF, minimal server memory usage
- **Accuracy differential**: Critical for professional documents where layout precision matters

### Client-side limitations you're escaping

Your current jsPDF/html2canvas stack struggles with:
- **Canvas rendering limitations**: Complex CSS Grid, Flexbox, and modern layout techniques
- **Font embedding issues**: Inconsistent typography across browsers
- **Large document performance**: Significant degradation with complex DOM structures
- **Cross-browser compatibility**: Output varies significantly between client browsers

## Technical implementation for Vercel deployment  

### Core serverless solution architecture

The standard Playwright installation fails on Vercel because **Chromium's 280MB binary exceeds Vercel's 50MB function size limit**. The proven solution uses @sparticuz/chromium - a lightweight, serverless-optimized Chromium build.

**Essential dependencies**:
```json
{
  "dependencies": {
    "playwright-core": "^1.40.0",
    "@sparticuz/chromium": "^119.0.0"
  },
  "devDependencies": {
    "playwright": "^1.40.0"
  }
}
```

### Next.js API route implementation

```typescript
// pages/api/pdf/generate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright-core';
import chromiumPkg from '@sparticuz/chromium';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let browser;
  
  try {
    browser = await chromium.launch({
      args: chromiumPkg.args,
      executablePath: await chromiumPkg.executablePath(),
      headless: true,
    });
    
    const page = await browser.newPage();
    await page.setContent(req.body.html, { waitUntil: 'networkidle' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    res.send(pdf);
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  } finally {
    if (browser) await browser.close();
  }
}
```

### Critical Vercel configuration

**vercel.json**:
```json
{
  "functions": {
    "pages/api/pdf/generate.js": {
      "maxDuration": 60,
      "memory": 1769
    }
  },
  "env": {
    "PLAYWRIGHT_BROWSERS_PATH": "/tmp/.cache/ms-playwright"
  }
}
```

**next.config.js**:
```javascript
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium']
  }
}
```

## Preventing page breaks and element splitting

### Modern CSS page break control

The most reliable approach uses modern CSS break properties combined with legacy fallbacks:

```css
@media print {
  /* Prevent element splitting */
  .keep-together {
    break-inside: avoid;
    page-break-inside: avoid; /* Fallback */
  }
  
  /* Prevent orphaned headings */
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid;
    page-break-after: avoid;
  }
  
  /* Force page breaks */
  .new-section {
    break-before: page;
    page-break-before: always;
  }
}
```

### Table row protection strategy

Tables require special handling to prevent awkward row splits:

```css
@media print {
  table {
    border-collapse: collapse;
    break-inside: auto; /* Allow table to break across pages */
  }
  
  tr {
    break-inside: avoid; /* Keep rows together */
    page-break-inside: avoid;
  }
  
  thead {
    display: table-header-group; /* Repeat headers on each page */
  }
}
```

### Advanced positioning for complex layouts

**Critical limitation**: Flexbox and CSS Grid have poor print support. Convert to simpler layouts for PDF:

```css
@media print {
  /* Simplify layouts for reliable PDF rendering */
  .flex-container {
    display: block !important;
  }
  
  .flex-item {
    display: block !important;
    width: 100% !important;
    break-inside: avoid;
    margin-bottom: 10pt;
  }
}
```

## Common Vercel serverless issues and solutions

### Memory limit exceeded errors

**Problem**: Default Vercel memory (1GB Hobby, 1.7GB Pro) insufficient for complex PDFs  
**Solution**: Increase memory allocation and optimize browser arguments

```javascript
const browser = await chromium.launch({
  args: [
    ...chromiumPkg.args,
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--single-process',
    '--disable-gpu'
  ],
  executablePath: await chromiumPkg.executablePath(),
  headless: true,
});

// Block unnecessary resources
await page.route('**/*.{png,jpg,jpeg,gif,svg}', route => route.abort());
```

### Function timeout failures  

**Problem**: PDF generation exceeds Vercel's default timeouts  
**Solution**: Configure appropriate timeouts based on plan:
- **Hobby Plan**: 60 seconds maximum
- **Pro Plan**: Up to 900 seconds (15 minutes)
- **Enterprise Plan**: Up to 900 seconds

### Cold start performance issues

**Problem**: Browser initialization adds 2-5 seconds per serverless invocation  
**Solutions**:
1. **Optimize launch arguments** for faster startup
2. **Consider external browser services** (Browserless) for high-volume scenarios
3. **Implement function warming** for critical applications

### Bundle size limit exceeded

**Problem**: "Serverless Function has exceeded unzipped maximum size"  
**Solutions**:
1. Use `@sparticuz/chromium-min` for even smaller footprint
2. Host browser binaries externally
3. Implement external browser service connection

## Best practices for professional PDF styling

### Typography optimization for print

```css
@media print {
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.4;
    color: #000;
  }
  
  /* Optimize readability */
  p {
    margin: 0 0 10pt 0;
    text-align: justify;
    orphans: 3; /* Minimum lines at bottom of page */
    widows: 3;  /* Minimum lines at top of page */
  }
}
```

### Page margins and header/footer implementation

```javascript
await page.pdf({
  displayHeaderFooter: true,
  headerTemplate: `
    <div style="font-size: 10px; width: 100%; text-align: center;">
      Document Title - Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
  `,
  footerTemplate: `
    <div style="font-size: 10px; width: 100%; text-align: center;">
      © 2024 Company Name - <span class="date"></span>
    </div>
  `,
  margin: {
    top: '2cm',
    bottom: '2cm', 
    left: '1.5cm',
    right: '1.5cm'
  }
});
```

### CSS page size control

```css
@page {
  size: A4;
  margin: 2cm 1.5cm;
}

@page :first {
  margin-top: 3cm; /* Extra space for title page */
}

@page :left {
  margin-left: 3cm; /* Larger gutter for binding */
}
```

## Performance optimization strategies

### Memory management patterns

**Critical cleanup implementation**:
```javascript
async function generatePDF(html) {
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    browser = await chromium.launch(launchOptions);
    context = await browser.newContext();
    page = await context.newPage();
    
    await page.setContent(html);
    const pdf = await page.pdf(pdfOptions);
    
    return pdf;
  } finally {
    // Ensure cleanup in all scenarios
    if (page) await page.close().catch(console.error);
    if (context) await context.close().catch(console.error);
    if (browser) await browser.close().catch(console.error);
  }
}
```

### Resource optimization techniques

1. **Block unnecessary resources** for faster generation:
```javascript
await page.route('**/*.{png,jpg,jpeg,gif,css}', route => route.abort());
```

2. **Use smaller viewport sizes** to reduce memory:
```javascript
await page.setViewportSize({ width: 800, height: 600 });
```

3. **Implement proper wait strategies**:
```javascript
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000); // Allow dynamic content to settle
```

## Complete TypeScript implementation

### Type definitions

```typescript
export interface PDFGenerationOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string; 
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface PDFGenerationRequest {
  url?: string;
  html?: string;
  options?: PDFGenerationOptions;
  filename?: string;
}
```

### React hook for PDF generation

```typescript
import { useState, useCallback } from 'react';

export const usePDFGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPDF = useCallback(async (request: PDFGenerationRequest) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('PDF generation failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = request.filename || 'document.pdf';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { isGenerating, error, downloadPDF };
};
```

## Migration strategy from jsPDF/html2canvas

### Gradual transition approach

1. **Start with server-side API route** for Playwright PDF generation
2. **Keep existing client-side solution** as fallback initially  
3. **Implement feature flags** to gradually roll out Playwright
4. **Compare output quality** and performance metrics
5. **Full migration** once confident in Playwright implementation

### A/B testing implementation

```typescript
const usePDFGeneration = (usePlaywright: boolean = true) => {
  if (usePlaywright) {
    return usePlaywrightPDF();
  } else {
    return useJsPDFGeneration(); // Your existing implementation
  }
};
```

Your migration from jsPDF/html2canvas to Playwright represents a significant upgrade in PDF quality and reliability. While introducing serverless complexity, the superior rendering capabilities and professional output quality justify the implementation effort. The combination of @sparticuz/chromium with proper Vercel configuration creates a production-ready solution that scales efficiently within serverless constraints.