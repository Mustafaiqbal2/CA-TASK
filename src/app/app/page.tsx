'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import Link from 'next/link';
import { useAppStore } from '@/lib/state-machine';
import { ChatMessage } from '@/components/ChatMessage';
import { FormPreview } from '@/components/FormPreview';
import { FormActive } from '@/components/FormActive';

import { Researching } from '@/components/Researching';
import { ResearchResults } from '@/components/ResearchResults';
import styles from './app.module.css';

// Sparkle icon for branding
const SparkleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
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

export default function AppPage() {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const { currentState, setFormSchema, transition, setError } = useAppStore();

    // Initialize Vercel AI SDK chat hook (v3.x API)
    const { messages, input, setInput, handleSubmit, isLoading, error } = useChat({
        api: '/api/chat',
        onFinish: (message) => {
            checkForFormGeneration(message.content);
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

    // Handle form schema processing and state transition
    const handleViewForm = useCallback((parsed: any) => {
        if (parsed.action === 'generate_form' && parsed.form) {
            const formSchema = {
                id: `form_${Date.now()}`,
                title: parsed.form.title,
                description: parsed.form.description,
                researchTopic: parsed.form.researchTopic,
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
                })),
                createdAt: new Date(),
            };

            setFormSchema(formSchema);
            transition('FORM_PREVIEW', 'view_form');
        }
    }, [setFormSchema, transition]);

    // Check if AI response contains a form schema
    const checkForFormGeneration = useCallback((content: string) => {
        const jsonMatch = content.match(/```json\n([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                handleViewForm(parsed);
            } catch (e) {
                console.error('Failed to parse form schema:', e);
            }
        }
    }, [handleViewForm]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                // Ensure focus remains
                /* setTimeout(() => {
                    textareaRef.current?.focus();
                }, 0); */
            }
        }
    };

    // Render different UI based on state
    if (currentState === 'FORM_PREVIEW' && useAppStore.getState().formSchema) {
        return <FormPreview formSchema={useAppStore.getState().formSchema!} />;
    }

    if (currentState === 'FORM_ACTIVE' && useAppStore.getState().formSchema) {
        return <FormActive formSchema={useAppStore.getState().formSchema!} />;
    }

    if (currentState === 'RESEARCHING') {
        return <Researching />;
    }

    if (currentState === 'PRESENTING') {
        return <ResearchResults />;
    }

    if (currentState !== 'INTERVIEWING') {
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
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <Link href="/" className={styles.backLink}>
                        <BackIcon />
                        <span>Back</span>
                    </Link>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}><SparkleIcon /></span>
                        <span className={styles.logoText}>Research<span className={styles.logoAi}>AI</span></span>
                    </div>
                    <div className={styles.headerSpacer}>
                        {useAppStore.getState().formSchema && (
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

            {/* Chat Area */}
            <main className={styles.chatArea}>
                <div className={styles.messagesContainer}>
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
        </div>
    );
}
