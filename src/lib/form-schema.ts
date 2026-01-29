// ============================================
// Form Schema Types
// Conditional form logic as a traversable graph
// ============================================

/**
 * Supported field types
 */
export type FieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'email'
    | 'url'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'datetime'
    | 'boolean';

/**
 * Comparison operators for conditional logic
 */
export type ConditionOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'less_than'
    | 'is_empty'
    | 'is_not_empty'
    | 'in'        // value is in array
    | 'not_in';   // value is not in array

/**
 * Logical operators for combining conditions
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Single condition for field visibility/validation
 */
export interface FieldCondition {
    fieldId: string;            // ID of the field to check
    operator: ConditionOperator;
    value?: string | number | boolean | string[];  // Value to compare against
}

/**
 * Group of conditions with logical operator
 */
export interface ConditionGroup {
    operator: LogicalOperator;
    conditions: (FieldCondition | ConditionGroup)[];
}

/**
 * Validation rule for a field
 */
export interface ValidationRule {
    type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'custom';
    value?: string | number;
    message: string;
}

/**
 * Option for select/multiselect/radio fields
 */
export interface FieldOption {
    value: string;
    label: string;
    description?: string;
}

/**
 * Form field definition with conditional logic
 */
export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    description?: string;
    placeholder?: string;
    helpText?: string;

    // Value handling
    defaultValue?: string | number | boolean | string[];

    // Validation
    required: boolean;
    validationRules?: ValidationRule[];

    // Options for select/multiselect/radio
    options?: FieldOption[];

    // Conditional visibility (field is hidden if conditions are not met)
    visibilityConditions?: ConditionGroup;

    // Dependencies - list of field IDs this field depends on
    dependsOn?: string[];

    // Grouping
    group?: string;

    // Order within form
    order: number;
}

/**
 * Form group for organizing fields
 */
export interface FormGroup {
    id: string;
    title: string;
    description?: string;
    order: number;
}

/**
 * Complete form schema
 */
export interface FormSchema {
    id: string;
    title: string;
    description?: string;

    // All fields in the form
    fields: FormField[];

    // Optional grouping
    groups?: FormGroup[];

    // Metadata
    createdAt: Date;
    researchTopic?: string;
}

/**
 * Form data - key is field ID, value is the user input
 */
export type FormData = Record<string, string | number | boolean | string[] | undefined>;

// ============================================
// Condition Evaluation Functions
// ============================================

/**
 * Evaluate a single condition against form data
 */
export function evaluateCondition(
    condition: FieldCondition,
    formData: FormData
): boolean {
    const fieldValue = formData[condition.fieldId];
    const compareValue = condition.value;

    switch (condition.operator) {
        case 'equals':
            return fieldValue === compareValue;

        case 'not_equals':
            return fieldValue !== compareValue;

        case 'contains':
            if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
                return fieldValue.toLowerCase().includes(compareValue.toLowerCase());
            }
            if (Array.isArray(fieldValue) && typeof compareValue === 'string') {
                return fieldValue.includes(compareValue);
            }
            return false;

        case 'not_contains':
            if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
                return !fieldValue.toLowerCase().includes(compareValue.toLowerCase());
            }
            if (Array.isArray(fieldValue) && typeof compareValue === 'string') {
                return !fieldValue.includes(compareValue);
            }
            return true;

        case 'greater_than':
            if (typeof fieldValue === 'number' && typeof compareValue === 'number') {
                return fieldValue > compareValue;
            }
            return false;

        case 'less_than':
            if (typeof fieldValue === 'number' && typeof compareValue === 'number') {
                return fieldValue < compareValue;
            }
            return false;

        case 'is_empty':
            return fieldValue === undefined ||
                fieldValue === null ||
                fieldValue === '' ||
                (Array.isArray(fieldValue) && fieldValue.length === 0);

        case 'is_not_empty':
            return fieldValue !== undefined &&
                fieldValue !== null &&
                fieldValue !== '' &&
                !(Array.isArray(fieldValue) && fieldValue.length === 0);

        case 'in':
            if (Array.isArray(compareValue)) {
                return compareValue.includes(fieldValue as string);
            }
            return false;

        case 'not_in':
            if (Array.isArray(compareValue)) {
                return !compareValue.includes(fieldValue as string);
            }
            return true;

        default:
            console.warn(`[FormSchema] Unknown operator: ${condition.operator}`);
            return true;
    }
}

/**
 * Evaluate a condition group (handles nested groups)
 */
export function evaluateConditionGroup(
    group: ConditionGroup,
    formData: FormData
): boolean {
    const results = group.conditions.map((condition) => {
        // Check if this is a nested group
        if ('operator' in condition && 'conditions' in condition) {
            return evaluateConditionGroup(condition as ConditionGroup, formData);
        }
        return evaluateCondition(condition as FieldCondition, formData);
    });

    if (group.operator === 'AND') {
        return results.every(Boolean);
    } else {
        return results.some(Boolean);
    }
}

/**
 * Check if a field should be visible based on its conditions
 */
export function isFieldVisible(
    field: FormField,
    formData: FormData
): boolean {
    if (!field.visibilityConditions) {
        return true; // No conditions = always visible
    }
    return evaluateConditionGroup(field.visibilityConditions, formData);
}

/**
 * Get all visible fields for the current form data
 */
export function getVisibleFields(
    schema: FormSchema,
    formData: FormData
): FormField[] {
    return schema.fields
        .filter((field) => isFieldVisible(field, formData))
        .sort((a, b) => a.order - b.order);
}

/**
 * Validate a single field value
 */
export function validateField(
    field: FormField,
    value: FormData[string],
    formData: FormData
): string | null {
    // Skip validation if field is not visible
    if (!isFieldVisible(field, formData)) {
        return null;
    }

    // Check required
    if (field.required) {
        if (value === undefined || value === null || value === '') {
            return `${field.label} is required`;
        }
        if (Array.isArray(value) && value.length === 0) {
            return `${field.label} is required`;
        }
    }

    // Check validation rules
    if (field.validationRules) {
        for (const rule of field.validationRules) {
            switch (rule.type) {
                case 'minLength':
                    if (typeof value === 'string' && value.length < (rule.value as number)) {
                        return rule.message;
                    }
                    break;

                case 'maxLength':
                    if (typeof value === 'string' && value.length > (rule.value as number)) {
                        return rule.message;
                    }
                    break;

                case 'min':
                    if (typeof value === 'number' && value < (rule.value as number)) {
                        return rule.message;
                    }
                    break;

                case 'max':
                    if (typeof value === 'number' && value > (rule.value as number)) {
                        return rule.message;
                    }
                    break;

                case 'pattern':
                    if (typeof value === 'string' && rule.value) {
                        const regex = new RegExp(rule.value as string);
                        if (!regex.test(value)) {
                            return rule.message;
                        }
                    }
                    break;

                case 'email':
                    if (typeof value === 'string' && value) {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                            return rule.message;
                        }
                    }
                    break;

                case 'url':
                    if (typeof value === 'string' && value) {
                        try {
                            new URL(value);
                        } catch {
                            return rule.message;
                        }
                    }
                    break;
            }
        }
    }

    return null;
}

/**
 * Validate entire form
 */
export function validateForm(
    schema: FormSchema,
    formData: FormData
): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const field of schema.fields) {
        const error = validateField(field, formData[field.id], formData);
        if (error) {
            errors[field.id] = error;
        }
    }

    return errors;
}

/**
 * Build dependency graph for fields
 */
export function buildDependencyGraph(
    schema: FormSchema
): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    // Initialize all fields
    for (const field of schema.fields) {
        graph.set(field.id, new Set());
    }

    // Build dependencies
    for (const field of schema.fields) {
        if (field.dependsOn) {
            for (const depId of field.dependsOn) {
                const deps = graph.get(depId);
                if (deps) {
                    deps.add(field.id);
                }
            }
        }

        // Also extract dependencies from visibility conditions
        if (field.visibilityConditions) {
            const conditionDeps = extractConditionDependencies(field.visibilityConditions);
            for (const depId of conditionDeps) {
                const deps = graph.get(depId);
                if (deps) {
                    deps.add(field.id);
                }
            }
        }
    }

    return graph;
}

/**
 * Extract field IDs referenced in conditions
 */
function extractConditionDependencies(
    group: ConditionGroup
): string[] {
    const deps: string[] = [];

    for (const condition of group.conditions) {
        if ('operator' in condition && 'conditions' in condition) {
            deps.push(...extractConditionDependencies(condition as ConditionGroup));
        } else {
            deps.push((condition as FieldCondition).fieldId);
        }
    }

    return deps;
}

/**
 * Create an empty form schema
 */
export function createEmptyFormSchema(title: string, description?: string): FormSchema {
    return {
        id: `form_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title,
        description,
        fields: [],
        createdAt: new Date(),
    };
}

/**
 * Add a field to a form schema
 */
export function addFieldToSchema(
    schema: FormSchema,
    field: Omit<FormField, 'order'>
): FormSchema {
    const order = schema.fields.length;
    return {
        ...schema,
        fields: [...schema.fields, { ...field, order }],
    };
}
