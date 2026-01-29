
'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/state-machine';
import { generatePDF } from '@/lib/pdf-export';
import styles from './ResearchResults.module.css';

// Icons
const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const CopyIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

const RestartIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const XIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const DollarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);

const UsersIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const LightbulbIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
);

// Helper to render markdown-style bold text
function renderFormattedText(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
}

export function ResearchResults() {
    const { researchResults, reset } = useAppStore();
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    if (!researchResults) {
        return null;
    }

    const { title, summary, overview, keyFindings, prosAndCons, pricing, competitors, recommendations, sources } = researchResults;

    const handleDownloadPDF = async () => {
        if (isGeneratingPDF) return;
        setIsGeneratingPDF(true);
        try {
            await generatePDF(researchResults);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleCopy = () => {
        let text = `${title}\n\n${summary}`;
        if (overview) text += `\n\nOverview:\n${overview}`;
        text += `\n\nKey Findings:\n${keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
        if (prosAndCons) {
            text += `\n\nPros:\n${prosAndCons.pros.map(p => `✓ ${p}`).join('\n')}`;
            text += `\n\nCons:\n${prosAndCons.cons.map(c => `✗ ${c}`).join('\n')}`;
        }
        if (pricing) {
            text += `\n\nPricing:\n${pricing.overview}`;
            if (pricing.tiers.length > 0) {
                text += `\n${pricing.tiers.map(t => `- ${t.name}: ${t.price} - ${t.features}`).join('\n')}`;
            }
        }
        if (recommendations) text += `\n\nRecommendations:\n${recommendations}`;
        text += `\n\nSources:\n${sources.map(s => `- ${s.title}: ${s.url}`).join('\n')}`;
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageWrapper}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.titleWrapper}>
                        <h1 className={styles.title}>{title}</h1>
                        <div className={styles.meta}>
                            <span>Generated on {new Date().toLocaleDateString()}</span>
                            <span className={styles.badge}>Final Report</span>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button onClick={handleCopy} className={styles.iconButton} title="Copy text">
                            <CopyIcon />
                        </button>
                        <button 
                            onClick={handleDownloadPDF} 
                            className={`${styles.iconButton} ${isGeneratingPDF ? styles.loading : ''}`} 
                            title={isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
                            disabled={isGeneratingPDF}
                        >
                            {isGeneratingPDF ? (
                                <span className={styles.spinner}></span>
                            ) : (
                                <DownloadIcon />
                            )}
                        </button>
                    </div>
                </header>

                {/* Executive Summary */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Executive Summary</h2>
                    <div className={styles.card}>
                        <p className={styles.summaryText}>{summary}</p>
                    </div>
                </section>

                {/* Overview (if available) */}
                {overview && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Overview</h2>
                        <div className={styles.card}>
                            <p className={styles.overviewText}>{overview}</p>
                        </div>
                    </section>
                )}

                {/* Key Findings */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Key Findings</h2>
                    <div className={styles.findingsList}>
                        {keyFindings.map((finding, idx) => (
                            <div key={idx} className={styles.findingCard} style={{ animationDelay: `${idx * 0.05}s` }}>
                                <span className={styles.findingNumber}>{idx + 1}</span>
                                <p>{renderFormattedText(finding)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pros and Cons */}
                {prosAndCons && (prosAndCons.pros.length > 0 || prosAndCons.cons.length > 0) && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Pros & Cons</h2>
                        <div className={styles.prosConsGrid}>
                            <div className={styles.prosColumn}>
                                <h3 className={styles.columnTitle}>
                                    <span className={styles.prosIcon}><CheckIcon /></span>
                                    Strengths
                                </h3>
                                <ul className={styles.prosList}>
                                    {prosAndCons.pros.map((pro, idx) => (
                                        <li key={idx} className={styles.proItem}>
                                            {renderFormattedText(pro)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.consColumn}>
                                <h3 className={styles.columnTitle}>
                                    <span className={styles.consIcon}><XIcon /></span>
                                    Weaknesses
                                </h3>
                                <ul className={styles.consList}>
                                    {prosAndCons.cons.map((con, idx) => (
                                        <li key={idx} className={styles.conItem}>
                                            {renderFormattedText(con)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                )}

                {/* Pricing */}
                {pricing && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <DollarIcon />
                            <span>Pricing</span>
                        </h2>
                        <div className={styles.card}>
                            <p className={styles.pricingOverview}>{pricing.overview}</p>
                            {pricing.tiers && pricing.tiers.length > 0 && (
                                <div className={styles.pricingTiers}>
                                    {pricing.tiers.map((tier, idx) => (
                                        <div key={idx} className={styles.pricingTier}>
                                            <div className={styles.tierName}>{tier.name}</div>
                                            <div className={styles.tierPrice}>{tier.price}</div>
                                            <div className={styles.tierFeatures}>{tier.features}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {pricing.notes && (
                                <p className={styles.pricingNotes}>{pricing.notes}</p>
                            )}
                        </div>
                    </section>
                )}

                {/* Competitors */}
                {competitors && competitors.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <UsersIcon />
                            <span>Competitor Comparison</span>
                        </h2>
                        <div className={styles.competitorsList}>
                            {competitors.map((comp, idx) => (
                                <div key={idx} className={styles.competitorCard}>
                                    <h4 className={styles.competitorName}>{comp.name}</h4>
                                    <p className={styles.competitorComparison}>{comp.comparison}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Recommendations */}
                {recommendations && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <LightbulbIcon />
                            <span>Recommendations</span>
                        </h2>
                        <div className={`${styles.card} ${styles.recommendationsCard}`}>
                            <p className={styles.recommendationsText}>{recommendations}</p>
                        </div>
                    </section>
                )}

                {/* Sources */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Sources & References</h2>
                    <div className={styles.sourcesList}>
                        {sources.map((source, idx) => (
                            <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.sourceItem}
                            >
                                <div className={styles.sourceInfo}>
                                    <span className={styles.sourceTitle}>{source.title}</span>
                                    <span className={styles.sourceSnippet}>{source.snippet}</span>
                                    <span className={styles.sourceUrl}>{(() => { try { return new URL(source.url).hostname; } catch { return source.url; } })()}</span>
                                </div>
                                <ExternalLinkIcon />
                            </a>
                        ))}
                    </div>
                </section>

                {/* Footer Actions */}
                <div className={styles.footer}>
                    <button
                        className={styles.restartButton}
                        onClick={reset}
                    >
                        <RestartIcon />
                        <span>Start New Research</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
