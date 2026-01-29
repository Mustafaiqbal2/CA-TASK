
'use client';

import { useEffect, useRef, useState } from 'react';
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
    const requestStarted = useRef(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs when new entries are added
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Call research API
    useEffect(() => {
        if (requestStarted.current || !formSchema || !formData) return;
        requestStarted.current = true;

        let isCancelled = false; // Local flag for THIS effect instance

        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        async function startResearch() {
            try {
                console.log('[CLIENT] Starting research...');
                setResearchProgress(5, 'Initializing research agent...');
                console.log('[CLIENT] Making fetch request to /api/research');

                const response = await fetch('/api/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        formId: formSchema?.id,
                        formData: formData,
                        location: location
                    }),
                });

                console.log('[CLIENT] Response received', response.status, response.ok);
                if (!response.ok) throw new Error('Research request failed');
                if (!response.body) throw new Error('No response body');
                console.log('[CLIENT] Starting to read stream...');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let finalJson = '';

                let chunkCount = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        console.log('[CLIENT] Stream done, chunks received:', chunkCount);
                        break;
                    }
                    chunkCount++;
                    const newChunk = decoder.decode(value, { stream: true });
                    buffer += newChunk;

                    const lines = buffer.split('\n');
                    // Keep the last line in the buffer as it might be incomplete
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim() === '') continue;

                        if (line.startsWith('0:')) {
                            const rawContent = line.substring(2);
                            // Cleanup JSON string
                            let content = '';
                            try {
                                content = JSON.parse(rawContent);
                            } catch (e) {
                                // If partial parse fails, it might be due to split line (should be handled by buffer now)
                                // or malformed content. We skip to avoid corruption.
                                console.warn('Failed to parse stream line:', line.substring(0, 50) + '...');
                                continue;
                            }

                            // Check for System messages
                            if (content.startsWith && content.startsWith('\n[System:')) {
                                const message = content.replace(/\n\[System: |\]$/g, '').replace(/\.{3}$/, '');
                                setLogs(prev => [...prev, `> ${message}`]);

                                // Update progress based on message content
                                const currentProgress = useAppStore.getState().researchProgress;
                                let newProgress = currentProgress;
                                let statusText = '';

                                if (message.includes('Using tool webSearch') || message.includes('web-search')) {
                                    newProgress = Math.min(currentProgress + 8, 60);
                                    statusText = 'Searching the web...';
                                } else if (message.includes('dataSynthesis') || message.includes('data-synthesis')) {
                                    newProgress = Math.min(currentProgress + 10, 85);
                                    statusText = 'Synthesizing data...';
                                } else if (message.includes('completed')) {
                                    newProgress = Math.min(currentProgress + 5, 90);
                                    statusText = 'Processing results...';
                                } else if (message.includes('Step completed')) {
                                    newProgress = Math.min(currentProgress + 3, 88);
                                    statusText = 'Analyzing...';
                                } else {
                                    // Generic progress update for other system messages
                                    newProgress = Math.min(currentProgress + 2, 80);
                                    statusText = message.substring(0, 50);
                                }

                                // Only update if progressing forward
                                if (newProgress > currentProgress) {
                                    setResearchProgress(newProgress, statusText);
                                } else if (statusText) {
                                    // Update text even if progress doesn't move
                                    setResearchProgress(currentProgress, statusText);
                                }
                            }
                            // Check for Errors
                            else if (content.startsWith && content.startsWith('\n[System Error:')) {
                                setLogs(prev => [...prev, `❌ ${content}`]);
                            }
                            // Append text content (this is the actual response JSON)
                            else if (typeof content === 'string') {
                                // Accumulate ALL string content to preserve JSON integrity
                                finalJson += content;
                            }
                        }
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
                    // Robust JSON extraction - the AI might return:
                    // 1. Multiple JSON blocks (sometimes duplicated)
                    // 2. Malformed markdown (e.g., ``````json instead of ``` followed by ```json)
                    // 3. Text before/after the JSON

                    let result = null;

                    // Strategy 1: Extract all ```json ... ``` blocks and try to parse each
                    // Use a global regex to find all potential JSON blocks
                    const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)```/g;
                    const blocks: string[] = [];
                    let match;
                    while ((match = jsonBlockRegex.exec(finalJson)) !== null) {
                        if (match[1] && match[1].trim()) {
                            blocks.push(match[1].trim());
                        }
                    }

                    // Try each block, preferring ones that look like valid reports
                    for (const block of blocks) {
                        try {
                            const parsed = JSON.parse(block);
                            if (parsed && (parsed.title || parsed.summary)) {
                                result = parsed;
                                break; // Use the first valid report
                            }
                        } catch {
                            // Not valid JSON, continue
                        }
                    }

                    // Strategy 2: If no blocks worked, try to find JSON object by braces
                    if (!result) {
                        // Find the last complete JSON object (balancing braces)
                        let braceCount = 0;
                        let jsonStart = -1;
                        let jsonEnd = -1;

                        for (let i = finalJson.length - 1; i >= 0; i--) {
                            if (finalJson[i] === '}') {
                                if (braceCount === 0) jsonEnd = i;
                                braceCount++;
                            } else if (finalJson[i] === '{') {
                                braceCount--;
                                if (braceCount === 0) {
                                    jsonStart = i;
                                    break;
                                }
                            }
                        }

                        if (jsonStart !== -1 && jsonEnd !== -1) {
                            const candidate = finalJson.substring(jsonStart, jsonEnd + 1);
                            try {
                                const parsed = JSON.parse(candidate);
                                if (parsed && (parsed.title || parsed.summary)) {
                                    result = parsed;
                                }
                            } catch {
                                // Try simpler extraction
                            }
                        }
                    }

                    // Strategy 3: Simple first-to-last brace extraction
                    if (!result) {
                        const firstBrace = finalJson.indexOf('{');
                        const lastBrace = finalJson.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                            const candidate = finalJson.substring(firstBrace, lastBrace + 1);
                            result = JSON.parse(candidate);
                        }
                    }

                    if (!result) {
                        throw new Error('Could not extract valid JSON from response');
                    }

                    // Validate it has fields we need
                    if (result.title || result.summary) {
                        setResearchResults(result);
                        setTimeout(() => transition('PRESENTING', 'research_complete'), 1000);
                    } else {
                        throw new Error('Missing result fields');
                    }

                } catch (parseError) {
                    console.error('Failed to parse result JSON', parseError);
                    console.log('Final JSON Length:', finalJson.length);
                    console.log('Final JSON Snippet:', finalJson.substring(0, 500) + '...' + finalJson.substring(finalJson.length - 500));

                    // Fallback for demo if parsing fails but we got text
                    setResearchResults({
                        title: `Research Report: ${formSchema?.researchTopic}`,
                        summary: finalJson.replace(/```json/g, '').replace(/```/g, '').trim().substring(0, 1000) + '...',
                        keyFindings: ["Could not parse structured findings. See summary."],
                        sources: [],
                        timestamp: new Date(),
                        id: ''
                    });
                    setTimeout(() => transition('PRESENTING', 'research_complete'), 2000);
                }

            } catch (error) {
                if (isCancelled) {
                    console.log('[CLIENT] Request cancelled');
                    return;
                }
                console.error('[CLIENT ERROR]', error);
                setResearchProgress(0, 'Research failed. Please try again.');
            }
        }

        startResearch();

        return () => {
            console.log('[CLIENT] Cleanup - setting cancelled flag');
            isCancelled = true;
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

                    {/* Activity Log */}
                    <div className={styles.logsContainer}>
                        <div className={styles.logsHeader}>Activity Log</div>
                        <div className={styles.logsContent}>
                            {logs.length === 0 && <span className={styles.logPlaceholder}>Waiting for agent activity...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className={styles.logEntry}>{log}</div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
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
