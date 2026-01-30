'use client';

import { useEffect } from 'react';
import { useAppStore, FormSchema, FormField } from '@/lib/state-machine';
import styles from './FormPreview.module.css';

// Icons
const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20,6 9,17 4,12" />
    </svg>
);

const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const SparkleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
);

const ConditionalIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 3h5v5" />
        <path d="M8 21H3v-5" />
        <path d="M21 3l-9 9" />
        <path d="M3 21l9-9" />
    </svg>
);

// Field type badges
const fieldTypeInfo: Record<string, { label: string; color: string }> = {
    text: { label: 'Text', color: '#3b82f6' },
    textarea: { label: 'Long Text', color: '#8b5cf6' },
    select: { label: 'Single Choice', color: '#10b981' },
    multiselect: { label: 'Multiple Choice', color: '#06b6d4' },
    number: { label: 'Number', color: '#f59e0b' },
    boolean: { label: 'Yes/No', color: '#ef4444' },
    date: { label: 'Date', color: '#ec4899' },
};

interface FormPreviewProps {
    formSchema: FormSchema;
}

export function FormPreview({ formSchema }: FormPreviewProps) {
    const { transition } = useAppStore();

    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleEditWithAI = () => {
        transition('INTERVIEWING', 'edit_form');
    };

    const handleConfirm = () => {
        transition('FORM_ACTIVE', 'confirm_form');
    };

    // Group fields by dependencies
    const hasConditionalFields = formSchema.fields.some(f => f.dependsOn && f.dependsOn.length > 0);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerIcon}>
                        <SparkleIcon />
                    </div>
                    <h1 className={styles.title}>{formSchema.title}</h1>
                    <p className={styles.description}>{formSchema.description}</p>
                    {formSchema.researchTopic && (
                        <div className={styles.topic}>
                            <span className={styles.topicLabel}>Research Topic:</span>
                            <span className={styles.topicValue}>{formSchema.researchTopic}</span>
                        </div>
                    )}
                </div>

                {/* Field Preview Cards */}
                <div className={styles.fieldsContainer}>
                    <h2 className={styles.sectionTitle}>
                        Form Fields ({formSchema.fields.length})
                    </h2>

                    <div className={styles.fieldsList}>
                        {formSchema.fields.map((field, index) => (
                            <FieldCard key={field.id} field={field} index={index} />
                        ))}
                    </div>

                    {/* Dependency Legend */}
                    {hasConditionalFields && (
                        <div className={styles.legend}>
                            <span className={styles.legendItem}>
                                <span className={styles.conditionalBadge}><ConditionalIcon /></span>
                                Conditional field (shown based on other answers)
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button onClick={handleEditWithAI} className={styles.editButton}>
                        <EditIcon />
                        <span>Edit with AI</span>
                    </button>
                    <button onClick={handleConfirm} className={styles.confirmButton}>
                        <CheckIcon />
                        <span>Confirm & Fill Form</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Field Card Component
function FieldCard({ field, index }: { field: FormField; index: number }) {
    const typeInfo = fieldTypeInfo[field.type] || { label: field.type, color: '#6b7280' };
    const isConditional = field.dependsOn && field.dependsOn.length > 0;

    return (
        <div className={`${styles.fieldCard} ${isConditional ? styles.conditionalField : ''}`}>
            <div className={styles.fieldHeader}>
                <span className={styles.fieldNumber}>{index + 1}</span>
                <span
                    className={styles.fieldType}
                    style={{ '--type-color': typeInfo.color } as React.CSSProperties}
                >
                    {typeInfo.label}
                </span>
                {field.required && <span className={styles.requiredBadge}>Required</span>}
                {isConditional && (
                    <span className={styles.conditionalBadge}>
                        <ConditionalIcon />
                    </span>
                )}
            </div>

            <h3 className={styles.fieldLabel}>{field.label}</h3>

            {field.helpText && (
                <p className={styles.fieldHelp}>{field.helpText}</p>
            )}

            {/* Show options for select/multiselect */}
            {field.options && field.options.length > 0 && (
                <div className={styles.fieldOptions}>
                    <span className={styles.optionsLabel}>Options:</span>
                    <div className={styles.optionsList}>
                        {field.options.map((opt, i) => (
                            <span key={i} className={styles.optionChip}>
                                {opt.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Show condition info */}
            {isConditional && field.visibilityConditions && (
                <div className={styles.conditionInfo}>
                    <ConditionalIcon />
                    <span>Shows when: {field.dependsOn?.join(', ')} matches condition</span>
                </div>
            )}
        </div>
    );
}

export default FormPreview;
