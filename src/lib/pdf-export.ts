'use client';

import jsPDF from 'jspdf';
import type { ResearchResult, DynamicSection } from '@/lib/state-machine';

// Theme type
export type PDFTheme = 'dark' | 'light';

// Color palettes for themes
const DARK_COLORS = {
    primary: [16, 185, 129] as [number, number, number],     // Emerald/Teal
    background: [10, 10, 10] as [number, number, number],    // Background
    text: [245, 245, 245] as [number, number, number],       // Primary text
    muted: [160, 160, 160] as [number, number, number],      // Muted text
    accent: [20, 184, 166] as [number, number, number],      // Accent teal
    success: [34, 197, 94] as [number, number, number],      // Green for pros
    error: [239, 68, 68] as [number, number, number],        // Red for cons
    cardBg: [25, 25, 25] as [number, number, number],        // Card background
    warning: [245, 158, 11] as [number, number, number],     // Warning/amber
};

const LIGHT_COLORS = {
    primary: [16, 185, 129] as [number, number, number],     // Emerald/Teal
    background: [255, 255, 255] as [number, number, number], // White background
    text: [31, 41, 55] as [number, number, number],          // Dark gray text
    muted: [107, 114, 128] as [number, number, number],      // Gray muted text
    accent: [13, 148, 136] as [number, number, number],      // Darker teal
    success: [22, 163, 74] as [number, number, number],      // Green for pros
    error: [220, 38, 38] as [number, number, number],        // Red for cons
    cardBg: [249, 250, 251] as [number, number, number],     // Light gray card
    warning: [217, 119, 6] as [number, number, number],      // Darker amber
};

// Helper to strip markdown bold
function stripMarkdown(text: string): string {
    return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

// Helper to strip emojis (they don't render well in PDF)
function stripEmojis(text: string): string {
    // Remove emoji characters using surrogate pair detection and common emoji ranges
    // This approach is ES5-compatible
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        
        // Skip high surrogates (emoji are often surrogate pairs)
        if (code >= 0xD800 && code <= 0xDBFF) {
            // Skip the next low surrogate as well
            i++;
            continue;
        }
        
        // Skip common single-char emoji ranges
        if (
            (code >= 0x2600 && code <= 0x26FF) || // Misc symbols
            (code >= 0x2700 && code <= 0x27BF) || // Dingbats
            (code >= 0xFE00 && code <= 0xFE0F) || // Variation selectors
            (code >= 0xE000 && code <= 0xF8FF)    // Private use area
        ) {
            continue;
        }
        
        result += text[i];
    }
    
    return result
        .replace(/\s+/g, ' ')  // Collapse multiple spaces
        .trim();
}

// Helper to add wrapped text and return new Y position
function addWrappedText(
    doc: jsPDF, 
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    lineHeight: number = 6
): number {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
}

// Check if we need a new page (theme-aware)
function createCheckNewPage(colors: typeof DARK_COLORS) {
    return function checkNewPage(doc: jsPDF, y: number, needed: number = 40): number {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        if (y + needed > pageHeight - 20) {
            doc.addPage();
            // Add background to new page
            doc.setFillColor(...colors.background);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            return 30;
        }
        return y;
    };
}

export async function generatePDF(result: ResearchResult, theme: PDFTheme = 'dark'): Promise<void> {
    const COLORS = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
    const checkNewPage = createCheckNewPage(COLORS);
    
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // ============ COVER PAGE ============
    // Background
    doc.setFillColor(...COLORS.background);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header accent bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Logo/Brand area
    y = 50;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ResearchAI', margin, y);
    
    // Title
    y = 90;
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(result.title || 'Research Report', contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 12;

    // Divider
    y += 10;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 60, y);

    // Meta info
    y += 15;
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const timestamp = result.timestamp ? new Date(result.timestamp) : new Date();
    const formattedDate = !isNaN(timestamp.getTime()) 
        ? timestamp.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
        : new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    doc.text(`Generated: ${formattedDate}`, margin, y);

    // ============ CONTENT PAGES ============
    doc.addPage();
    doc.setFillColor(...COLORS.background);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    y = 25;

    // Table of Contents
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Contents', margin, y);
    y += 10;

    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const toc = ['Executive Summary', 'Key Findings'];
    if (result.overview) toc.splice(1, 0, 'Overview');
    if (result.prosAndCons) toc.push('Pros & Cons');
    if (result.pricing) toc.push('Pricing');
    if (result.competitors && result.competitors.length > 0) toc.push('Competitors');
    // Dynamic sections (legacy)
    if (result.comparisonMatrix && result.comparisonMatrix.length > 0) toc.push('Comparison Matrix');
    if (result.marketContext) toc.push('Market Context');
    if (result.implementationNotes) toc.push('Implementation Notes');
    if (result.tcoBreakdown) toc.push('Total Cost of Ownership');
    if (result.negotiationTips && result.negotiationTips.length > 0) toc.push('Negotiation Tips');
    if (result.riskAssessment) toc.push('Risk Assessment');
    if (result.recommendations) toc.push('Recommendations');
    // New dynamic sections
    if (result.sections && result.sections.length > 0) {
        result.sections.forEach(section => {
            if (!toc.includes(section.title)) {
                toc.push(section.title);
            }
        });
    }
    toc.push('Sources & References');

    toc.forEach((item, i) => {
        doc.text(`${i + 1}. ${item}`, margin + 5, y);
        y += 7;
    });

    // ============ EXECUTIVE SUMMARY ============
    y += 15;
    y = checkNewPage(doc, y, 60);
    
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, y);
    y += 8;

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(doc, stripMarkdown(result.summary || ''), margin, y, contentWidth, 5);

    // ============ OVERVIEW (if exists) ============
    if (result.overview) {
        y += 15;
        y = checkNewPage(doc, y, 60);
        
        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Overview', margin, y);
        y += 8;

        doc.setTextColor(...COLORS.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        y = addWrappedText(doc, stripMarkdown(result.overview), margin, y, contentWidth, 5);
    }

    // ============ KEY FINDINGS ============
    y += 15;
    y = checkNewPage(doc, y, 40);

    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Findings', margin, y);
    y += 10;

    result.keyFindings.forEach((finding, i) => {
        y = checkNewPage(doc, y, 25);
        
        // Number badge
        doc.setFillColor(...COLORS.primary);
        doc.circle(margin + 3, y - 1, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}`, margin + 3, y, { align: 'center' });

        // Finding text
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const findingText = stripMarkdown(finding);
        y = addWrappedText(doc, findingText, margin + 10, y, contentWidth - 10, 5);
        y += 5;
    });

    // ============ PROS & CONS ============
    if (result.prosAndCons && (result.prosAndCons.pros.length > 0 || result.prosAndCons.cons.length > 0)) {
        y += 10;
        y = checkNewPage(doc, y, 60);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Pros & Cons', margin, y);
        y += 10;

        const halfWidth = (contentWidth - 10) / 2;

        // Pros header
        doc.setTextColor(...COLORS.success);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ Strengths', margin, y);
        
        // Cons header
        doc.setTextColor(...COLORS.error);
        doc.text('✗ Weaknesses', margin + halfWidth + 10, y);
        y += 8;

        // Content
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const maxRows = Math.max(result.prosAndCons.pros.length, result.prosAndCons.cons.length);
        let prosY = y;
        let consY = y;

        result.prosAndCons.pros.forEach((pro, i) => {
            prosY = checkNewPage(doc, prosY, 15);
            doc.setTextColor(...COLORS.text);
            prosY = addWrappedText(doc, `• ${stripMarkdown(pro)}`, margin, prosY, halfWidth - 5, 4.5);
            prosY += 3;
        });

        result.prosAndCons.cons.forEach((con, i) => {
            consY = checkNewPage(doc, consY, 15);
            doc.setTextColor(...COLORS.text);
            consY = addWrappedText(doc, `• ${stripMarkdown(con)}`, margin + halfWidth + 10, consY, halfWidth - 5, 4.5);
            consY += 3;
        });

        y = Math.max(prosY, consY);
    }

    // ============ PRICING ============
    if (result.pricing) {
        y += 15;
        y = checkNewPage(doc, y, 60);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Pricing', margin, y);
        y += 8;

        doc.setTextColor(...COLORS.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        y = addWrappedText(doc, stripMarkdown(result.pricing.overview), margin, y, contentWidth, 5);
        y += 5;

        if (result.pricing.tiers && result.pricing.tiers.length > 0) {
            const tierWidth = Math.min(50, (contentWidth - 10) / result.pricing.tiers.length);
            
            result.pricing.tiers.forEach((tier, i) => {
                const tierX = margin + (i * (tierWidth + 5));
                y = checkNewPage(doc, y, 25);
                
                // Tier box
                doc.setFillColor(...COLORS.cardBg);
                doc.roundedRect(tierX, y, tierWidth, 20, 2, 2, 'F');
                
                // Tier name
                doc.setTextColor(...COLORS.text);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(tier.name, tierX + tierWidth / 2, y + 6, { align: 'center' });
                
                // Tier price
                doc.setTextColor(...COLORS.primary);
                doc.setFontSize(10);
                doc.text(tier.price, tierX + tierWidth / 2, y + 13, { align: 'center' });
            });
            y += 25;
        }

        if (result.pricing.notes) {
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            y = addWrappedText(doc, result.pricing.notes, margin, y, contentWidth, 4.5);
        }
    }

    // ============ COMPETITORS ============
    if (result.competitors && result.competitors.length > 0) {
        y += 15;
        y = checkNewPage(doc, y, 40);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Competitor Comparison', margin, y);
        y += 10;

        result.competitors.forEach((comp) => {
            y = checkNewPage(doc, y, 20);
            
            doc.setTextColor(...COLORS.accent);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(comp.name, margin, y);
            y += 6;
            
            doc.setTextColor(...COLORS.text);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            y = addWrappedText(doc, stripMarkdown(comp.comparison), margin + 5, y, contentWidth - 10, 4.5);
            y += 5;
        });
    }

    // ============ COMPARISON MATRIX (vendor_selection) ============
    if (result.comparisonMatrix && result.comparisonMatrix.length > 0) {
        y += 15;
        y = checkNewPage(doc, y, 60);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Comparison Matrix', margin, y);
        y += 10;

        result.comparisonMatrix.forEach((entry) => {
            y = checkNewPage(doc, y, 40);
            
            // Option name
            doc.setTextColor(...COLORS.accent);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(entry.option, margin, y);
            
            // Best for
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Best for: ${entry.bestFor}`, margin + 60, y);
            y += 6;
            
            // Scores
            Object.entries(entry.scores).forEach(([criteria, score]) => {
                y = checkNewPage(doc, y, 8);
                doc.setTextColor(...COLORS.muted);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(`${criteria}: `, margin + 5, y);
                doc.setTextColor(...COLORS.primary);
                doc.setFont('helvetica', 'bold');
                doc.text(String(score), margin + 40, y);
                y += 4;
            });
            
            // Highlights
            doc.setTextColor(...COLORS.text);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            y = addWrappedText(doc, stripMarkdown(entry.highlights), margin + 5, y + 2, contentWidth - 10, 4.5);
            y += 8;
        });
    }

    // ============ MARKET CONTEXT (market_research) ============
    if (result.marketContext) {
        y += 15;
        y = checkNewPage(doc, y, 60);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Market Context', margin, y);
        y += 10;

        // Market size and growth
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Market Size:', margin, y);
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', 'bold');
        doc.text(result.marketContext.size, margin + 30, y);
        y += 6;

        doc.setTextColor(...COLORS.muted);
        doc.setFont('helvetica', 'normal');
        doc.text('Growth:', margin, y);
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', 'bold');
        doc.text(result.marketContext.growth, margin + 30, y);
        y += 8;

        // Leaders
        if (result.marketContext.leaders && result.marketContext.leaders.length > 0) {
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Market Leaders:', margin, y);
            y += 5;
            doc.setTextColor(...COLORS.text);
            y = addWrappedText(doc, result.marketContext.leaders.join(', '), margin + 5, y, contentWidth - 10, 4.5);
            y += 5;
        }

        // Trends
        if (result.marketContext.trends && result.marketContext.trends.length > 0) {
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Key Trends:', margin, y);
            y += 5;
            result.marketContext.trends.forEach((trend) => {
                y = checkNewPage(doc, y, 8);
                doc.setTextColor(...COLORS.text);
                doc.text(`• ${trend}`, margin + 5, y);
                y += 5;
            });
        }
    }

    // ============ IMPLEMENTATION NOTES (technical_evaluation) ============
    if (result.implementationNotes) {
        y += 15;
        y = checkNewPage(doc, y, 60);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Implementation Notes', margin, y);
        y += 10;

        // Complexity and time
        const complexityColor = result.implementationNotes.complexity === 'low' 
            ? COLORS.success 
            : result.implementationNotes.complexity === 'high' 
                ? COLORS.error 
                : [245, 158, 11] as [number, number, number];
        
        doc.setTextColor(...complexityColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Complexity: ${result.implementationNotes.complexity.toUpperCase()}`, margin, y);
        doc.setTextColor(...COLORS.muted);
        doc.setFont('helvetica', 'normal');
        doc.text(`Time: ${result.implementationNotes.timeEstimate}`, margin + 60, y);
        y += 8;

        // Prerequisites
        if (result.implementationNotes.prerequisites && result.implementationNotes.prerequisites.length > 0) {
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(9);
            doc.text('Prerequisites:', margin, y);
            y += 5;
            result.implementationNotes.prerequisites.forEach((req) => {
                y = checkNewPage(doc, y, 8);
                doc.setTextColor(...COLORS.text);
                doc.text(`• ${req}`, margin + 5, y);
                y += 5;
            });
            y += 3;
        }

        // Integration points
        if (result.implementationNotes.integrationPoints && result.implementationNotes.integrationPoints.length > 0) {
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(9);
            doc.text('Integration Points:', margin, y);
            y += 5;
            doc.setTextColor(...COLORS.accent);
            y = addWrappedText(doc, result.implementationNotes.integrationPoints.join(', '), margin + 5, y, contentWidth - 10, 4.5);
            y += 5;
        }

        // Security
        if (result.implementationNotes.securityConsiderations && result.implementationNotes.securityConsiderations.length > 0) {
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(9);
            doc.text('Security Considerations:', margin, y);
            y += 5;
            result.implementationNotes.securityConsiderations.forEach((item) => {
                y = checkNewPage(doc, y, 8);
                doc.setTextColor(...COLORS.success);
                doc.text(`✓ ${item}`, margin + 5, y);
                y += 5;
            });
        }
    }

    // ============ TCO BREAKDOWN (pricing_analysis) ============
    if (result.tcoBreakdown) {
        y += 15;
        y = checkNewPage(doc, y, 60);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Cost of Ownership', margin, y);
        y += 10;

        // Cost summary
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Upfront Costs:', margin, y);
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', 'bold');
        doc.text(result.tcoBreakdown.upfront, margin + 40, y);
        y += 6;

        doc.setTextColor(...COLORS.muted);
        doc.setFont('helvetica', 'normal');
        doc.text('Recurring:', margin, y);
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', 'bold');
        doc.text(result.tcoBreakdown.recurring, margin + 40, y);
        y += 6;

        doc.setTextColor(...COLORS.success);
        doc.setFont('helvetica', 'bold');
        doc.text('3-Year Total:', margin, y);
        doc.text(result.tcoBreakdown.threeYearTotal, margin + 40, y);
        y += 8;

        // Hidden costs
        if (result.tcoBreakdown.hidden && result.tcoBreakdown.hidden.length > 0) {
            doc.setTextColor(...COLORS.error);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('⚠ Hidden Costs to Watch:', margin, y);
            y += 5;
            result.tcoBreakdown.hidden.forEach((cost) => {
                y = checkNewPage(doc, y, 8);
                doc.setTextColor(...COLORS.text);
                doc.setFont('helvetica', 'normal');
                doc.text(`• ${cost}`, margin + 5, y);
                y += 5;
            });
        }
    }

    // ============ NEGOTIATION TIPS ============
    if (result.negotiationTips && result.negotiationTips.length > 0) {
        y += 15;
        y = checkNewPage(doc, y, 40);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Negotiation Tips', margin, y);
        y += 10;

        result.negotiationTips.forEach((tip) => {
            y = checkNewPage(doc, y, 12);
            doc.setTextColor(...COLORS.text);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            y = addWrappedText(doc, `💡 ${stripMarkdown(tip)}`, margin, y, contentWidth, 4.5);
            y += 3;
        });
    }

    // ============ RISK ASSESSMENT (deep mode) ============
    if (result.riskAssessment) {
        y += 15;
        y = checkNewPage(doc, y, 60);

        doc.setTextColor(...COLORS.error);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Risk Assessment', margin, y);
        y += 8;

        doc.setFillColor(40, 25, 25);
        const riskLines = doc.splitTextToSize(stripMarkdown(result.riskAssessment), contentWidth - 10);
        const riskHeight = riskLines.length * 5 + 10;
        doc.roundedRect(margin, y - 3, contentWidth, riskHeight, 2, 2, 'F');
        
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(riskLines, margin + 5, y + 3);
        y += riskHeight;
    }

    // ============ RECOMMENDATIONS ============
    if (result.recommendations) {
        y += 15;
        y = checkNewPage(doc, y, 60);

        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Recommendations', margin, y);
        y += 8;

        // Highlight box
        doc.setFillColor(16, 185, 129, 0.1);
        const recLines = doc.splitTextToSize(stripMarkdown(result.recommendations), contentWidth - 10);
        const recHeight = recLines.length * 5 + 10;
        doc.setFillColor(25, 35, 30);
        doc.roundedRect(margin, y - 3, contentWidth, recHeight, 2, 2, 'F');
        
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(recLines, margin + 5, y + 3);
        y += recHeight;
    }

    // ============ DYNAMIC SECTIONS ============
    // Render any agent-defined sections from the sections[] array
    if (result.sections && result.sections.length > 0) {
        for (const section of result.sections) {
            y += 15;
            y = checkNewPage(doc, y, 60);

            // Section title with icon (strip emojis for PDF)
            doc.setTextColor(...COLORS.primary);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            // Strip emojis from title as they don't render well in PDF
            const sectionTitle = stripEmojis(section.title);
            doc.text(sectionTitle, margin, y);
            y += 10;

            // Render content based on section type
            const content = section.content;
            
            if (section.sectionType === 'text' || section.sectionType === 'info' || section.sectionType === 'success') {
                doc.setTextColor(...COLORS.text);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                y = addWrappedText(doc, stripMarkdown(String(content || '')), margin, y, contentWidth, 5);
                
            } else if (section.sectionType === 'warning') {
                // Warning box with highlight
                doc.setFillColor(...COLORS.warning, 0.15);
                const warnLines = doc.splitTextToSize(stripMarkdown(String(content || '')), contentWidth - 10);
                const warnHeight = warnLines.length * 5 + 10;
                doc.setFillColor(45, 35, 25);
                doc.roundedRect(margin, y - 3, contentWidth, warnHeight, 2, 2, 'F');
                doc.setTextColor(...COLORS.text);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(warnLines, margin + 5, y + 3);
                y += warnHeight;
                
            } else if (section.sectionType === 'list' || section.sectionType === 'numbered-list') {
                const items = Array.isArray(content) ? content : [content];
                items.forEach((item, idx) => {
                    y = checkNewPage(doc, y, 15);
                    doc.setTextColor(...COLORS.text);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const bullet = section.sectionType === 'numbered-list' ? `${idx + 1}.` : '•';
                    y = addWrappedText(doc, `${bullet} ${stripMarkdown(String(item))}`, margin + 5, y, contentWidth - 10, 5);
                    y += 3;
                });
                
            } else if (section.sectionType === 'comparison') {
                const compData = Array.isArray(content) ? content : [];
                
                // Build a proper comparison table if multiple entries
                if (compData.length > 0 && compData[0].scores) {
                    // Collect all unique score keys
                    const allScoreKeys = new Set<string>();
                    compData.forEach((entry: any) => {
                        if (entry.scores) {
                            Object.keys(entry.scores).forEach(key => allScoreKeys.add(key));
                        }
                    });
                    const scoreKeys = Array.from(allScoreKeys);
                    
                    // Calculate dimensions
                    const numCols = Math.min(compData.length + 1, 5); // Max 4 options + criteria column
                    const colWidth = contentWidth / numCols;
                    const cellPadding = 3;
                    
                    // Header row with option names
                    y = checkNewPage(doc, y, 25);
                    doc.setFillColor(25, 35, 35);
                    doc.rect(margin, y - 5, contentWidth, 12, 'F');
                    
                    doc.setTextColor(...COLORS.muted);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Criteria', margin + cellPadding, y);
                    
                    doc.setTextColor(...COLORS.accent);
                    compData.slice(0, 4).forEach((entry: any, idx: number) => {
                        const colX = margin + ((idx + 1) * colWidth) + cellPadding;
                        const name = String(entry.option || entry.name || `Option ${idx + 1}`).substring(0, 15);
                        doc.text(name, colX, y);
                    });
                    y += 10;
                    
                    // Score rows
                    scoreKeys.forEach((key, rowIdx) => {
                        y = checkNewPage(doc, y, 8);
                        
                        // Alternate row background
                        if (rowIdx % 2 === 0) {
                            doc.setFillColor(18, 18, 20);
                            doc.rect(margin, y - 4, contentWidth, 8, 'F');
                        }
                        
                        // Criteria name
                        doc.setTextColor(...COLORS.text);
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.text(String(key).substring(0, 15), margin + cellPadding, y);
                        
                        // Scores for each option
                        compData.slice(0, 4).forEach((entry: any, idx: number) => {
                            const colX = margin + ((idx + 1) * colWidth) + cellPadding;
                            const score = entry.scores?.[key] || '-';
                            const scoreStr = String(score).substring(0, 10);
                            
                            // Color code scores
                            const numScore = parseFloat(String(score));
                            if (!isNaN(numScore)) {
                                if (numScore >= 8) {
                                    doc.setTextColor(...COLORS.success);
                                } else if (numScore >= 6) {
                                    doc.setTextColor(...COLORS.warning);
                                } else if (numScore < 5) {
                                    doc.setTextColor(...COLORS.error);
                                } else {
                                    doc.setTextColor(...COLORS.text);
                                }
                            } else {
                                doc.setTextColor(...COLORS.text);
                            }
                            doc.text(scoreStr, colX, y);
                        });
                        y += 7;
                    });
                    y += 8;
                    
                    // "Best for" summary - render as a single row with all descriptions side by side
                    const hasBestFor = compData.slice(0, 4).some((entry: any) => entry.bestFor);
                    if (hasBestFor) {
                        y = checkNewPage(doc, y, 25);
                        
                        // Header for best-for section
                        doc.setFillColor(20, 30, 30);
                        doc.rect(margin, y - 3, contentWidth, 8, 'F');
                        doc.setTextColor(...COLORS.muted);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'bold');
                        doc.text('BEST FOR:', margin + cellPadding, y);
                        y += 8;
                        
                        // Calculate max lines needed for best-for descriptions
                        let maxBestForLines = 0;
                        const bestForTexts: string[][] = [];
                        compData.slice(0, 4).forEach((entry: any) => {
                            const text = entry.bestFor ? stripMarkdown(entry.bestFor) : '';
                            const lines = doc.splitTextToSize(text, colWidth - 8);
                            bestForTexts.push(lines);
                            maxBestForLines = Math.max(maxBestForLines, lines.length);
                        });
                        
                        // Render best-for descriptions in parallel columns
                        const bestForStartY = y;
                        compData.slice(0, 4).forEach((entry: any, idx: number) => {
                            const colX = margin + ((idx + 1) * colWidth) + cellPadding;
                            const lines = bestForTexts[idx];
                            
                            doc.setTextColor(...COLORS.muted);
                            doc.setFontSize(7);
                            doc.setFont('helvetica', 'italic');
                            
                            lines.forEach((line: string, lineIdx: number) => {
                                doc.text(line, colX, bestForStartY + (lineIdx * 3.5));
                            });
                        });
                        
                        y = bestForStartY + (maxBestForLines * 3.5) + 5;
                    }
                    y += 5;
                } else {
                    // Fallback: card-style layout for entries without scores
                    compData.forEach((entry: any, idx: number) => {
                        y = checkNewPage(doc, y, 35);
                        
                        // Card background
                        doc.setFillColor(20, 25, 25);
                        doc.roundedRect(margin, y - 3, contentWidth, 30, 2, 2, 'F');
                        
                        doc.setTextColor(...COLORS.accent);
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.text(entry.option || entry.name || `Option ${idx + 1}`, margin + 5, y + 3);
                        
                        if (entry.bestFor) {
                            doc.setTextColor(...COLORS.muted);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'italic');
                            doc.text(`Best for: ${entry.bestFor}`.substring(0, 70), margin + 5, y + 10);
                        }
                        
                        if (entry.highlights || entry.comparison) {
                            doc.setTextColor(...COLORS.text);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'normal');
                            doc.text(stripMarkdown(entry.highlights || entry.comparison).substring(0, 80) + '...', margin + 5, y + 18);
                        }
                        y += 35;
                    });
                }
                
            } else if (section.sectionType === 'metrics' || section.sectionType === 'table') {
                const tableData = content as Record<string, unknown>;
                
                // Check if it's a structured table with rows and columns
                if (tableData && tableData.columns && tableData.rows) {
                    const columns = tableData.columns as string[];
                    const rows = tableData.rows as unknown[];
                    
                    // Calculate column widths
                    const colWidth = contentWidth / columns.length;
                    
                    // Header row
                    y = checkNewPage(doc, y, 20);
                    doc.setFillColor(...COLORS.cardBg);
                    doc.rect(margin, y - 4, contentWidth, 8, 'F');
                    
                    doc.setTextColor(...COLORS.primary);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    columns.forEach((col, idx) => {
                        const colX = margin + (idx * colWidth) + 2;
                        doc.text(stripEmojis(String(col)).substring(0, 15), colX, y);
                    });
                    y += 8;
                    
                    // Data rows
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    rows.forEach((row, rowIdx) => {
                        y = checkNewPage(doc, y, 8);
                        
                        // Alternate row background
                        if (rowIdx % 2 === 0) {
                            doc.setFillColor(20, 20, 20);
                            doc.rect(margin, y - 4, contentWidth, 7, 'F');
                        }
                        
                        columns.forEach((col, colIdx) => {
                            let cellValue = '';
                            if (Array.isArray(row)) {
                                cellValue = row[colIdx] !== undefined ? String(row[colIdx]) : '';
                            } else if (typeof row === 'object' && row !== null) {
                                cellValue = (row as Record<string, unknown>)[col] !== undefined ? String((row as Record<string, unknown>)[col]) : '';
                            } else {
                                cellValue = String(row);
                            }
                            
                            const colX = margin + (colIdx * colWidth) + 2;
                            doc.setTextColor(...COLORS.text);
                            // Truncate long values
                            const truncated = cellValue.length > 20 ? cellValue.substring(0, 18) + '...' : cellValue;
                            doc.text(truncated, colX, y);
                        });
                        y += 6;
                    });
                    y += 5;
                } else if (tableData && typeof tableData === 'object') {
                    // Fallback: key-value display
                    Object.entries(tableData).forEach(([key, value]) => {
                        y = checkNewPage(doc, y, 15);
                        doc.setTextColor(...COLORS.muted);
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        doc.text(stripEmojis(key) + ':', margin, y);
                        
                        doc.setTextColor(...COLORS.text);
                        doc.setFont('helvetica', 'normal');
                        let valueStr = '';
                        if (Array.isArray(value)) {
                            valueStr = value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
                        } else if (typeof value === 'object' && value !== null) {
                            valueStr = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ');
                        } else {
                            valueStr = String(value);
                        }
                        y = addWrappedText(doc, valueStr, margin + 5, y + 5, contentWidth - 10, 4);
                        y += 3;
                    });
                }
                
            } else if (section.sectionType === 'timeline') {
                const timelineData = Array.isArray(content) ? content : [];
                timelineData.forEach((item: any) => {
                    y = checkNewPage(doc, y, 15);
                    doc.setTextColor(...COLORS.primary);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.text(item.date || '', margin, y);
                    
                    doc.setTextColor(...COLORS.text);
                    doc.setFont('helvetica', 'normal');
                    y = addWrappedText(doc, item.event || '', margin + 30, y, contentWidth - 35, 4);
                    y += 3;
                });
                
            } else if (section.sectionType === 'pros-cons') {
                const pcData = content as { pros?: string[]; cons?: string[] };
                const halfWidth = (contentWidth - 10) / 2;
                let prosY = y;
                let consY = y;
                
                doc.setTextColor(...COLORS.success);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('✓ Strengths', margin, y);
                doc.setTextColor(...COLORS.error);
                doc.text('✗ Weaknesses', margin + halfWidth + 10, y);
                prosY += 8;
                consY += 8;
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                (pcData.pros || []).forEach((pro) => {
                    prosY = checkNewPage(doc, prosY, 12);
                    doc.setTextColor(...COLORS.text);
                    prosY = addWrappedText(doc, `• ${stripMarkdown(String(pro))}`, margin, prosY, halfWidth - 5, 4);
                    prosY += 2;
                });
                (pcData.cons || []).forEach((con) => {
                    consY = checkNewPage(doc, consY, 12);
                    doc.setTextColor(...COLORS.text);
                    consY = addWrappedText(doc, `• ${stripMarkdown(String(con))}`, margin + halfWidth + 10, consY, halfWidth - 5, 4);
                    consY += 2;
                });
                y = Math.max(prosY, consY);
                
            } else if (section.sectionType === 'pricing') {
                const pricingData = content as { overview?: string; tiers?: any[]; notes?: string };
                if (pricingData.overview) {
                    doc.setTextColor(...COLORS.text);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    y = addWrappedText(doc, stripMarkdown(pricingData.overview), margin, y, contentWidth, 5);
                    y += 5;
                }
                if (pricingData.tiers) {
                    pricingData.tiers.forEach((tier: any) => {
                        y = checkNewPage(doc, y, 20);
                        doc.setTextColor(...COLORS.accent);
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.text(`${tier.name}: ${tier.price}`, margin + 5, y);
                        y += 5;
                        if (tier.features) {
                            doc.setTextColor(...COLORS.muted);
                            doc.setFontSize(9);
                            doc.setFont('helvetica', 'normal');
                            y = addWrappedText(doc, tier.features, margin + 10, y, contentWidth - 15, 4);
                        }
                        y += 3;
                    });
                }
                
            } else if (section.sectionType === 'quote') {
                const quoteData = content as { text?: string; source?: string } | string;
                const quoteText = typeof quoteData === 'string' ? quoteData : quoteData?.text || '';
                const quoteSource = typeof quoteData === 'object' ? quoteData?.source : undefined;
                
                doc.setFillColor(...COLORS.cardBg);
                const quoteLines = doc.splitTextToSize(stripMarkdown(quoteText), contentWidth - 20);
                const quoteHeight = quoteLines.length * 5 + 15;
                doc.roundedRect(margin, y - 3, contentWidth, quoteHeight, 2, 2, 'F');
                
                doc.setTextColor(...COLORS.text);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text(`"${quoteLines.join(' ')}"`, margin + 10, y + 5);
                y += quoteHeight - 5;
                
                if (quoteSource) {
                    doc.setTextColor(...COLORS.muted);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`— ${quoteSource}`, margin + 10, y);
                    y += 5;
                }
                
            } else {
                // Default: try to render as text or key-value
                if (Array.isArray(content)) {
                    content.forEach((item, idx) => {
                        y = checkNewPage(doc, y, 12);
                        doc.setTextColor(...COLORS.text);
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'normal');
                        y = addWrappedText(doc, `• ${stripMarkdown(String(item))}`, margin + 5, y, contentWidth - 10, 5);
                        y += 2;
                    });
                } else if (typeof content === 'object' && content !== null) {
                    Object.entries(content).forEach(([key, value]) => {
                        y = checkNewPage(doc, y, 12);
                        doc.setTextColor(...COLORS.muted);
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        doc.text(`${key}:`, margin, y);
                        doc.setTextColor(...COLORS.text);
                        doc.setFont('helvetica', 'normal');
                        const valStr = Array.isArray(value) ? value.join(', ') : String(value);
                        y = addWrappedText(doc, valStr, margin + 5, y + 5, contentWidth - 10, 4);
                        y += 2;
                    });
                } else {
                    doc.setTextColor(...COLORS.text);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    y = addWrappedText(doc, stripMarkdown(String(content || '')), margin, y, contentWidth, 5);
                }
            }
        }
    }

    // ============ SOURCES ============
    y += 15;
    y = checkNewPage(doc, y, 40);

    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Sources & References', margin, y);
    y += 10;

    result.sources.forEach((source, i) => {
        y = checkNewPage(doc, y, 18);
        
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${source.title}`, margin, y);
        y += 5;
        
        doc.setTextColor(...COLORS.accent);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.textWithLink(source.url, margin + 5, y, { url: source.url });
        y += 5;
        
        if (source.snippet) {
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(8);
            y = addWrappedText(doc, source.snippet, margin + 5, y, contentWidth - 10, 4);
        }
        y += 5;
    });

    // ============ FOOTER ON EACH PAGE ============
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(...COLORS.cardBg);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        
        // Footer text
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by ResearchAI', margin, pageHeight - 10);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Save the PDF
    const filename = `${(result.title || 'Research Report').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}
