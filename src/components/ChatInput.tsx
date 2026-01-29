'use client';

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import styles from './ChatInput.module.css';

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading?: boolean;
    placeholder?: string;
}

// Send icon
const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
);

// Sparkle icon for decoration
const SparkleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={styles.sparkle}>
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
);

export function ChatInput({ onSend, isLoading = false, placeholder = "Ask me about your research..." }: ChatInputProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSend(input.trim());
            setInput('');
            // Reset height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                // Keep focus
                textareaRef.current.focus();
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter without Shift
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputWrapper}>
                <div className={styles.inputContainer}>
                    <SparkleIcon />
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={styles.textarea}
                        rows={1}
                    // Do not disable textarea to maintain focus
                    />
                    <button
                        type="submit"
                        className={styles.sendButton}
                        disabled={!input.trim() || isLoading}
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
    );
}

export default ChatInput;
