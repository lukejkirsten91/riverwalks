// Enhanced PDF generation with intelligent component detection
  const generateSmartPDF = async (
    element: HTMLElement, 
    pdf: jsPDF, 
    contentWidth: number, 
    contentHeight: number, 
    margin: number,
    isFirstPage: boolean = false
  ) => {
    console.log('Generating PDF with smart component detection...');
    
    // Force desktop layout for PDF generation
    const originalStyle = element.style.cssText;
    element.style.cssText += `
      width: 800px !important;
      max-width: none !important;
      transform: scale(1) !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
    `;
    
    // Wait for style changes to take effect
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Find all protected components (charts, tables, etc.)
    const protectedElements = element.querySelectorAll('.plotly-graph-div, table, .pdf-component, .bg-blue-50, .bg-green-50, .bg-amber-50, .overflow-x-auto');
    const protectedRegions: Array<{top: number, bottom: number, element: Element}> = [];
    
    protectedElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const elementTop = el.offsetTop;
      const elementBottom = elementTop + rect.height;
      protectedRegions.push({ top: elementTop, bottom: elementBottom, element: el });
    });
    
    // Sort regions by top position
    protectedRegions.sort((a, b) => a.top - b.top);
    
    // Generate canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      width: 800,
      height: element.scrollHeight,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });
    
    // Restore original styles
    element.style.cssText = originalStyle;
    
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    const pixelsPerMM = canvas.height / imgHeight;
    
    console.log(`Content dimensions: ${imgWidth}mm x ${imgHeight}mm`);
    console.log(`Found ${protectedRegions.length} protected components`);
    
    // If content fits on one page, add it directly
    if (imgHeight <= contentHeight) {
      console.log('Content fits on single page');
      if (!isFirstPage) {
        pdf.addPage();
      }
      const imgData = canvas.toDataURL('image/png', 0.9);
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      return;
    }
    
    // Smart pagination with component protection
    console.log('Content requires multiple pages - using smart pagination');
    
    const pageHeightPx = contentHeight * pixelsPerMM;
    let currentY = 0;
    let isFirstPageOfContent = isFirstPage;
    
    while (currentY < canvas.height) {
      let targetY = currentY + pageHeightPx;
      const remainingHeight = canvas.height - currentY;
      
      // If this is near the end, just take the rest
      if (remainingHeight <= pageHeightPx * 1.1) {
        targetY = canvas.height;
      } else {
        // Check if we're cutting through a protected component
        for (const region of protectedRegions) {
          // If the page break would cut through this component
          if (region.top < targetY && region.bottom > targetY) {
            // If the component is small enough to fit on the next page
            const componentHeight = region.bottom - region.top;
            if (componentHeight < pageHeightPx * 0.9) {
              // Move the break to just before this component
              targetY = region.top - (10 * pixelsPerMM); // 10mm padding
              console.log(`Adjusted page break to protect component at ${region.top}px`);
            } else {
              // Component is too large, try to break at a better spot within it
              // Look for natural break points like section boundaries
              const breakPoint = findNaturalBreakPoint(region.element, targetY - region.top);
              if (breakPoint > 0) {
                targetY = region.top + breakPoint;
                console.log(`Found natural break point within large component`);
              }
            }
            break;
          }
        }
      }
      
      const chunkHeight = Math.min(targetY - currentY, remainingHeight);
      const chunkHeightMM = chunkHeight / pixelsPerMM;
      
      console.log(`Creating page chunk: ${currentY}px to ${currentY + chunkHeight}px (${chunkHeightMM}mm)`);
      
      // Create canvas for this chunk
      const chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = canvas.width;
      chunkCanvas.height = chunkHeight;
      const chunkCtx = chunkCanvas.getContext('2d');
      
      if (chunkCtx) {
        // Fill with white background
        chunkCtx.fillStyle = '#ffffff';
        chunkCtx.fillRect(0, 0, canvas.width, chunkHeight);
        
        // Draw the chunk content
        chunkCtx.drawImage(
          canvas,
          0, currentY, canvas.width, chunkHeight,
          0, 0, canvas.width, chunkHeight
        );
        
        const chunkImgData = chunkCanvas.toDataURL('image/png', 0.9);
        
        if (!isFirstPageOfContent) {
          pdf.addPage();
        }
        
        pdf.addImage(chunkImgData, 'PNG', margin, margin, imgWidth, chunkHeightMM);
        console.log(`Added page chunk with ${chunkHeightMM}mm height`);
      }
      
      currentY += chunkHeight;
      isFirstPageOfContent = false;
    }
  };
  
  // Helper function to find natural break points within large components
  const findNaturalBreakPoint = (element: Element, targetOffset: number): number => {
    // Look for section boundaries, headers, or spacing elements
    const breakCandidates = element.querySelectorAll('h3, h4, h5, .mb-4, .mb-6, .mb-8, .border-b, .border-t');
    let bestBreak = 0;
    
    breakCandidates.forEach(candidate => {
      const offset = (candidate as HTMLElement).offsetTop - element.scrollTop;
      // If this break point is before our target and better than current best
      if (offset < targetOffset && offset > bestBreak) {
        bestBreak = offset;
      }
    });
    
    return bestBreak;
  };


  The main improvements I've made to prevent chart splitting:

Smart Component Detection: The new generateSmartPDF function actively detects protected components (charts, tables, etc.) and tracks their positions before rendering.
Intelligent Page Breaking: When determining where to break pages, the algorithm now:

Checks if a break would cut through any protected component
If it would, it moves the break to just before that component
For components too large for a single page, it looks for natural break points (headers, section boundaries)


Enhanced CSS Protection: Added more specific CSS rules for Plotly charts including:

Explicit min-height to ensure charts maintain their size
Protection for chart containers using :has() selector
position: relative to ensure proper measurement


Natural Break Point Detection: The findNaturalBreakPoint function looks for semantic boundaries within large components (like headers or section dividers) to make cleaner breaks when a component must be split.

Key features:

Charts and tables will be kept together on a single page when possible
If a component is too large for one page, it will break at a logical point (like between sections)
Small components near page boundaries are moved to the next page entirely
The algorithm logs its decisions for debugging

This should significantly reduce or eliminate chart splitting in your PDFs while maintaining good pagination overall.