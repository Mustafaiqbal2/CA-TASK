'use client';

import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ChatMessage.module.css';
import './ChatMessage.global.css'; // Add global styles for innerHTML content

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
    onViewForm?: (formData: any) => void;
}

// Sparkle icon for AI avatar
const SparkleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
);

// User icon
const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

function ChatMessageComponent({ role, content, isStreaming, onViewForm }: ChatMessageProps) {
    const isUser = role === 'user';
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    // Format content - convert markdown-like syntax to HTML


    const renderContent = () => {
        // Match both complete and incomplete JSON blocks
        // 1. Complete block: ```json\n...```
        // 2. Start of block: ```json
        type ContentPart = { type: string; content: string; fullMatch?: string };
        const parts: ContentPart[] = [];
        let currentIndex = 0;
        const jsonStartRegex = /```json\n?/g;

        // Find all JSON blocks
        let match;
        while ((match = jsonStartRegex.exec(content)) !== null) {
            // Add text before the JSON block
            if (match.index > currentIndex) {
                parts.push({
                    type: 'text',
                    content: content.slice(currentIndex, match.index)
                });
            }

            // Look for the closing of this block
            const remainingContent = content.slice(match.index + match[0].length);
            const closingIndex = remainingContent.indexOf('```');

            if (closingIndex !== -1) {
                // COMPLETE BLOCK
                const jsonContent = remainingContent.slice(0, closingIndex);
                parts.push({
                    type: 'json_complete',
                    content: jsonContent,
                    fullMatch: content.slice(match.index, match.index + match[0].length + closingIndex + 3)
                });
                // Advance index past the entire block
                currentIndex = match.index + match[0].length + closingIndex + 3;
                // Update regex lastIndex to continue searching from here
                jsonStartRegex.lastIndex = currentIndex;
            } else {
                // INCOMPLETE BLOCK (Streaming)
                parts.push({
                    type: 'json_streaming',
                    content: content.slice(match.index)
                });
                currentIndex = content.length; // We consumed everything
                break;
            }
        }

        // Add any remaining text
        if (currentIndex < content.length) {
            parts.push({
                type: 'text',
                content: content.slice(currentIndex)
            });
        }

        return parts.map((part, index) => {
            if (part.type === 'json_complete') {
                let formData = null;
                try {
                    formData = JSON.parse(part.content);
                } catch (e) {
                    // If parsing fails, just render as code block
                }

                if (formData && formData.action === 'generate_form') {
                    return (
                        <div key={index} className={styles.formBlock}>
                            <button
                                className={styles.formButton}
                                onClick={() => onViewForm?.(formData)}
                            >
                                ✨ Form Generated
                            </button>
                            <button
                                className={styles.copyButton}
                                onClick={() => handleCopy(part.content, index)}
                                title="Copy JSON"
                            >
                                {copiedIndex === index ? <CheckIcon /> : <CopyIcon />}
                            </button>
                        </div>
                    );
                } else {
                    // Not a form action, render as code block
                    return (
                        <div key={index} className={styles.content}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {part.fullMatch || part.content}
                            </ReactMarkdown>
                        </div>
                    );
                }
            } else if (part.type === 'json_streaming') {
                return (
                    <div key={index} className={styles.formBlock}>
                        <div className={styles.formButton} style={{ opacity: 0.7, cursor: 'default' }}>
                            <span className={styles.loaderSmall}></span>
                            Generating Form...
                        </div>
                    </div>
                );
            }

            // Render regular text
            if (!part.content.trim()) return null;

            return (
                <div key={index} className={styles.content}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {part.content}
                    </ReactMarkdown>
                </div>
            );
        });
    };

    return (
        <div className={`${styles.messageWrapper} ${isUser ? styles.userWrapper : styles.assistantWrapper}`}>
            <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.assistantAvatar}`}>
                {isUser ? <UserIcon /> : <SparkleIcon />}
            </div>
            <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
                <div className={styles.content}>
                    {renderContent()}
                </div>
                {isStreaming && (
                    <span className={styles.cursor}>▊</span>
                )}
            </div>
        </div>
    );
}

// Memoize to prevent unnecessary re-renders during streaming
export const ChatMessage = memo(ChatMessageComponent);

export default ChatMessage;
