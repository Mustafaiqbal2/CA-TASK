
'use client';

import { useAppStore } from '@/lib/state-machine';
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

export function ResearchResults() {
    const { researchResults, reset } = useAppStore();

    if (!researchResults) {
        return null;
    }

    const { title, summary, keyFindings, sources } = researchResults;

    const handleCopy = () => {
        const text = `${title}\n\n${summary}\n\nKey Findings:\n${keyFindings.join('\n')}\n\nSources:\n${sources.map(s => s.url).join('\n')}`;
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
                        <button className={styles.iconButton} title="Download PDF (coming soon)">
                            <DownloadIcon />
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

                {/* Key Findings */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Key Findings</h2>
                    <div className={styles.grid}>
                        {keyFindings.map((finding, idx) => (
                            <div key={idx} className={styles.findingCard} style={{ animationDelay: `${idx * 0.1}s` }}>
                                <span className={styles.findingNumber}>{idx + 1}</span>
                                <p>{finding}</p>
                            </div>
                        ))}
                    </div>
                </section>

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
                                    <span className={styles.sourceUrl}>{new URL(source.url).hostname}</span>
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
