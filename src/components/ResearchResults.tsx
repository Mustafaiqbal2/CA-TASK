
'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/state-machine';
import { generatePDF } from '@/lib/pdf-export';
import { useToast } from '@/components/Toast';
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

const CopiedIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
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

const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg 
        width="18" height="18" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const MessageIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const SparkleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
    </svg>
);

const GridIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

const TrendingIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const CodeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
);

const AlertIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const HandshakeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 17a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h8a4 4 0 0 0 0-8h-4" />
        <path d="M13 7a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h0" />
        <path d="M3 11h4a4 4 0 1 0 0-8H5" />
    </svg>
);

const CalculatorIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10.01" />
        <line x1="12" y1="10" x2="12" y2="10.01" />
        <line x1="16" y1="10" x2="16" y2="10.01" />
        <line x1="8" y1="14" x2="8" y2="14.01" />
        <line x1="12" y1="14" x2="12" y2="14.01" />
        <line x1="16" y1="14" x2="16" y2="14.01" />
        <line x1="8" y1="18" x2="8" y2="18.01" />
        <line x1="12" y1="18" x2="12" y2="18.01" />
        <line x1="16" y1="18" x2="16" y2="18.01" />
    </svg>
);

// Helper to render markdown-style text with bold, headers, and lists
function renderFormattedText(text: string): React.ReactNode {
    // Split by newlines to handle multi-line content
    const lines = text.split('\n');
    
    return lines.map((line, lineIdx) => {
        // Handle headers
        if (line.startsWith('### ')) {
            return <h4 key={lineIdx} className={styles.mdH4}>{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
            return <h3 key={lineIdx} className={styles.mdH3}>{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
            return <h2 key={lineIdx} className={styles.mdH2}>{line.slice(2)}</h2>;
        }
        
        // Handle list items
        if (line.startsWith('- ') || line.startsWith('• ')) {
            const content = line.slice(2);
            return (
                <div key={lineIdx} className={styles.mdListItem}>
                    <span className={styles.mdBullet}>•</span>
                    <span>{renderInlineFormatting(content)}</span>
                </div>
            );
        }
        
        // Handle numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s(.+)$/);
        if (numberedMatch) {
            return (
                <div key={lineIdx} className={styles.mdListItem}>
                    <span className={styles.mdNumber}>{numberedMatch[1]}.</span>
                    <span>{renderInlineFormatting(numberedMatch[2])}</span>
                </div>
            );
        }
        
        // Regular paragraph with inline formatting
        if (line.trim()) {
            return <p key={lineIdx} className={styles.mdParagraph}>{renderInlineFormatting(line)}</p>;
        }
        
        return <br key={lineIdx} />;
    });
}

// Helper for inline formatting (bold, italic, code)
function renderInlineFormatting(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className={styles.mdCode}>{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
    });
}

// Collapsible Section Component
interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
}

function CollapsibleSection({ title, icon, children, defaultOpen = true, badge }: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <section className={styles.section}>
            <button 
                className={styles.collapsibleHeader}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <h2 className={styles.sectionTitle}>
                    {icon}
                    <span>{title}</span>
                    {badge && <span className={styles.sectionBadge}>{badge}</span>}
                </h2>
                <ChevronDownIcon isOpen={isOpen} />
            </button>
            <div className={`${styles.collapsibleContent} ${isOpen ? styles.open : ''}`}>
                {children}
            </div>
        </section>
    );
}

// ============================================
// UNIVERSAL SECTION RENDERER
// Renders any DynamicSection based on its sectionType
// ============================================

import type { DynamicSection, SectionType } from '@/lib/state-machine';

// Icon map for dynamic sections
const SECTION_ICONS: Record<string, React.ReactNode> = {
    '📊': <GridIcon />,
    '📈': <TrendingIcon />,
    '💰': <DollarIcon />,
    '🔧': <CodeIcon />,
    '⚠️': <AlertIcon />,
    '🤝': <HandshakeIcon />,
    '🧮': <CalculatorIcon />,
    '💡': <LightbulbIcon />,
    '👥': <UsersIcon />,
};

// Get icon component from emoji or use default
function getIconForSection(icon?: string): React.ReactNode {
    if (!icon) return <LightbulbIcon />;
    if (SECTION_ICONS[icon]) return SECTION_ICONS[icon];
    // Return the emoji itself as text
    return <span className={styles.emojiIcon}>{icon}</span>;
}

// Universal Section Renderer
interface SectionRendererProps {
    section: DynamicSection;
}

function SectionRenderer({ section }: SectionRendererProps) {
    const { id, title, sectionType, icon, content, collapsible, defaultCollapsed } = section;
    
    // Wrapper based on collapsible setting
    const renderWithWrapper = (children: React.ReactNode) => {
        if (collapsible) {
            return (
                <CollapsibleSection 
                    title={title} 
                    icon={getIconForSection(icon)} 
                    defaultOpen={!defaultCollapsed}
                >
                    {children}
                </CollapsibleSection>
            );
        }
        return (
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    {getIconForSection(icon)}
                    <span>{title}</span>
                </h2>
                {children}
            </section>
        );
    };
    
    // Render content based on sectionType
    const renderContent = (): React.ReactNode => {
        switch (sectionType) {
            case 'text':
                return (
                    <div className={styles.card}>
                        <div className={styles.textContent}>
                            {renderFormattedText(String(content || ''))}
                        </div>
                    </div>
                );
                
            case 'list':
                const listItems = Array.isArray(content) ? content : [content];
                return (
                    <div className={styles.card}>
                        <ul className={styles.dynamicList}>
                            {listItems.map((item, idx) => (
                                <li key={idx}>{renderFormattedText(String(item))}</li>
                            ))}
                        </ul>
                    </div>
                );
                
            case 'numbered-list':
                const numberedItems = Array.isArray(content) ? content : [content];
                return (
                    <div className={styles.card}>
                        <ol className={styles.dynamicNumberedList}>
                            {numberedItems.map((item, idx) => (
                                <li key={idx}>{renderFormattedText(String(item))}</li>
                            ))}
                        </ol>
                    </div>
                );
                
            case 'comparison':
                const comparisonData = Array.isArray(content) ? content : [content];
                return (
                    <div className={styles.comparisonMatrixContainer}>
                        <div className={styles.comparisonMatrix}>
                            {comparisonData.map((entry: any, idx: number) => (
                                <div key={idx} className={styles.comparisonCard}>
                                    <div className={styles.comparisonHeader}>
                                        <h4 className={styles.comparisonOption}>{entry.option || entry.name || `Option ${idx + 1}`}</h4>
                                        {entry.bestFor && <span className={styles.comparisonBestFor}>{entry.bestFor}</span>}
                                    </div>
                                    {entry.scores && (
                                        <div className={styles.comparisonScores}>
                                            {Object.entries(entry.scores).map(([criteria, score]) => (
                                                <div key={criteria} className={styles.scoreRow}>
                                                    <span className={styles.scoreCriteria}>{criteria}</span>
                                                    <span className={styles.scoreValue}>{String(score)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {entry.highlights && <p className={styles.comparisonHighlights}>{entry.highlights}</p>}
                                    {entry.comparison && <p className={styles.comparisonHighlights}>{entry.comparison}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                );
                
            case 'metrics':
                const metricsData = content as Record<string, any>;
                return (
                    <div className={styles.marketContextGrid}>
                        {Object.entries(metricsData || {}).map(([key, value]) => {
                            // Handle array values (like leaders, trends)
                            if (Array.isArray(value)) {
                                return (
                                    <div key={key} className={styles.marketLeaders}>
                                        <span className={styles.marketStatLabel}>{key}</span>
                                        <div className={styles.leadersList}>
                                            {value.map((item, idx) => (
                                                <span key={idx} className={styles.leaderBadge}>{String(item)}</span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            // Handle scalar values
                            return (
                                <div key={key} className={styles.marketStat}>
                                    <span className={styles.marketStatLabel}>{key}</span>
                                    <span className={styles.marketStatValue}>{String(value)}</span>
                                </div>
                            );
                        })}
                    </div>
                );
                
            case 'table':
                const tableData = content as Record<string, any>;
                
                // Check if it's a structured table with rows and columns
                if (tableData && tableData.columns && tableData.rows) {
                    const columns = tableData.columns as string[];
                    const rows = tableData.rows as any[];
                    
                    return (
                        <div className={styles.tableWrapper}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        {columns.map((col, idx) => (
                                            <th key={idx}>{String(col)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, rowIdx) => (
                                        <tr key={rowIdx}>
                                            {columns.map((col, colIdx) => {
                                                // Handle different row structures
                                                let cellValue = '';
                                                if (Array.isArray(row)) {
                                                    cellValue = row[colIdx] !== undefined ? String(row[colIdx]) : '';
                                                } else if (typeof row === 'object' && row !== null) {
                                                    // Object with column keys
                                                    cellValue = row[col] !== undefined ? String(row[col]) : '';
                                                } else {
                                                    cellValue = String(row);
                                                }
                                                return <td key={colIdx}>{cellValue}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
                
                // Fallback: key-value display for simple objects
                return (
                    <div className={styles.tcoCard}>
                        <div className={styles.tcoGrid}>
                            {Object.entries(tableData || {}).map(([key, value]) => {
                                if (Array.isArray(value)) {
                                    return (
                                        <div key={key} className={styles.hiddenCosts}>
                                            <h4>{key}</h4>
                                            <ul>
                                                {value.map((item, idx) => (
                                                    <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                }
                                if (typeof value === 'object' && value !== null) {
                                    return (
                                        <div key={key} className={styles.hiddenCosts}>
                                            <h4>{key}</h4>
                                            <ul>
                                                {Object.entries(value).map(([k, v], idx) => (
                                                    <li key={idx}><strong>{k}:</strong> {String(v)}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={key} className={styles.tcoItem}>
                                        <span className={styles.tcoLabel}>{key}</span>
                                        <span className={styles.tcoValue}>{String(value)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
                
            case 'steps':
                const stepsData = content as Record<string, any>;
                return (
                    <div className={styles.implementationCard}>
                        {stepsData.complexity && (
                            <div className={styles.implementationHeader}>
                                <div className={styles.complexityBadge} data-complexity={stepsData.complexity}>
                                    Complexity: {stepsData.complexity}
                                </div>
                                {stepsData.timeEstimate && (
                                    <span className={styles.timeEstimate}>⏱️ {stepsData.timeEstimate}</span>
                                )}
                            </div>
                        )}
                        {stepsData.prerequisites && stepsData.prerequisites.length > 0 && (
                            <div className={styles.implementationSection}>
                                <h4>Prerequisites</h4>
                                <ul>
                                    {stepsData.prerequisites.map((req: string, idx: number) => (
                                        <li key={idx}>{req}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {stepsData.steps && stepsData.steps.length > 0 && (
                            <div className={styles.implementationSection}>
                                <h4>Steps</h4>
                                <ol className={styles.dynamicNumberedList}>
                                    {stepsData.steps.map((step: string, idx: number) => (
                                        <li key={idx}>{renderFormattedText(step)}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                        {stepsData.integrationPoints && stepsData.integrationPoints.length > 0 && (
                            <div className={styles.implementationSection}>
                                <h4>Integration Points</h4>
                                <div className={styles.integrationTags}>
                                    {stepsData.integrationPoints.map((point: string, idx: number) => (
                                        <span key={idx} className={styles.integrationTag}>{point}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
                
            case 'pros-cons':
                const prosConsData = content as { pros?: string[]; cons?: string[] };
                return (
                    <div className={styles.prosConsGrid}>
                        <div className={styles.prosColumn}>
                            <h3 className={styles.columnTitle}>
                                <span className={styles.prosIcon}><CheckIcon /></span>
                                Strengths
                            </h3>
                            <ul className={styles.prosList}>
                                {(prosConsData.pros || []).map((pro, idx) => (
                                    <li key={idx} className={styles.proItem}>
                                        {renderFormattedText(String(pro))}
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
                                {(prosConsData.cons || []).map((con, idx) => (
                                    <li key={idx} className={styles.conItem}>
                                        {renderFormattedText(String(con))}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
                
            case 'pricing':
                const pricingData = content as { overview?: string; tiers?: any[]; notes?: string };
                return (
                    <div className={styles.card}>
                        {pricingData.overview && <p className={styles.pricingOverview}>{pricingData.overview}</p>}
                        {pricingData.tiers && pricingData.tiers.length > 0 && (
                            <div className={styles.pricingTiers}>
                                {pricingData.tiers.map((tier, idx) => (
                                    <div key={idx} className={styles.pricingTier}>
                                        <div className={styles.tierName}>{tier.name}</div>
                                        <div className={styles.tierPrice}>{tier.price}</div>
                                        <div className={styles.tierFeatures}>{tier.features}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {pricingData.notes && <p className={styles.pricingNotes}>{pricingData.notes}</p>}
                    </div>
                );
                
            case 'warning':
                return (
                    <div className={`${styles.card} ${styles.riskCard}`}>
                        <p className={styles.riskText}>{renderFormattedText(String(content || ''))}</p>
                    </div>
                );
                
            case 'info':
                return (
                    <div className={`${styles.card} ${styles.infoCard}`}>
                        <p className={styles.infoText}>{renderFormattedText(String(content || ''))}</p>
                    </div>
                );
                
            case 'success':
                return (
                    <div className={`${styles.card} ${styles.successCard}`}>
                        <p className={styles.successText}>{renderFormattedText(String(content || ''))}</p>
                    </div>
                );
                
            case 'timeline':
                const timelineData = Array.isArray(content) ? content : [];
                return (
                    <div className={styles.timelineContainer}>
                        {timelineData.map((item: any, idx: number) => (
                            <div key={idx} className={styles.timelineItem}>
                                <div className={styles.timelineDot} />
                                <div className={styles.timelineContent}>
                                    <span className={styles.timelineDate}>{item.date}</span>
                                    <span className={styles.timelineEvent}>{item.event}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
                
            case 'quote':
                const quoteData = content as { text?: string; source?: string } | string;
                const quoteText = typeof quoteData === 'string' ? quoteData : quoteData?.text;
                const quoteSource = typeof quoteData === 'object' ? quoteData?.source : undefined;
                return (
                    <blockquote className={styles.quoteBlock}>
                        <p className={styles.quoteText}>"{quoteText}"</p>
                        {quoteSource && <cite className={styles.quoteSource}>— {quoteSource}</cite>}
                    </blockquote>
                );
                
            case 'gallery':
                const galleryItems = Array.isArray(content) ? content : [];
                return (
                    <div className={styles.galleryGrid}>
                        {galleryItems.map((item: any, idx: number) => (
                            <div key={idx} className={styles.galleryItem}>
                                {item.icon && <span className={styles.galleryIcon}>{item.icon}</span>}
                                <span className={styles.galleryLabel}>{item.label || item.name || String(item)}</span>
                                {item.description && <span className={styles.galleryDesc}>{item.description}</span>}
                            </div>
                        ))}
                    </div>
                );
                
            case 'custom':
            default:
                // Smart fallback: detect content type and render appropriately
                if (Array.isArray(content)) {
                    return (
                        <div className={styles.card}>
                            <ul className={styles.dynamicList}>
                                {content.map((item, idx) => (
                                    <li key={idx}>{renderFormattedText(String(item))}</li>
                                ))}
                            </ul>
                        </div>
                    );
                }
                if (typeof content === 'object' && content !== null) {
                    return (
                        <div className={styles.card}>
                            <dl className={styles.keyValueList}>
                                {Object.entries(content).map(([key, value]) => (
                                    <div key={key} className={styles.keyValueRow}>
                                        <dt className={styles.keyLabel}>{key}</dt>
                                        <dd className={styles.keyValue}>
                                            {Array.isArray(value) 
                                                ? value.join(', ')
                                                : String(value)
                                            }
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    );
                }
                return (
                    <div className={styles.card}>
                        <p>{renderFormattedText(String(content || ''))}</p>
                    </div>
                );
        }
    };
    
    return renderWithWrapper(renderContent());
}

export function ResearchResults() {
    const { researchResults, formData, reset, setResearchResults, transition, formSchema } = useAppStore();
    const { addToast } = useToast();
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    
    // Follow-up chatbot state
    const [followUpQuery, setFollowUpQuery] = useState('');
    const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
    const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);

    // Handle research again - go back to form with same data but new form ID
    const handleResearchAgain = useCallback(() => {
        if (formSchema) {
            // Generate a new form ID to trigger fresh research
            const newFormSchema = {
                ...formSchema,
                id: `form_${Date.now()}`
            };
            // Update form schema with new ID, then transition
            useAppStore.getState().setFormSchema(newFormSchema);
            transition('RESEARCHING', 'research_again');
            addToast('info', 'Starting new research with your criteria...');
        } else {
            // If no form schema, start completely fresh
            reset();
            addToast('info', 'Starting a new research session...');
        }
    }, [formSchema, transition, reset, addToast]);

    // Handle follow-up chat message
    const handleFollowUpChat = useCallback(async () => {
        if (!followUpQuery.trim() || isFollowUpLoading) return;
        
        const userMessage = followUpQuery.trim();
        setFollowUpQuery(''); // Clear input immediately for better UX
        
        // Add user message to chat history
        setChatHistory(prev => [...prev, { 
            role: 'user', 
            content: userMessage, 
            timestamp: new Date() 
        }]);
        
        setIsFollowUpLoading(true);
        
        try {
            // Build context from research results
            const researchContext = JSON.stringify({
                title: researchResults?.title,
                summary: researchResults?.summary,
                keyFindings: researchResults?.keyFindings?.slice(0, 5),
                recommendations: researchResults?.recommendations,
                pricing: researchResults?.pricing,
            });
            
            const response = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formData: {
                        ...formData,
                        followUpQuery: userMessage,
                        researchDepth: 'followup',
                        originalContext: researchContext,
                    },
                }),
            });
            
            if (!response.ok) throw new Error('Follow-up failed');
            
            // Parse the streaming response - accumulate all text chunks
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    // Parse each line in the chunk
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('0:')) {
                            try {
                                const text = JSON.parse(line.substring(2));
                                if (typeof text === 'string' && !text.startsWith('[System')) {
                                    fullText += text;
                                }
                            } catch {
                                // Skip malformed chunks
                            }
                        }
                    }
                }
            }
            
            // DEBUG: Log what we received
            console.log('[Follow-up] Full text length:', fullText.length);
            console.log('[Follow-up] Full text preview:', fullText.substring(0, 500));
            console.log('[Follow-up] Full text end:', fullText.substring(fullText.length - 500));
            
            // Extract JSON from the accumulated text
            let answer = '';
            try {
                // Find JSON object in the response
                const jsonMatch = fullText.match(/\{[\s\S]*\}/g);
                console.log('[Follow-up] JSON matches found:', jsonMatch?.length || 0);
                
                if (jsonMatch) {
                    // Take the last complete JSON (final report)
                    const lastJson = jsonMatch[jsonMatch.length - 1];
                    console.log('[Follow-up] Last JSON preview:', lastJson.substring(0, 300));
                    const parsed = JSON.parse(lastJson);
                    console.log('[Follow-up] Parsed keys:', Object.keys(parsed));
                    
                    if (parsed.summary) {
                        answer = parsed.summary;
                    }
                    if (parsed.keyFindings && parsed.keyFindings.length > 0) {
                        answer += '\n\n**Key Points:**\n' + parsed.keyFindings.map((f: string) => `• ${f}`).join('\n');
                    }
                    if (parsed.recommendations) {
                        answer += '\n\n**Recommendation:** ' + (typeof parsed.recommendations === 'string' ? parsed.recommendations : parsed.recommendations[0]);
                    }
                }
                
                console.log('[Follow-up] Answer after JSON parse:', answer.substring(0, 200));
                
                // If we still don't have an answer, try to extract any readable content
                if (!answer || answer.trim().length < 20) {
                    console.log('[Follow-up] Answer too short, trying raw text extraction');
                    // Clean up the raw text and use it
                    const cleanedText = fullText
                        .replace(/\[System:.*?\]/g, '')
                        .replace(/```json/g, '')
                        .replace(/```/g, '')
                        .replace(/\{[\s\S]*?\}/g, '') // Remove JSON blocks
                        .trim();
                    
                    if (cleanedText.length > 50) {
                        answer = cleanedText.substring(0, 2000);
                    }
                }
            } catch {
                // If JSON parsing fails, use raw text (cleaned up)
                answer = fullText
                    .replace(/\[System:.*?\]/g, '')
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .trim()
                    .substring(0, 2000);
            }
            
            // Final fallback - provide actionable message
            if (!answer || answer.trim().length < 20) {
                answer = `I couldn't find specific data for "${userMessage}". This might be because:\n\n` +
                    `• The information requires more specialized research\n` +
                    `• The data isn't publicly available\n` +
                    `• The question might need more context\n\n` +
                    `Try asking about a specific product, statistic, or comparison from the research above.`;
            }
            
            // Add assistant response to chat
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: answer,
                timestamp: new Date()
            }]);
            
        } catch (error) {
            console.error('Follow-up chat error:', error);
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error researching that. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsFollowUpLoading(false);
        }
    }, [followUpQuery, formData, researchResults, isFollowUpLoading]);

    if (!researchResults) {
        return null;
    }

    const { 
        title, summary, overview, keyFindings, prosAndCons, pricing, 
        competitors, recommendations, sources,
        // Dynamic sections array (the new way)
        sections,
        // Legacy dynamic sections (for backwards compatibility)
        researchIntent, comparisonMatrix, marketContext, 
        implementationNotes, negotiationTips, riskAssessment, tcoBreakdown
    } = researchResults;

    const handleDownloadPDF = async () => {
        if (isGeneratingPDF) return;
        setIsGeneratingPDF(true);
        try {
            await generatePDF(researchResults, 'dark');
            addToast('success', 'PDF downloaded successfully!');
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            addToast('error', 'Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    // Get research depth from formData
    const researchDepth = formData?.researchDepth as string || 'standard';
    
    // Format research intent for display
    const formatIntent = (intent: string | undefined) => {
        if (!intent) return null;
        return intent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const handleCopy = async () => {
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
        // Dynamic sections
        if (comparisonMatrix && comparisonMatrix.length > 0) {
            text += `\n\nComparison Matrix:`;
            comparisonMatrix.forEach(entry => {
                text += `\n\n${entry.option} (${entry.bestFor})`;
                Object.entries(entry.scores).forEach(([k, v]) => {
                    text += `\n  - ${k}: ${v}`;
                });
                text += `\n  ${entry.highlights}`;
            });
        }
        if (marketContext) {
            text += `\n\nMarket Context:`;
            text += `\n  Market Size: ${marketContext.size}`;
            text += `\n  Growth: ${marketContext.growth}`;
            if (marketContext.leaders?.length) text += `\n  Leaders: ${marketContext.leaders.join(', ')}`;
            if (marketContext.trends?.length) text += `\n  Trends:\n${marketContext.trends.map(t => `    - ${t}`).join('\n')}`;
        }
        if (implementationNotes) {
            text += `\n\nImplementation Notes:`;
            text += `\n  Complexity: ${implementationNotes.complexity}`;
            text += `\n  Time Estimate: ${implementationNotes.timeEstimate}`;
            if (implementationNotes.prerequisites?.length) text += `\n  Prerequisites: ${implementationNotes.prerequisites.join(', ')}`;
            if (implementationNotes.integrationPoints?.length) text += `\n  Integration: ${implementationNotes.integrationPoints.join(', ')}`;
            if (implementationNotes.securityConsiderations?.length) text += `\n  Security: ${implementationNotes.securityConsiderations.join(', ')}`;
        }
        if (tcoBreakdown) {
            text += `\n\nTotal Cost of Ownership:`;
            text += `\n  Upfront: ${tcoBreakdown.upfront}`;
            text += `\n  Recurring: ${tcoBreakdown.recurring}`;
            text += `\n  3-Year Total: ${tcoBreakdown.threeYearTotal}`;
            if (tcoBreakdown.hidden?.length) text += `\n  Hidden Costs: ${tcoBreakdown.hidden.join('; ')}`;
        }
        if (negotiationTips && negotiationTips.length > 0) {
            text += `\n\nNegotiation Tips:\n${negotiationTips.map(t => `💡 ${t}`).join('\n')}`;
        }
        if (riskAssessment) {
            text += `\n\nRisk Assessment:\n${riskAssessment}`;
        }
        if (recommendations) text += `\n\nRecommendations:\n${recommendations}`;
        
        // Serialize dynamic sections (the new way)
        if (sections && sections.length > 0) {
            sections.forEach(section => {
                text += `\n\n${section.icon || '📌'} ${section.title}:\n`;
                const content = section.content;
                
                if (Array.isArray(content)) {
                    content.forEach(item => {
                        if (typeof item === 'object') {
                            text += `  - ${JSON.stringify(item)}\n`;
                        } else {
                            text += `  - ${String(item)}\n`;
                        }
                    });
                } else if (typeof content === 'object' && content !== null) {
                    Object.entries(content).forEach(([key, value]) => {
                        if (Array.isArray(value)) {
                            text += `  ${key}: ${value.join(', ')}\n`;
                        } else {
                            text += `  ${key}: ${String(value)}\n`;
                        }
                    });
                } else {
                    text += `  ${String(content)}\n`;
                }
            });
        }
        
        text += `\n\nSources:\n${sources.map(s => `- ${s.title}: ${s.url}`).join('\n')}`;
        
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            addToast('success', 'Report copied to clipboard!');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            addToast('error', 'Failed to copy to clipboard');
        }
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
                            {/* Research Depth Badge */}
                            <span className={`${styles.depthBadge} ${researchDepth === 'deep' ? styles.depthDeep : styles.depthStandard}`}>
                                {researchDepth === 'deep' ? '🔍 Deep Analysis' : '⚡ Standard'}
                            </span>
                            {/* Research Intent Badge */}
                            {researchIntent && (
                                <span className={styles.intentBadge}>
                                    {formatIntent(researchIntent)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button 
                            onClick={handleResearchAgain} 
                            className={styles.researchAgainButton}
                            title="Run research again with same criteria"
                        >
                            <RestartIcon />
                            <span>Research Again</span>
                        </button>
                        <button 
                            onClick={handleCopy} 
                            className={`${styles.iconButton} ${isCopied ? styles.copied : ''}`} 
                            title={isCopied ? "Copied!" : "Copy text"}
                        >
                            {isCopied ? <CopiedIcon /> : <CopyIcon />}
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

                {/* === DYNAMIC SECTIONS BASED ON RESEARCH INTENT === */}

                {/* Comparison Matrix (vendor_selection) */}
                {comparisonMatrix && comparisonMatrix.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <GridIcon />
                            <span>Comparison Matrix</span>
                        </h2>
                        <div className={styles.comparisonMatrixContainer}>
                            <div className={styles.comparisonMatrix}>
                                {comparisonMatrix.map((entry, idx) => (
                                    <div key={idx} className={styles.comparisonCard}>
                                        <div className={styles.comparisonHeader}>
                                            <h4 className={styles.comparisonOption}>{entry.option}</h4>
                                            <span className={styles.comparisonBestFor}>{entry.bestFor}</span>
                                        </div>
                                        <div className={styles.comparisonScores}>
                                            {Object.entries(entry.scores).map(([criteria, score]) => (
                                                <div key={criteria} className={styles.scoreRow}>
                                                    <span className={styles.scoreCriteria}>{criteria}</span>
                                                    <span className={styles.scoreValue}>{String(score)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className={styles.comparisonHighlights}>{entry.highlights}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Market Context (market_research) */}
                {marketContext && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <TrendingIcon />
                            <span>Market Context</span>
                        </h2>
                        <div className={styles.marketContextGrid}>
                            <div className={styles.marketStat}>
                                <span className={styles.marketStatLabel}>Market Size</span>
                                <span className={styles.marketStatValue}>{marketContext.size}</span>
                            </div>
                            <div className={styles.marketStat}>
                                <span className={styles.marketStatLabel}>Growth Rate</span>
                                <span className={styles.marketStatValue}>{marketContext.growth}</span>
                            </div>
                            {marketContext.leaders && marketContext.leaders.length > 0 && (
                                <div className={styles.marketLeaders}>
                                    <span className={styles.marketStatLabel}>Market Leaders</span>
                                    <div className={styles.leadersList}>
                                        {marketContext.leaders.map((leader, idx) => (
                                            <span key={idx} className={styles.leaderBadge}>{leader}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {marketContext.trends && marketContext.trends.length > 0 && (
                                <div className={styles.marketTrends}>
                                    <span className={styles.marketStatLabel}>Key Trends</span>
                                    <ul className={styles.trendsList}>
                                        {marketContext.trends.map((trend, idx) => (
                                            <li key={idx}>{trend}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Implementation Notes (technical_evaluation) */}
                {implementationNotes && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <CodeIcon />
                            <span>Implementation Notes</span>
                        </h2>
                        <div className={styles.implementationCard}>
                            <div className={styles.implementationHeader}>
                                <div className={styles.complexityBadge} data-complexity={implementationNotes.complexity}>
                                    Complexity: {implementationNotes.complexity}
                                </div>
                                <span className={styles.timeEstimate}>⏱️ {implementationNotes.timeEstimate}</span>
                            </div>
                            {implementationNotes.prerequisites && implementationNotes.prerequisites.length > 0 && (
                                <div className={styles.implementationSection}>
                                    <h4>Prerequisites</h4>
                                    <ul>
                                        {implementationNotes.prerequisites.map((req, idx) => (
                                            <li key={idx}>{req}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {implementationNotes.integrationPoints && implementationNotes.integrationPoints.length > 0 && (
                                <div className={styles.implementationSection}>
                                    <h4>Integration Points</h4>
                                    <div className={styles.integrationTags}>
                                        {implementationNotes.integrationPoints.map((point, idx) => (
                                            <span key={idx} className={styles.integrationTag}>{point}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {implementationNotes.securityConsiderations && implementationNotes.securityConsiderations.length > 0 && (
                                <div className={styles.implementationSection}>
                                    <h4>Security Considerations</h4>
                                    <ul className={styles.securityList}>
                                        {implementationNotes.securityConsiderations.map((item, idx) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* TCO Breakdown (pricing_analysis) */}
                {tcoBreakdown && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <CalculatorIcon />
                            <span>Total Cost of Ownership</span>
                        </h2>
                        <div className={styles.tcoCard}>
                            <div className={styles.tcoGrid}>
                                <div className={styles.tcoItem}>
                                    <span className={styles.tcoLabel}>Upfront Costs</span>
                                    <span className={styles.tcoValue}>{tcoBreakdown.upfront}</span>
                                </div>
                                <div className={styles.tcoItem}>
                                    <span className={styles.tcoLabel}>Recurring Costs</span>
                                    <span className={styles.tcoValue}>{tcoBreakdown.recurring}</span>
                                </div>
                                <div className={styles.tcoItem + ' ' + styles.tcoTotal}>
                                    <span className={styles.tcoLabel}>3-Year Total</span>
                                    <span className={styles.tcoValue}>{tcoBreakdown.threeYearTotal}</span>
                                </div>
                            </div>
                            {tcoBreakdown.hidden && tcoBreakdown.hidden.length > 0 && (
                                <div className={styles.hiddenCosts}>
                                    <h4>⚠️ Hidden Costs to Watch</h4>
                                    <ul>
                                        {tcoBreakdown.hidden.map((cost, idx) => (
                                            <li key={idx}>{cost}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Negotiation Tips (vendor_selection, pricing_analysis) */}
                {negotiationTips && negotiationTips.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <HandshakeIcon />
                            <span>Negotiation Tips</span>
                        </h2>
                        <div className={styles.negotiationCard}>
                            <ul className={styles.negotiationList}>
                                {negotiationTips.map((tip, idx) => (
                                    <li key={idx}>{renderFormattedText(tip)}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}

                {/* Risk Assessment (deep mode) */}
                {riskAssessment && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <AlertIcon />
                            <span>Risk Assessment</span>
                        </h2>
                        <div className={`${styles.card} ${styles.riskCard}`}>
                            <p className={styles.riskText}>{riskAssessment}</p>
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

                {/* ============================================ */}
                {/* DYNAMIC SECTIONS - Agent-defined sections    */}
                {/* These are rendered using the universal       */}
                {/* SectionRenderer component                    */}
                {/* ============================================ */}
                {sections && sections.length > 0 && (
                    <div className={styles.dynamicSectionsContainer}>
                        {sections.map((section) => (
                            <SectionRenderer key={section.id} section={section} />
                        ))}
                    </div>
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

                {/* Follow-up Chatbot Section */}
                <section className={styles.followUpSection}>
                    <button 
                        className={styles.followUpToggle}
                        onClick={() => setIsFollowUpOpen(!isFollowUpOpen)}
                        type="button"
                    >
                        <MessageIcon />
                        <span>Ask Follow-up Questions</span>
                        <ChevronDownIcon isOpen={isFollowUpOpen} />
                    </button>
                    
                    {isFollowUpOpen && (
                        <div className={styles.followUpContent}>
                            <p className={styles.followUpHint}>
                                Ask questions about this research. I'll search for additional information using the existing context.
                            </p>
                            
                            {/* Chat History */}
                            {chatHistory.length > 0 && (
                                <div className={styles.chatHistory}>
                                    {chatHistory.map((msg, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`${styles.chatMessage} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                                        >
                                            <div className={styles.chatBubble}>
                                                {msg.role === 'user' ? (
                                                    <span className={styles.chatContent}>{msg.content}</span>
                                                ) : (
                                                    <div className={styles.chatContent}>
                                                        {renderFormattedText(msg.content)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={styles.chatTime}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                    {isFollowUpLoading && (
                                        <div className={`${styles.chatMessage} ${styles.assistantMessage}`}>
                                            <div className={styles.chatBubble}>
                                                <span className={styles.typingIndicator}>
                                                    <span></span><span></span><span></span>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Chat Input */}
                            <div className={styles.followUpInputWrapper}>
                                <input
                                    type="text"
                                    value={followUpQuery}
                                    onChange={(e) => setFollowUpQuery(e.target.value)}
                                    placeholder="Ask a follow-up question..."
                                    className={styles.followUpInput}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleFollowUpChat()}
                                    disabled={isFollowUpLoading}
                                />
                                <button
                                    onClick={handleFollowUpChat}
                                    disabled={!followUpQuery.trim() || isFollowUpLoading}
                                    className={styles.followUpSubmit}
                                >
                                    {isFollowUpLoading ? (
                                        <span className={styles.spinner}></span>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
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
