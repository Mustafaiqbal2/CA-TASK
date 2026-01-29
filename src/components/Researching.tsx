
'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/state-machine';
import styles from './Researching.module.css';

// Icons
const SearchIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.pulseIcon}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const BrainIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.pulseIcon}>
        <path d="M9.5 2h5a2.5 2.5 0 0 1 2.25 1.5l1.5 3.5m-11 5h11m-11 5h11m-5 5h5a2.5 2.5 0 0 0 2.25-1.5l1.5-3.5" />
        <path d="M2.5 12h19" />
    </svg>
);

const DocIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.pulseIcon}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </svg>
);

export function Researching() {
    const { location, formData, researchStatus, researchProgress, setResearchProgress, setResearchResults, transition, formSchema } = useAppStore();
    const [elapsedTime, setElapsedTime] = useState(0);
    const [started, setStarted] = useState(false);

    // Call research API
    useEffect(() => {
        if (started || !formSchema || !formData) return;
        setStarted(true);

        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        const abortController = new AbortController();

        async function startResearch() {
            try {
                setResearchProgress(5, 'Initializing research agent...');

                const response = await fetch('/api/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        formId: formSchema?.id,
                        formData: formData,
                        location: location
                    }),
                    signal: abortController.signal,
                });

                if (!response.ok) throw new Error('Research request failed');
                if (!response.body) throw new Error('No response body');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let finalJson = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    // Provide visual feedback based on stream activity
                    setResearchProgress(Math.min(90, useAppStore.getState().researchProgress + (chunk.length > 50 ? 5 : 1)), 'Extracting insights...');

                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('0:')) {
                            // Extract text content from AI stream format
                            try {
                                const content = JSON.parse(line.substring(2));
                                finalJson += content;
                            } catch (e) {
                                finalJson += line.substring(2);
                            }
                        }
                    }

                    // Update status based on keywords
                    if (finalJson.includes('web-search')) {
                        setResearchProgress(Math.min(60, Math.max(useAppStore.getState().researchProgress, 30)), 'Searching the web...');
                    } else if (finalJson.includes('data-synthesis')) {
                        setResearchProgress(Math.min(80, Math.max(useAppStore.getState().researchProgress, 60)), 'Synthesizing data...');
                    }
                }

                clearInterval(timer);
                setResearchProgress(100, 'Research complete!');

                // Parse the final JSON
                // The stream currently contains the raw output. 
                // Since the agent is instructed to output JSON, we try to find it.
                // Note: The stream might contain conversational filler or multiple JSONs if tools returned JSON.
                // We look for the last valid JSON object that looks like a report.

                try {
                    // Quick and dirty extraction of the largest JSON block or just parsing the whole thing if pure
                    // If the model followed instructions perfectly, finalJson IS the JSON.
                    // But usually there's some text before/after or markdown ```json ... ```

                    let cleanJson = finalJson;
                    const jsonBlock = finalJson.match(/```json\n([\s\S]*?)```/);
                    if (jsonBlock) {
                        cleanJson = jsonBlock[1];
                    } else {
                        const firstBrace = finalJson.indexOf('{');
                        const lastBrace = finalJson.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1) {
                            cleanJson = finalJson.substring(firstBrace, lastBrace + 1);
                        }
                    }

                    const result = JSON.parse(cleanJson);

                    // Validate it has fields we need
                    if (result.title || result.summary) {
                        setResearchResults(result);
                        setTimeout(() => transition('PRESENTING', 'research_complete'), 1000);
                    } else {
                        throw new Error('Missing result fields');
                    }

                } catch (parseError) {
                    console.error('Failed to parse result JSON', parseError, finalJson);
                    // Fallback for demo if parsing fails but we got text
                    setResearchResults({
                        title: `Research Report: ${formSchema?.researchTopic}`,
                        summary: finalJson.substring(0, 500) + '...',
                        keyFindings: ["Could not parse structured findings. See summary."],
                        sources: [],
                        timestamp: new Date(),
                        id: ''
                    });
                    setTimeout(() => transition('PRESENTING', 'research_complete'), 2000);
                }

            } catch (error) {
                if (abortController.signal.aborted) return;
                console.error('Research error:', error);
                setResearchProgress(0, 'Research failed. Please try again.');
            }
        }

        startResearch();

        return () => {
            abortController.abort();
            clearInterval(timer);
        };
    }, []);

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    {researchProgress < 30 ? <SearchIcon /> :
                        researchProgress < 60 ? <BrainIcon /> : <DocIcon />}
                </div>

                <div className={styles.statusWrapper}>
                    <h2 className={styles.statusText}>{researchStatus || 'Initializing research...'}</h2>
                    <p className={styles.topicText}>{formSchema?.researchTopic}</p>
                </div>

                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${researchProgress}%` }}
                        />
                    </div>
                    <div className={styles.metaInfo}>
                        <span>{Math.round(researchProgress)}% Complete</span>
                        <span>{formatTime(elapsedTime)}</span>
                    </div>
                </div>

                {/* Steps visualization */}
                <div className={styles.steps}>
                    <div className={`${styles.step} ${researchProgress >= 5 ? styles.active : ''}`}>
                        <div className={styles.stepDot} />
                        <span>Planning</span>
                    </div>
                    <div className={`${styles.step} ${researchProgress >= 30 ? styles.active : ''}`}>
                        <div className={styles.stepDot} />
                        <span>Searching</span>
                    </div>
                    <div className={`${styles.step} ${researchProgress >= 60 ? styles.active : ''}`}>
                        <div className={styles.stepDot} />
                        <span>Analyzing</span>
                    </div>
                    <div className={`${styles.step} ${researchProgress >= 90 ? styles.active : ''}`}>
                        <div className={styles.stepDot} />
                        <span>Synthesizing</span>
                    </div>
                </div>

                <button
                    className={styles.cancelButton}
                    onClick={() => transition('FORM_ACTIVE', 'research_cancelled')}
                >
                    Cancel Research
                </button>
            </div>
        </div>
    );
}
