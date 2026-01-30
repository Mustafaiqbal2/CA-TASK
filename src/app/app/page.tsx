'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useChat, type Message } from '@ai-sdk/react';
import Link from 'next/link';
import { useAppStore } from '@/lib/state-machine';
import { ChatMessage } from '@/components/ChatMessage';
import { FormPreview } from '@/components/FormPreview';
import { FormActive } from '@/components/FormActive';
import { Sidebar } from '@/components/Sidebar';
import { LocationBanner } from '@/components/LocationBanner';

import { Researching } from '@/components/Researching';
import { ResearchResults } from '@/components/ResearchResults';
import styles from './app.module.css';

// Sparkle icon for branding
const SparkleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
);

// Menu icon for sidebar toggle
const MenuIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

// Back arrow icon
const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
    </svg>
);

// Send icon
const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
);

// Scroll icons
const ChevronUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 15l-6-6-6 6" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
    </svg>
);

const PauseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);

const PlayIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

// Helper to convert stored chat messages to AI SDK format
function convertStoredMessagesToAiFormat(storedMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }>): Message[] {
    return storedMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: new Date(msg.timestamp),
    }));
}

export default function AppPage() {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const { 
        currentState, 
        setFormSchema, 
        transition, 
        setError, 
        formSchema, 
        chatMessages, 
        addChatMessage,
        currentSessionId,
        createNewSession,
        saveCurrentSession,
        toggleSidebar,
        isSidebarOpen
    } = useAppStore();
    
    // Track if we've hydrated from storage
    const [isHydrated, setIsHydrated] = useState(false);
    const lastSyncedMessageCount = useRef(0);
    const lastSessionId = useRef<string | null>(null);
    
    // Scroll control state
    const [autoScroll, setAutoScroll] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const userScrolledRef = useRef(false);

    // Convert stored messages to AI SDK format for initial messages
    const initialMessages = convertStoredMessagesToAiFormat(chatMessages);

    // Initialize Vercel AI SDK chat hook with persisted messages
    const { messages, input, setInput, handleSubmit, isLoading, error, setMessages } = useChat({
        api: '/api/chat',
        initialMessages: isHydrated ? initialMessages : [],
        onFinish: (message) => {
            checkForFormGeneration(message.content);
            // Save session after each assistant message
            saveCurrentSession();
            // Re-enable auto-scroll after response completes
            setAutoScroll(true);
            userScrolledRef.current = false;
        },
        onError: (err) => {
            console.error('Chat error:', err);
            setError({
                code: 'CHAT_ERROR',
                message: err.message || 'Failed to connect to AI',
                timestamp: new Date(),
                recoverable: true,
            });
        },
    });

    // Hydrate from Zustand storage on mount
    useEffect(() => {
        // Zustand persist middleware hydrates async, so we wait a tick
        const unsubscribe = useAppStore.persist.onFinishHydration(() => {
            setIsHydrated(true);
            const state = useAppStore.getState();
            
            // Create a new session if none exists
            if (!state.currentSessionId) {
                state.createNewSession();
            }
            
            const storedMessages = state.chatMessages;
            if (storedMessages.length > 0) {
                setMessages(convertStoredMessagesToAiFormat(storedMessages));
                lastSyncedMessageCount.current = storedMessages.length;
            }
            lastSessionId.current = state.currentSessionId;
        });

        // Check if already hydrated
        if (useAppStore.persist.hasHydrated()) {
            setIsHydrated(true);
            const state = useAppStore.getState();
            
            // Create a new session if none exists
            if (!state.currentSessionId) {
                state.createNewSession();
            }
            
            const storedMessages = state.chatMessages;
            if (storedMessages.length > 0) {
                setMessages(convertStoredMessagesToAiFormat(storedMessages));
                lastSyncedMessageCount.current = storedMessages.length;
            }
            lastSessionId.current = state.currentSessionId;
        }

        return () => {
            unsubscribe?.();
        };
    }, [setMessages]);

    // Handle session switching - reset messages when session changes
    useEffect(() => {
        if (!isHydrated) return;
        
        if (currentSessionId && currentSessionId !== lastSessionId.current) {
            // Session changed, load new messages
            setMessages(convertStoredMessagesToAiFormat(chatMessages));
            lastSyncedMessageCount.current = chatMessages.length;
            lastSessionId.current = currentSessionId;
        }
    }, [currentSessionId, chatMessages, isHydrated, setMessages]);

    // Sync new messages from useChat to Zustand store
    useEffect(() => {
        if (!isHydrated) return;
        
        // Only sync new messages that haven't been synced yet
        if (messages.length > lastSyncedMessageCount.current) {
            const newMessages = messages.slice(lastSyncedMessageCount.current);
            newMessages.forEach(msg => {
                // Only add complete messages (not streaming)
                if (msg.content && msg.content.length > 0) {
                    addChatMessage({
                        role: msg.role as 'user' | 'assistant',
                        content: msg.content,
                    });
                }
            });
            lastSyncedMessageCount.current = messages.length;
        }
    }, [messages, isHydrated, addChatMessage]);

    // Handle form schema processing and state transition
    const handleViewForm = useCallback((parsed: any) => {
        if (parsed.action === 'generate_form' && parsed.form) {
            // Process interview context
            const interviewContext = parsed.form.interviewContext || {};

            const newFormSchema = {
                id: `form_${Date.now()}`,
                title: parsed.form.title,
                description: parsed.form.description,
                researchTopic: parsed.form.researchTopic,
                interviewContext: interviewContext,
                fields: parsed.form.fields.map((field: {
                    id: string;
                    type: string;
                    label: string;
                    helpText?: string;
                    required: boolean;
                    options?: string[];
                    showOnlyIf?: {
                        dependsOnField: string;
                        condition: string;
                        value: string;
                    };
                    prefilledFromInterview?: {
                        value: string | number | boolean | string[];
                        source: string;
                    };
                }, index: number) => ({
                    id: field.id,
                    type: field.type,
                    label: field.label,
                    helpText: field.helpText,
                    required: field.required,
                    order: index,
                    options: field.options?.map((opt: string) => ({
                        value: opt.toLowerCase().replace(/\s+/g, '_'),
                        label: opt,
                    })),
                    visibilityConditions: field.showOnlyIf ? {
                        operator: 'AND' as const,
                        conditions: [{
                            fieldId: field.showOnlyIf.dependsOnField,
                            operator: field.showOnlyIf.condition as 'equals',
                            value: field.showOnlyIf.value,
                        }],
                    } : undefined,
                    dependsOn: field.showOnlyIf ? [field.showOnlyIf.dependsOnField] : undefined,
                    // Pass through pre-filled context
                    prefilledFromInterview: field.prefilledFromInterview,
                    // Set default value from pre-filled interview data
                    defaultValue: field.prefilledFromInterview?.value,
                })),
                createdAt: new Date(),
            };

            setFormSchema(newFormSchema);

            // Also pre-populate form data with interview context values
            const prefilledData: Record<string, any> = {};

            // Add values from fields with prefilledFromInterview
            newFormSchema.fields.forEach((field: any) => {
                if (field.prefilledFromInterview?.value !== undefined) {
                    prefilledData[field.id] = field.prefilledFromInterview.value;
                }
            });

            // Add values from interviewContext (these might not have corresponding fields)
            Object.entries(interviewContext).forEach(([key, ctx]: [string, any]) => {
                if (ctx.value !== undefined) {
                    prefilledData[key] = ctx.value;
                }
            });

            // Pre-populate the form data store with gathered context
            if (Object.keys(prefilledData).length > 0) {
                useAppStore.getState().setFormData(prefilledData);
            }

            transition('FORM_PREVIEW', 'view_form');
        }
    }, [setFormSchema, transition]);

    // Check if AI response contains a form schema
    const checkForFormGeneration = useCallback((content: string) => {
        // More robust regex: optional json tag, flexible whitespace
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                handleViewForm(parsed);
            } catch (e) {
                console.error('Failed to parse form schema:', e);
            }
        }
    }, [handleViewForm]);

    // Handle scroll events to show/hide scroll buttons
    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        const isAtTop = scrollTop < 100;

        setShowScrollTop(!isAtTop && scrollTop > 200);
        setShowScrollBottom(!isAtBottom && scrollHeight > clientHeight);

        // If user manually scrolls up while loading, disable auto-scroll
        if (isLoading && !isAtBottom) {
            userScrolledRef.current = true;
            setAutoScroll(false);
        }
    }, [isLoading]);

    // Scroll to bottom when new messages arrive (only if auto-scroll is enabled)
    useEffect(() => {
        if (autoScroll && !userScrolledRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, autoScroll]);

    // Continuous scroll during streaming - this is crucial for real-time scrolling
    useEffect(() => {
        if (!isLoading || !autoScroll || userScrolledRef.current) return;
        
        // Create an interval to scroll during streaming
        const scrollInterval = setInterval(() => {
            if (autoScroll && !userScrolledRef.current) {
                const container = messagesContainerRef.current;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }
        }, 100); // Scroll every 100ms during streaming

        return () => clearInterval(scrollInterval);
    }, [isLoading, autoScroll]);

    // Scroll handlers
    const scrollToTop = () => {
        messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setAutoScroll(true);
        userScrolledRef.current = false;
    };

    const toggleAutoScroll = () => {
        setAutoScroll(!autoScroll);
        if (!autoScroll) {
            userScrolledRef.current = false;
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    // Handle suggestion click - set input and submit
    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        // Submit form after React updates the input
        setTimeout(() => {
            if (formRef.current) {
                formRef.current.requestSubmit();
                textareaRef.current?.focus();
            }
        }, 10);
    };

    // Handle form submit
    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (input?.trim() && !isLoading) {
            handleSubmit(e);
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (formRef.current && input?.trim() && !isLoading) {
                formRef.current.requestSubmit();
            }
        }
    };

    // Show loading state until hydration is complete to prevent hydration mismatch
    if (!isHydrated) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner}>
                        <SparkleIcon />
                    </div>
                    <p>Loading your session...</p>
                </div>
            </div>
        );
    }

    // Render different UI based on state
    if (currentState === 'FORM_PREVIEW' && formSchema) {
        return <FormPreview formSchema={formSchema} />;
    }

    if (currentState === 'FORM_ACTIVE' && formSchema) {
        return <FormActive formSchema={formSchema} />;
    }

    if (currentState === 'RESEARCHING') {
        return <Researching />;
    }

    // Handle non-standard states (not INTERVIEWING or PRESENTING)
    if (currentState !== 'INTERVIEWING' && currentState !== 'PRESENTING') {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    <h2>State: {currentState}</h2>
                    <p>This UI will be implemented in the next phase.</p>
                    <button
                        className={styles.resetButton}
                        onClick={() => {
                            useAppStore.getState().reset();
                        }}
                    >
                        Reset to Start
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.appLayout}>
            {/* Sidebar */}
            <Sidebar />
            
            <div className={styles.container}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <button 
                            className={styles.menuButton} 
                            onClick={toggleSidebar}
                            title="Toggle sidebar"
                        >
                            <MenuIcon />
                        </button>
                        <div className={styles.logo}>
                            <span className={styles.logoIcon}><SparkleIcon /></span>
                            <span className={styles.logoText}>Research<span className={styles.logoAi}>AI</span></span>
                        </div>
                        <div className={styles.headerActions}>
                            <LocationBanner />
                            {formSchema && currentState !== 'PRESENTING' && (
                                <button
                                    onClick={() => transition('FORM_PREVIEW', 'view_form')}
                                    className={styles.viewFormButton}
                                >
                                    View Form
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Render ResearchResults or Chat Area based on state */}
                {currentState === 'PRESENTING' ? (
                    <main className={styles.resultsArea}>
                        <ResearchResults />
                    </main>
                ) : (
                    <>
                        {/* Chat Area */}
                        <main className={styles.chatArea}>
                            <div 
                                ref={messagesContainerRef}
                                className={styles.messagesContainer}
                                onScroll={handleScroll}
                            >
                                {/* Welcome message if no messages yet */}
                                {messages.length === 0 && (
                                    <div className={styles.welcome}>
                                        <div className={styles.welcomeIcon}>
                                            <SparkleIcon />
                                        </div>
                                <h1 className={styles.welcomeTitle}>
                                    What would you like to <span className={styles.gradient}>research</span> today?
                                </h1>
                                <p className={styles.welcomeText}>
                                    I&apos;ll interview you to understand your needs, then create a customized form to gather the details for comprehensive research.
                                </p>
                                <div className={styles.suggestions}>
                                    <button
                                        className={styles.suggestionChip}
                                        onClick={() => handleSuggestionClick("I want to find the best project management tool for my startup")}
                                        type="button"
                                    >
                                        🚀 Best project management tools
                                    </button>
                                    <button
                                    className={styles.suggestionChip}
                                    onClick={() => handleSuggestionClick("I'm researching electric vehicles to buy")}
                                    type="button"
                                >
                                    🚗 Electric vehicles comparison
                                </button>
                                <button
                                    className={styles.suggestionChip}
                                    onClick={() => handleSuggestionClick("I need to research cloud hosting providers")}
                                    type="button"
                                >
                                    ☁️ Cloud hosting providers
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((message, index) => (
                        <ChatMessage
                            key={message.id || index}
                            role={message.role as 'user' | 'assistant'}
                            content={message.content}
                            isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                            onViewForm={handleViewForm}
                        />
                    ))}

                    {/* Typing indicator */}
                    {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
                        <div className={styles.typingIndicator}>
                            <div className={styles.typingDot} />
                            <div className={styles.typingDot} />
                            <div className={styles.typingDot} />
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className={styles.errorMessage}>
                            <span>⚠️</span>
                            <p>{error.message}</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Scroll Controls - Always visible floating button */}
                <div className={styles.scrollControls}>
                    {showScrollTop && (
                        <button 
                            className={styles.scrollButton} 
                            onClick={scrollToTop}
                            title="Scroll to top"
                        >
                            <ChevronUpIcon />
                        </button>
                    )}
                    <button 
                        className={`${styles.scrollButton} ${styles.autoScrollButton} ${autoScroll ? styles.active : ''}`}
                        onClick={toggleAutoScroll}
                        title={autoScroll ? "Auto-scroll ON (click to pause)" : "Auto-scroll OFF (click to resume)"}
                    >
                        {autoScroll ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    {(showScrollBottom || !autoScroll) && (
                        <button 
                            className={styles.scrollButton} 
                            onClick={scrollToBottom}
                            title="Scroll to bottom"
                        >
                            <ChevronDownIcon />
                        </button>
                    )}
                </div>
            </main>

            {/* Input Area */}
            <footer className={styles.inputArea}>
                <form ref={formRef} onSubmit={onSubmit} className={styles.inputForm}>
                    <div className={styles.inputContainer}>
                        <div className={styles.inputBox}>
                            <span className={styles.sparkleDecor}><SparkleIcon /></span>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Tell me what you'd like to research..."
                                className={styles.textarea}
                                rows={1}
                            // Do not disable to maintain focus
                            />
                            <button
                                type="submit"
                                className={styles.sendButton}
                                disabled={!input?.trim() || isLoading}
                                aria-label="Send message"
                            >
                                {isLoading ? (
                                    <div className={styles.loader}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                ) : (
                                    <SendIcon />
                                )}
                            </button>
                        </div>
                        <div className={styles.hint}>
                            Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line
                        </div>
                    </div>
                </form>
            </footer>
                    </>
                )}
            </div>
        </div>
    );
}
