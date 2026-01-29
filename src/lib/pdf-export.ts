'use client';

import jsPDF from 'jspdf';
import type { ResearchResult } from '@/lib/state-machine';

// Colors
const COLORS = {
    primary: [16, 185, 129] as [number, number, number],     // Emerald/Teal
    dark: [10, 10, 10] as [number, number, number],          // Background
    text: [245, 245, 245] as [number, number, number],       // Primary text
    muted: [160, 160, 160] as [number, number, number],      // Muted text
    accent: [20, 184, 166] as [number, number, number],      // Accent teal
    success: [34, 197, 94] as [number, number, number],      // Green for pros
    error: [239, 68, 68] as [number, number, number],        // Red for cons
    cardBg: [25, 25, 25] as [number, number, number],        // Card background
};

// Helper to strip markdown bold
function stripMarkdown(text: string): string {
    return text.replace(/\*\*([^*]+)\*\*/g, '$1');
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

// Check if we need a new page
function checkNewPage(doc: jsPDF, y: number, needed: number = 40): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 20) {
        doc.addPage();
        return 30;
    }
    return y;
}

export async function generatePDF(result: ResearchResult): Promise<void> {
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
    doc.setFillColor(...COLORS.dark);
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
    doc.text(`Generated: ${new Date(result.timestamp).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}`, margin, y);

    // ============ CONTENT PAGES ============
    doc.addPage();
    doc.setFillColor(...COLORS.dark);
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
    if (result.recommendations) toc.push('Recommendations');
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
        
        // Background (for pages after first)
        if (i > 1) {
            doc.setFillColor(...COLORS.dark);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
        
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
