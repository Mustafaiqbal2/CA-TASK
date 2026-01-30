'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAppStore, FormSchema, FormField } from '@/lib/state-machine';
import { evaluateConditionGroup, validateField as validateFieldSchema } from '@/lib/form-schema';
import styles from './FormActive.module.css';

// Icons
const ChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20,6 9,17 4,12" />
    </svg>
);

const SparkleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
);

interface FormActiveProps {
    formSchema: FormSchema;
}

type FormValues = Record<string, string | string[] | number | boolean>;
type FormErrors = Record<string, string>;

type ResearchDepth = 'standard' | 'deep';

export function FormActive({ formSchema }: FormActiveProps) {
    const { transition, setFormData, formData: storedFormData } = useAppStore();

    // Research depth selection
    const [researchDepth, setResearchDepth] = useState<ResearchDepth>('standard');

    // Initialize with pre-filled data from interview
    const [values, setValues] = useState<FormValues>(() => {
        const initial: FormValues = {};
        // Start with stored form data (includes interview context)
        Object.entries(storedFormData).forEach(([key, val]) => {
            if (val !== undefined) {
                initial[key] = val as FormValues[string];
            }
        });
        // Also apply default values from fields
        formSchema.fields.forEach(field => {
            if (field.defaultValue !== undefined && initial[field.id] === undefined) {
                initial[field.id] = field.defaultValue as FormValues[string];
            }
        });
        return initial;
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [currentStep, setCurrentStep] = useState(0);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Evaluate visibility conditions for a field
    const evaluateCondition = useCallback((field: FormField): boolean => {
        // If no visibility conditions, the field is visible
        if (!field.visibilityConditions) {
            return true;
        }

        // Use the shared evaluation logic
        return evaluateConditionGroup(field.visibilityConditions, values);
    }, [values]);

    // Get visible fields
    const visibleFields = useMemo(() => {
        return formSchema.fields.filter(field => evaluateCondition(field));
    }, [formSchema.fields, evaluateCondition]);

    // Split into steps (5 fields per step for multi-step)
    const FIELDS_PER_STEP = 5;
    const steps = useMemo(() => {
        const result: FormField[][] = [];
        for (let i = 0; i < visibleFields.length; i += FIELDS_PER_STEP) {
            result.push(visibleFields.slice(i, i + FIELDS_PER_STEP));
        }
        return result.length > 0 ? result : [[]];
    }, [visibleFields]);

    const isMultiStep = steps.length > 1;
    const currentFields = steps[currentStep] || [];
    const isLastStep = currentStep === steps.length - 1;
    const progress = ((currentStep + 1) / steps.length) * 100;

    // Validate a single field
    const validateField = useCallback((field: FormField, value: FormValues[string]): string | null => {
        // Cast values to FormData type
        const formData = values as Record<string, string | number | boolean | string[] | undefined>;
        return validateFieldSchema(field, value, formData);
    }, [values]);

    // Validate current step
    const validateStep = useCallback((): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        currentFields.forEach(field => {
            const error = validateField(field, values[field.id]);
            if (error) {
                newErrors[field.id] = error;
                isValid = false;
            }
        });

        setErrors(prev => ({ ...prev, ...newErrors }));
        return isValid;
    }, [currentFields, values, validateField]);

    // Handle field change
    const handleChange = useCallback((fieldId: string, value: FormValues[string]) => {
        setValues(prev => ({ ...prev, [fieldId]: value }));

        // Clear error when user starts typing
        if (errors[fieldId]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[fieldId];
                return next;
            });
        }
    }, [errors]);

    // Handle field blur
    const handleBlur = useCallback((fieldId: string) => {
        setTouched(prev => ({ ...prev, [fieldId]: true }));

        const field = formSchema.fields.find(f => f.id === fieldId);
        if (field) {
            const error = validateField(field, values[fieldId]);
            if (error) {
                setErrors(prev => ({ ...prev, [fieldId]: error }));
            }
        }
    }, [formSchema.fields, values, validateField]);

    // Navigate steps
    const handleNext = () => {
        if (validateStep()) {
            if (isLastStep) {
                handleSubmit();
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        } else {
            transition('FORM_PREVIEW', 'back_to_preview');
        }
    };

    // Submit form
    const handleSubmit = () => {
        // Validate all visible fields
        let isValid = true;
        const allErrors: FormErrors = {};

        visibleFields.forEach(field => {
            const error = validateField(field, values[field.id]);
            if (error) {
                allErrors[field.id] = error;
                isValid = false;
            }
        });

        if (!isValid) {
            setErrors(allErrors);
            return;
        }

        // Save form data with research depth and transition
        // Cast FormValues to match FormData type (including undefined)
        setFormData({ 
            ...values, 
            researchDepth 
        } as Record<string, string | number | boolean | string[] | undefined>);
        transition('RESEARCHING', 'form_submitted');
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <button onClick={handleBack} className={styles.backButton}>
                        <ChevronLeft />
                        <span>Back</span>
                    </button>
                    <div className={styles.headerInfo}>
                        <h1 className={styles.title}>{formSchema.title}</h1>
                        {isMultiStep && (
                            <span className={styles.stepIndicator}>
                                Step {currentStep + 1} of {steps.length}
                            </span>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                {isMultiStep && (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className={styles.progressSteps}>
                            {steps.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`${styles.progressDot} ${idx <= currentStep ? styles.active : ''}`}
                                    onClick={() => idx < currentStep && setCurrentStep(idx)}
                                    disabled={idx > currentStep}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Interview Context Summary (if any) */}
                {formSchema.interviewContext && Object.keys(formSchema.interviewContext).length > 0 && (
                    <div className={styles.interviewContext}>
                        <div className={styles.interviewContextHeader}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4" />
                                <path d="M12 8h.01" />
                            </svg>
                            <span>Information gathered from interview</span>
                        </div>
                        <div className={styles.interviewContextItems}>
                            {Object.entries(formSchema.interviewContext).map(([key, ctx]) => (
                                <div key={key} className={styles.interviewContextItem}>
                                    <span className={styles.contextKey}>{key.replace(/_/g, ' ')}:</span>
                                    <span className={styles.contextValue}>
                                        {Array.isArray(ctx.value) ? ctx.value.join(', ') : String(ctx.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Form Fields */}
                <div className={styles.formContainer}>
                    {currentFields.map((field, index) => (
                        <FormFieldInput
                            key={field.id}
                            field={field}
                            value={values[field.id]}
                            error={touched[field.id] ? errors[field.id] : undefined}
                            onChange={(value) => handleChange(field.id, value)}
                            onBlur={() => handleBlur(field.id)}
                            index={index}
                            isPrefilled={!!field.prefilledFromInterview}
                        />
                    ))}
                </div>

                {/* Research Depth Selector - Only show on last step */}
                {isLastStep && (
                    <div className={styles.depthSelector}>
                        <div className={styles.depthHeader}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <span>Research Depth</span>
                        </div>
                        <div className={styles.depthOptions}>
                            <button
                                type="button"
                                className={`${styles.depthOption} ${researchDepth === 'standard' ? styles.depthActive : ''}`}
                                onClick={() => setResearchDepth('standard')}
                            >
                                <div className={styles.depthOptionHeader}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <span>Standard</span>
                                </div>
                                <p className={styles.depthDescription}>
                                    Quick analysis with 8-10 searches. Best for straightforward research needs.
                                </p>
                                <span className={styles.depthTime}>~2 minutes</span>
                            </button>
                            <button
                                type="button"
                                className={`${styles.depthOption} ${researchDepth === 'deep' ? styles.depthActive : ''}`}
                                onClick={() => setResearchDepth('deep')}
                            >
                                <div className={styles.depthOptionHeader}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                    </svg>
                                    <span>Deep Dive</span>
                                </div>
                                <p className={styles.depthDescription}>
                                    Comprehensive analysis with 15-20 searches including risk assessment.
                                </p>
                                <span className={styles.depthTime}>~4 minutes</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className={styles.actions}>
                    <button
                        onClick={handleBack}
                        className={styles.secondaryButton}
                    >
                        <ChevronLeft />
                        <span>{currentStep > 0 ? 'Previous' : 'Back to Preview'}</span>
                    </button>
                    <button
                        onClick={handleNext}
                        className={styles.primaryButton}
                        disabled={!currentFields.every(field => {
                            if (!field.required) return true;
                            const val = values[field.id];
                            return val !== undefined && val !== '' && (Array.isArray(val) ? val.length > 0 : true);
                        })}
                    >
                        {isLastStep ? (
                            <>
                                <SparkleIcon />
                                <span>Start Research</span>
                            </>
                        ) : (
                            <>
                                <span>Next</span>
                                <ChevronRight />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Individual Form Field Component
interface FormFieldInputProps {
    field: FormField;
    value: FormValues[string];
    error?: string;
    onChange: (value: FormValues[string]) => void;
    onBlur: () => void;
    index: number;
    isPrefilled?: boolean;
}

function FormFieldInput({ field, value, error, onChange, onBlur, index, isPrefilled }: FormFieldInputProps) {
    const animationDelay = `${index * 0.05}s`;

    const renderInput = () => {
        switch (field.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        className={`${styles.input} ${error ? styles.inputError : ''}`}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        placeholder={field.placeholder || `Describe ${field.label.toLowerCase()}`}
                        className={`${styles.textarea} ${error ? styles.inputError : ''}`}
                        rows={4}
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={(value as number) || ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                        onBlur={onBlur}
                        placeholder={field.placeholder || '0'}
                        className={`${styles.input} ${error ? styles.inputError : ''}`}
                        min={field.validationRules?.find(r => r.type === 'min')?.value as number}
                        max={field.validationRules?.find(r => r.type === 'max')?.value as number}
                    />
                );

            case 'select':
                return (
                    <select
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        className={`${styles.select} ${error ? styles.inputError : ''}`}
                    >
                        <option value="">Select {field.label.toLowerCase()}</option>
                        {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );

            case 'multiselect':
                const selectedValues = (value as string[]) || [];
                return (
                    <div className={styles.multiselectContainer}>
                        {field.options?.map((opt) => (
                            <label key={opt.value} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(opt.value)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            onChange([...selectedValues, opt.value]);
                                        } else {
                                            onChange(selectedValues.filter((v) => v !== opt.value));
                                        }
                                    }}
                                    className={styles.checkbox}
                                />
                                <span className={styles.checkboxCustom}>
                                    {selectedValues.includes(opt.value) && <CheckIcon />}
                                </span>
                                <span>{opt.label}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'boolean':
                return (
                    <div className={styles.booleanContainer}>
                        <button
                            type="button"
                            onClick={() => onChange(true)}
                            className={`${styles.booleanButton} ${value === true ? styles.booleanActive : ''}`}
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(false)}
                            className={`${styles.booleanButton} ${value === false ? styles.booleanActive : ''}`}
                        >
                            No
                        </button>
                    </div>
                );

            case 'dealbreaker':
                // Special boolean with strong visual treatment for critical requirements
                return (
                    <div className={styles.dealbreakerContainer}>
                        <button
                            type="button"
                            onClick={() => onChange(true)}
                            className={`${styles.dealbreakerButton} ${value === true ? styles.dealbreakerYes : ''}`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 9v2m0 4h.01M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            Required
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(false)}
                            className={`${styles.dealbreakerButton} ${value === false ? styles.dealbreakerNo : ''}`}
                        >
                            Nice to have
                        </button>
                    </div>
                );

            case 'priority':
                // Ranked list - users can drag to reorder or click to set priority
                const priorityValues = (value as string[]) || field.options?.map(o => o.value) || [];
                return (
                    <div className={styles.priorityContainer}>
                        <p className={styles.priorityHint}>Drag to reorder by importance (top = most important)</p>
                        {priorityValues.map((itemValue, idx) => {
                            const option = field.options?.find(o => o.value === itemValue);
                            return (
                                <div 
                                    key={itemValue} 
                                    className={styles.priorityItem}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', idx.toString());
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                                        const toIdx = idx;
                                        if (fromIdx !== toIdx) {
                                            const newOrder = [...priorityValues];
                                            const [moved] = newOrder.splice(fromIdx, 1);
                                            newOrder.splice(toIdx, 0, moved);
                                            onChange(newOrder);
                                        }
                                    }}
                                >
                                    <span className={styles.priorityRank}>{idx + 1}</span>
                                    <span className={styles.priorityLabel}>{option?.label || itemValue}</span>
                                    <span className={styles.priorityHandle}>⋮⋮</span>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'date':
                return (
                    <input
                        type="date"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        className={`${styles.input} ${error ? styles.inputError : ''}`}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        className={`${styles.input} ${error ? styles.inputError : ''}`}
                    />
                );
        }
    };

    return (
        <div
            className={`${styles.fieldWrapper} ${isPrefilled ? styles.prefilledField : ''} ${field.isDealbreaker ? styles.dealbreakerField : ''}`}
            style={{ animationDelay }}
        >
            <label className={styles.label}>
                {field.label}
                {field.required && <span className={styles.required}>*</span>}
                {field.isDealbreaker && (
                    <span className={styles.dealbreakerBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Dealbreaker
                    </span>
                )}
                {isPrefilled && (
                    <span className={styles.prefilledBadge} title={field.prefilledFromInterview?.source}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        From interview
                    </span>
                )}
            </label>
            {field.helpText && (
                <p className={styles.helpText}>{field.helpText}</p>
            )}
            {isPrefilled && field.prefilledFromInterview?.source && (
                <p className={styles.prefilledSource}>
                    💬 {field.prefilledFromInterview.source}
                </p>
            )}
            {renderInput()}
            {error && (
                <p className={styles.errorText}>{error}</p>
            )}
        </div>
    );
}

export default FormActive;
