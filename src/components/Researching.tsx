
'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore, normalizeResearchResult } from '@/lib/state-machine';
import styles from './Researching.module.css';

// Icons
const SearchIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const BrainIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.4 2.1-1.1 2.9l-.9.9c.6.4 1 1.1 1 1.9V14a4 4 0 0 1-6 3.5A4 4 0 0 1 3 14v-2.3c0-.8.4-1.5 1-1.9l-.9-.9A4 4 0 0 1 8 2h4z" />
        <path d="M7 11v2a2 2 0 0 0 4 0v-2" />
        <path d="M13 11v2a2 2 0 0 0 4 0v-2" />
    </svg>
);

const DocIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </svg>
);

const SparkleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
);

// Stable particle positions - computed once based on index to avoid re-render flicker
const PARTICLE_CONFIGS = Array.from({ length: 20 }, (_, i) => ({
    delay: ((i * 7) % 5),
    duration: 10 + ((i * 3) % 10),
    xStart: ((i * 17) % 100),
    xEnd: ((i * 23 + 50) % 100),
    size: 2 + ((i * 11) % 4),
}));

// Floating particles for background effect
const FloatingParticles = () => {
    return (
        <div className={styles.particles}>
            {PARTICLE_CONFIGS.map((config, i) => (
                <div
                    key={i}
                    className={styles.particle}
                    style={{
                        '--delay': `${config.delay}s`,
                        '--duration': `${config.duration}s`,
                        '--x-start': `${config.xStart}%`,
                        '--x-end': `${config.xEnd}%`,
                        '--size': `${config.size}px`,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

// Stable neural node positions - computed once
const NEURAL_NODES = Array.from({ length: 8 }, (_, i) => ({
    delay: i * 0.3,
    x: 20 + (i % 4) * 20,
    y: 30 + Math.floor(i / 4) * 40,
}));

const NEURAL_LINES = Array.from({ length: 6 }, (_, i) => ({
    delay: i * 0.4,
    rotation: i * 30,
}));

// Neural network animation
const NeuralNetwork = () => {
    return (
        <div className={styles.neuralNetwork}>
            {NEURAL_NODES.map((node, i) => (
                <div
                    key={i}
                    className={styles.neuralNode}
                    style={{
                        '--node-delay': `${node.delay}s`,
                        '--node-x': `${node.x}%`,
                        '--node-y': `${node.y}%`,
                    } as React.CSSProperties}
                />
            ))}
            {NEURAL_LINES.map((line, i) => (
                <div
                    key={`line-${i}`}
                    className={styles.neuralLine}
                    style={{
                        '--line-delay': `${line.delay}s`,
                        '--rotation': `${line.rotation}deg`,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

export function Researching() {
    const { location, formData, researchStatus, researchProgress, setResearchProgress, setResearchResults, transition, formSchema, reset } = useAppStore();
    const [elapsedTime, setElapsedTime] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    
    // Track which form ID we've already started researching to prevent duplicates
    const researchedFormId = useRef<string | null>(null);

    // Auto-scroll logs when new entries are added
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Retry handler - reset the form ID to allow re-research
    const handleRetry = () => {
        setHasError(false);
        setErrorMessage('');
        setRetryCount(prev => prev + 1);
        setElapsedTime(0);
        setLogs([]);
        researchedFormId.current = null; // Allow new research
        setResearchProgress(0, 'Retrying research...');
    };

    // Start new research
    const handleStartNew = () => {
        reset();
    };

    // Call research API - uses form ID + session key to prevent duplicate calls
    useEffect(() => {
        const currentFormId = formSchema?.id;
        
        // Skip if no form or no data
        if (!currentFormId || !formData) return;
        
        // Create a unique session key for this research attempt
        const sessionKey = `${currentFormId}_${retryCount}`;
        
        // Skip if we've already completed this exact session
        if (researchedFormId.current === sessionKey) {
            console.log('[CLIENT] Skipping duplicate research for session:', sessionKey);
            return;
        }
        
        // Mark this session as in-progress (not complete yet)
        const previousSession = researchedFormId.current;
        researchedFormId.current = `pending_${sessionKey}`;

        // AbortController to cancel in-flight requests on unmount
        const abortController = new AbortController();
        let requestCompleted = false;
        
        // Reset UI state for fresh research
        setElapsedTime(0);
        setLogs([]);
        setHasError(false);
        setErrorMessage('');
        setResearchProgress(0, 'Initializing...');

        // Track content accumulation for smooth progress
        let lastContentLength = 0;
        let contentStarted = false;
        
        // Timer for elapsed time AND smooth progress updates
        const timer = setInterval(() => {
            setElapsedTime(prev => {
                const newTime = prev + 1;
                
                // Get current progress state
                const currentProgress = useAppStore.getState().researchProgress;
                
                // Phase 1: Thinking phase (0-25%) - slow time-based progress
                // AI is reasoning before sending any output
                if (!contentStarted && currentProgress < 25) {
                    // Logarithmic progress curve - fast at start, slows down
                    // This gives the illusion of progress while waiting
                    const targetProgress = Math.min(25, 5 + Math.log10(newTime + 1) * 10);
                    if (targetProgress > currentProgress) {
                        const messages = [
                            'AI is planning research strategy...',
                            'Analyzing requirements...',
                            'Preparing search queries...',
                            'Starting research...'
                        ];
                        const messageIndex = Math.min(Math.floor(newTime / 10), messages.length - 1);
                        setResearchProgress(Math.floor(targetProgress), messages[messageIndex]);
                    }
                }
                // Phase 2: Slow background progress during content streaming (max 85%)
                // This prevents feeling stuck if content is slow
                else if (contentStarted && currentProgress < 85) {
                    // Very slow increment every 5 seconds to show life
                    if (newTime % 5 === 0 && currentProgress < 80) {
                        setResearchProgress(currentProgress + 1, useAppStore.getState().researchStatus);
                    }
                }
                
                return newTime;
            });
        }, 1000);

        async function startResearch() {
            try {
                console.log('[CLIENT] Starting research for form:', currentFormId);
                setResearchProgress(5, 'Initializing research agent...');
                
                // Get fresh data from store to ensure we have latest
                const storeState = useAppStore.getState();
                const currentFormSchema = storeState.formSchema;
                const currentFormData = storeState.formData;
                const currentLocation = storeState.location;
                
                // Validate we have required data
                if (!currentFormSchema || !currentFormData || Object.keys(currentFormData).length === 0) {
                    console.error('[CLIENT] Missing required data:', {
                        hasFormSchema: !!currentFormSchema,
                        hasFormData: !!currentFormData,
                        formDataKeys: currentFormData ? Object.keys(currentFormData) : []
                    });
                    throw new Error('Missing form data. Please go back and complete the form.');
                }
                
                const requestBody = {
                    formId: currentFormSchema.id,
                    formData: currentFormData,
                    location: currentLocation
                };
                
                console.log('[CLIENT] Request body size:', JSON.stringify(requestBody).length);
                console.log('[CLIENT] Making fetch request to /api/research');

                const response = await fetch('/api/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: abortController.signal, // Allow cancellation
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
                                
                                // Mark that content has started (exit thinking phase)
                                if (!contentStarted && finalJson.length > 0) {
                                    contentStarted = true;
                                }
                                
                                // Smooth incremental progress based on content growth
                                // Instead of fixed thresholds, we use relative growth
                                const contentGrowth = finalJson.length - lastContentLength;
                                lastContentLength = finalJson.length;
                                
                                const currentProgress = useAppStore.getState().researchProgress;
                                
                                // Only update if we've received meaningful new content (>100 chars)
                                if (contentGrowth > 100 && currentProgress < 90) {
                                    // Calculate increment based on content chunk size
                                    // Larger chunks = bigger progress jumps, but capped
                                    const increment = Math.min(5, Math.max(1, Math.floor(contentGrowth / 500)));
                                    const newProgress = Math.min(90, currentProgress + increment);
                                    
                                    // Progress messages based on current progress range
                                    let statusText = 'Processing...';
                                    if (newProgress < 40) {
                                        statusText = 'AI is analyzing...';
                                    } else if (newProgress < 60) {
                                        statusText = 'Gathering insights...';
                                    } else if (newProgress < 80) {
                                        statusText = 'Compiling research...';
                                    } else {
                                        statusText = 'Finalizing report...';
                                    }
                                    
                                    if (newProgress > currentProgress) {
                                        setResearchProgress(newProgress, statusText);
                                    }
                                }
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

                    // Normalize the result to convert legacy fields to sections[]
                    // This ensures all downstream code sees a unified format
                    const normalizedResult = normalizeResearchResult(result as Record<string, unknown>);
                    
                    // Validate it has fields we need
                    if (normalizedResult.title || normalizedResult.summary) {
                        requestCompleted = true;
                        researchedFormId.current = sessionKey; // Mark as successfully completed
                        setResearchResults(normalizedResult);
                        setTimeout(() => transition('PRESENTING', 'research_complete'), 1000);
                    } else {
                        throw new Error('Missing result fields');
                    }

                } catch (parseError) {
                    console.error('Failed to parse result JSON', parseError);
                    console.log('Final JSON Length:', finalJson.length);
                    console.log('Final JSON Snippet:', finalJson.substring(0, 500) + '...' + finalJson.substring(finalJson.length - 500));

                    // Fallback for demo if parsing fails but we got text
                    requestCompleted = true;
                    researchedFormId.current = sessionKey; // Mark as completed (even with fallback)
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
                // Check for abort - don't show error if request was intentionally cancelled
                if (error instanceof DOMException && error.name === 'AbortError') {
                    console.log('[CLIENT] Request aborted (expected during unmount)');
                    // Reset tracking so next mount can try again
                    researchedFormId.current = null;
                    return;
                }
                if (requestCompleted) {
                    console.log('[CLIENT] Request cancelled');
                    return;
                }
                console.error('[CLIENT ERROR]', error);
                clearInterval(timer);
                
                // Determine error message
                let userMessage = 'Research failed. ';
                if (error instanceof Error) {
                    if (error.message.includes('terminated') || error.message.includes('socket')) {
                        userMessage += 'Connection was interrupted. This can happen with long research sessions.';
                    } else if (error.message.includes('timeout')) {
                        userMessage += 'The request took too long. Try a simpler query or standard depth.';
                    } else if (error.message.includes('fetch')) {
                        userMessage += 'Network error. Please check your connection.';
                    } else {
                        userMessage += error.message;
                    }
                } else {
                    userMessage += 'An unexpected error occurred.';
                }
                
                setHasError(true);
                setErrorMessage(userMessage);
                setResearchProgress(0, 'Research failed');
            }
        }

        startResearch();

        return () => {
            console.log('[CLIENT] Cleanup - aborting request for form:', currentFormId);
            // Only reset tracking if request didn't complete successfully
            if (!requestCompleted) {
                researchedFormId.current = null;
            }
            abortController.abort(); // Cancel in-flight fetch
            clearInterval(timer);
        };
    }, [formSchema?.id, retryCount]); // Re-run when form ID or retryCount changes

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // If there's an error, show error state with retry options
    if (hasError) {
        return (
            <div className={styles.container}>
                <FloatingParticles />
                <div className={styles.aurora}>
                    <div className={styles.auroraBlob1} />
                    <div className={styles.auroraBlob2} />
                </div>
                
                <div className={styles.content}>
                    <div className={styles.errorState}>
                        <div className={styles.errorIcon}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4m0 4h.01" />
                            </svg>
                        </div>
                        <h2 className={styles.errorTitle}>Research Interrupted</h2>
                        <p className={styles.errorMessage}>{errorMessage}</p>
                        <div className={styles.errorActions}>
                            <button onClick={handleRetry} className={styles.retryButton}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                                </svg>
                                Try Again
                            </button>
                            <button onClick={handleStartNew} className={styles.startNewButton}>
                                Start New Research
                            </button>
                        </div>
                        {logs.length > 0 && (
                            <div className={styles.errorLogs}>
                                <p className={styles.errorLogsTitle}>Research log:</p>
                                <div className={styles.logTerminal}>
                                    {logs.slice(-5).map((log, idx) => (
                                        <div key={idx} className={styles.logLine}>{log}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Animated background elements */}
            <FloatingParticles />
            <NeuralNetwork />
            
            {/* Aurora gradient background */}
            <div className={styles.aurora}>
                <div className={styles.auroraBlob1} />
                <div className={styles.auroraBlob2} />
                <div className={styles.auroraBlob3} />
            </div>

            <div className={styles.content}>
                {/* Glowing ring around icon */}
                <div className={styles.iconContainer}>
                    <div className={styles.iconRing} />
                    <div className={styles.iconRingOuter} />
                    <div className={styles.iconWrapper}>
                        {researchProgress < 30 ? <SearchIcon /> :
                            researchProgress < 60 ? <BrainIcon /> : <DocIcon />}
                    </div>
                </div>

                <div className={styles.statusWrapper}>
                    <h2 className={styles.statusText}>
                        <span className={styles.sparkle}><SparkleIcon /></span>
                        {researchStatus || 'Initializing research...'}
                    </h2>
                    <p className={styles.topicText}>{formSchema?.researchTopic}</p>
                </div>

                <div className={styles.progressContainer}>
                    {/* Enhanced progress bar */}
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${researchProgress}%` }}
                        >
                            <div className={styles.progressShine} />
                        </div>
                        <div className={styles.progressGlow} style={{ left: `${researchProgress}%` }} />
                    </div>
                    <div className={styles.metaInfo}>
                        <span className={styles.progressPercent}>{Math.round(researchProgress)}%</span>
                        <span className={styles.timer}>
                            <span className={styles.timerDot} />
                            {formatTime(elapsedTime)}
                        </span>
                    </div>

                    {/* Activity Log */}
                    <div className={styles.logsContainer}>
                        <div className={styles.logsHeader}>
                            <span className={styles.logsIcon}>📡</span>
                            Agent Activity
                            <span className={styles.liveBadge}>LIVE</span>
                        </div>
                        <div className={styles.logsContent}>
                            {logs.length === 0 && <span className={styles.logPlaceholder}>Initializing agent systems...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className={styles.logEntry}>
                                    <span className={styles.logArrow}>→</span>
                                    {log}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>

                {/* Enhanced steps visualization */}
                <div className={styles.steps}>
                    <div className={`${styles.step} ${researchProgress >= 5 ? styles.active : ''} ${researchProgress >= 30 ? styles.completed : ''}`}>
                        <div className={styles.stepIconWrapper}>
                            <span className={styles.stepIcon}>🎯</span>
                        </div>
                        <span className={styles.stepLabel}>Planning</span>
                    </div>
                    <div className={styles.stepConnector}>
                        <div className={`${styles.connectorFill} ${researchProgress >= 30 ? styles.filled : ''}`} />
                    </div>
                    <div className={`${styles.step} ${researchProgress >= 30 ? styles.active : ''} ${researchProgress >= 60 ? styles.completed : ''}`}>
                        <div className={styles.stepIconWrapper}>
                            <span className={styles.stepIcon}>🔍</span>
                        </div>
                        <span className={styles.stepLabel}>Searching</span>
                    </div>
                    <div className={styles.stepConnector}>
                        <div className={`${styles.connectorFill} ${researchProgress >= 60 ? styles.filled : ''}`} />
                    </div>
                    <div className={`${styles.step} ${researchProgress >= 60 ? styles.active : ''} ${researchProgress >= 90 ? styles.completed : ''}`}>
                        <div className={styles.stepIconWrapper}>
                            <span className={styles.stepIcon}>🧠</span>
                        </div>
                        <span className={styles.stepLabel}>Analyzing</span>
                    </div>
                    <div className={styles.stepConnector}>
                        <div className={`${styles.connectorFill} ${researchProgress >= 90 ? styles.filled : ''}`} />
                    </div>
                    <div className={`${styles.step} ${researchProgress >= 90 ? styles.active : ''} ${researchProgress >= 100 ? styles.completed : ''}`}>
                        <div className={styles.stepIconWrapper}>
                            <span className={styles.stepIcon}>✨</span>
                        </div>
                        <span className={styles.stepLabel}>Synthesizing</span>
                    </div>
                </div>

                <button
                    className={styles.cancelButton}
                    onClick={() => transition('FORM_ACTIVE', 'research_cancelled')}
                >
                    <span>Cancel Research</span>
                </button>
            </div>
        </div>
    );
}
