import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Zod schema for field condition
 */
const FieldConditionSchema = z.object({
    fieldId: z.string().describe('ID of the field to check'),
    operator: z.enum([
        'equals', 'not_equals', 'contains', 'not_contains',
        'greater_than', 'less_than', 'is_empty', 'is_not_empty',
        'in', 'not_in'
    ]).describe('Comparison operator'),
    value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string())
    ]).optional().describe('Value to compare against'),
});

/**
 * Zod schema for condition group (recursive)
 */
const ConditionGroupSchema: z.ZodType<{
    operator: 'AND' | 'OR';
    conditions: Array<{
        fieldId?: string;
        operator?: string;
        value?: string | number | boolean | string[];
    } | {
        operator: 'AND' | 'OR';
        conditions: unknown[];
    }>;
}> = z.object({
    operator: z.enum(['AND', 'OR']).describe('Logical operator'),
    conditions: z.array(z.union([
        FieldConditionSchema,
        z.lazy(() => ConditionGroupSchema)
    ])).describe('Array of conditions or nested groups'),
});

/**
 * Zod schema for validation rule
 */
const ValidationRuleSchema = z.object({
    type: z.enum([
        'required', 'min', 'max', 'minLength', 'maxLength',
        'pattern', 'email', 'url', 'custom'
    ]).describe('Type of validation'),
    value: z.union([z.string(), z.number()]).optional().describe('Validation value'),
    message: z.string().describe('Error message to display'),
});

/**
 * Zod schema for field option
 */
const FieldOptionSchema = z.object({
    value: z.string().describe('Option value'),
    label: z.string().describe('Display label'),
    description: z.string().optional().describe('Optional description'),
});

/**
 * Zod schema for a form field
 */
const FormFieldSchema = z.object({
    id: z.string().describe('Unique field identifier (snake_case)'),
    type: z.enum([
        'text', 'textarea', 'number', 'email', 'url',
        'select', 'multiselect', 'radio', 'checkbox',
        'date', 'datetime', 'boolean',
        'priority',     // Ranked list for ordering items by importance
        'dealbreaker'   // Yes/No with special treatment for hard requirements
    ]).describe('Field type - use priority for rankings, dealbreaker for hard requirements'),
    label: z.string().describe('Display label for the field'),
    description: z.string().optional().describe('Longer description of what this field is for'),
    placeholder: z.string().optional().describe('Placeholder text'),
    helpText: z.string().optional().describe('Help text shown below the field'),
    defaultValue: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string())
    ]).optional().describe('Default value'),
    required: z.boolean().describe('Whether field is required'),
    validationRules: z.array(ValidationRuleSchema).optional().describe('Validation rules'),
    options: z.array(FieldOptionSchema).optional().describe('Options for select/multiselect/radio/priority'),
    visibilityConditions: ConditionGroupSchema.optional().describe('Conditions for when field is visible'),
    dependsOn: z.array(z.string()).optional().describe('IDs of fields this depends on'),
    group: z.string().optional().describe('Group ID for organizing fields'),
    order: z.number().describe('Display order (0-indexed)'),
});

/**
 * Zod schema for a form group
 */
const FormGroupSchema = z.object({
    id: z.string().describe('Unique group identifier'),
    title: z.string().describe('Group title'),
    description: z.string().optional().describe('Group description'),
    order: z.number().describe('Display order'),
});

/**
 * Zod schema for the complete form
 */
const FormSchemaOutput = z.object({
    id: z.string().describe('Unique form identifier'),
    title: z.string().describe('Form title'),
    description: z.string().optional().describe('Form description'),
    fields: z.array(FormFieldSchema).describe('Array of form fields'),
    groups: z.array(FormGroupSchema).optional().describe('Optional field groups'),
    researchTopic: z.string().describe('The main research topic this form is for'),
});

/**
 * Form Generator Tool
 * 
 * This tool is called by the Form Builder Agent when it has gathered
 * enough information to generate a complete form schema.
 * 
 * INCLUDES VALIDATION: Rejects evaluation fields, data collection fields,
 * and other anti-patterns that don't belong in a criteria capture form.
 */

/**
 * Patterns that indicate BAD fields (user can't answer these before research)
 */
const EVALUATION_PATTERNS = [
    /rate\s+(the|this|their|its)/i,
    /score\s+(the|this|their|its)/i,
    /evaluate\s+(the|this|their|its)/i,
    /how\s+(good|bad|well|would you rate)/i,
    /quality\s+of/i,
    /performance\s+of/i,
    /\brating\b/i,
    /satisfaction\s+with/i,
    /experience\s+with\s+(the\s+)?tool/i,
];

const DATA_COLLECTION_PATTERNS = [
    /^tool\s+name$/i,
    /^product\s+name$/i,
    /^company\s+(name|website|url)/i,
    /^pricing\s+(model|tier|plan)/i,
    /^(core\s+)?value\s+proposition/i,
    /^(main\s+)?features?\s*(list)?$/i,
    /^website(\s+url)?$/i,
    /^(phone|contact)\s*(number|info)/i,
    /^address$/i,
    /^description\s+of\s+(the\s+)?tool/i,
    /what\s+does\s+(the\s+tool|it)\s+do/i,
    /list\s+(the\s+)?(features|capabilities|integrations)/i,
];

/**
 * Patterns that indicate GOOD fields (user knows these before research)
 */
const CRITERIA_PATTERNS = [
    /budget/i,
    /maximum|minimum|limit/i,
    /priority|priorities|rank/i,
    /requirement|require|must\s+have|need/i,
    /prefer|preference/i,
    /scenario|workflow|use\s+case/i,
    /dealbreaker|deal\s+breaker|eliminate/i,
    /timeline|deadline|urgency/i,
    /team\s+size|scale/i,
    /compliance|security|regulation/i,
    /integration.*need|need.*integration/i,
    /constraint/i,
    /current\s+(solution|tool|pain)/i,
    /what\s+would\s+make.*fail/i,
    /stakeholder/i,
];

/**
 * Validate a field label against anti-patterns
 * Returns { valid: boolean, reason?: string, suggestion?: string }
 */
function validateFieldLabel(label: string): { valid: boolean; reason?: string; suggestion?: string } {
    // Check for evaluation patterns (BAD)
    for (const pattern of EVALUATION_PATTERNS) {
        if (pattern.test(label)) {
            return {
                valid: false,
                reason: `Field "${label}" asks user to evaluate something they haven't used yet`,
                suggestion: 'Convert to a priority/preference field instead',
            };
        }
    }
    
    // Check for data collection patterns (BAD)
    for (const pattern of DATA_COLLECTION_PATTERNS) {
        if (pattern.test(label)) {
            return {
                valid: false,
                reason: `Field "${label}" asks for data the research should find`,
                suggestion: 'Remove this field or convert to a constraint/filter',
            };
        }
    }
    
    return { valid: true };
}

/**
 * Analyze fields for quality and suggest improvements
 */
function analyzeFormQuality(fields: Array<{ fieldId: string; fieldType: string; label: string }>) {
    const hasPriorityField = fields.some(f => 
        f.fieldType === 'priority' || 
        /priority|rank|order|importance/i.test(f.label)
    );
    
    const hasScenarioField = fields.some(f =>
        /scenario|workflow|use\s+case|example|describe.*task/i.test(f.label)
    );
    
    const hasDealbreakerField = fields.some(f =>
        f.fieldType === 'dealbreaker' ||
        /dealbreaker|must\s+have|absolute|eliminate|reject/i.test(f.label)
    );
    
    const hasBudgetField = fields.some(f =>
        /budget|price|cost|spend/i.test(f.label)
    );
    
    const warnings: string[] = [];
    
    if (!hasPriorityField) {
        warnings.push('Consider adding a priority ranking field to understand what matters most');
    }
    if (!hasScenarioField) {
        warnings.push('Consider adding a scenario/workflow field to understand real use cases');
    }
    if (!hasDealbreakerField) {
        warnings.push('Consider adding a dealbreaker field to identify hard requirements');
    }
    if (!hasBudgetField && fields.length > 3) {
        warnings.push('Consider adding a budget/cost constraint field');
    }
    
    return { hasPriorityField, hasScenarioField, hasDealbreakerField, hasBudgetField, warnings };
}

export const formGeneratorTool = createTool({
    id: 'form-generator',
    description: `Generate a CRITERIA CAPTURE form schema for gathering research requirements from the user.

This form captures what the USER KNOWS that guides YOUR RESEARCH:
✅ VALID: User constraints (budget, timeline, team size)
✅ VALID: User priorities (ranked importance of factors)  
✅ VALID: User scenarios (specific workflows to test)
✅ VALID: User dealbreakers (hard requirements)
✅ VALID: User preferences (cloud vs self-hosted, etc.)

❌ INVALID: Evaluation fields (user can't rate tools they haven't used)
❌ INVALID: Data fields (tool features, pricing tiers - research finds these)
❌ INVALID: Redundant fields (re-asking what user already told you)

The tool will VALIDATE fields and reject or flag anti-patterns.`,
    inputSchema: z.object({
        researchTopic: z.string().describe('The main research topic'),
        researchGoals: z.string().describe('What the user wants to learn or achieve'),
        userContext: z.string().describe('Any relevant context about the user (location, industry, etc.)'),
        formFields: z.array(z.object({
            fieldId: z.string(),
            fieldType: z.enum([
                'text', 'textarea', 'number', 'email', 'url',
                'select', 'multiselect', 'radio', 'checkbox',
                'date', 'datetime', 'boolean', 'priority', 'dealbreaker'
            ]).describe('Field type - use "priority" for rankings, "dealbreaker" for hard requirements'),
            label: z.string(),
            helpText: z.string().optional(),
            required: z.boolean(),
            options: z.array(z.string()).optional(),
            showOnlyIf: z.object({
                dependsOnField: z.string(),
                condition: z.string(),
                value: z.string(),
            }).optional(),
        })).describe('List of CRITERIA fields (constraints, priorities, scenarios, preferences) - NOT data/evaluation fields'),
    }),
    outputSchema: FormSchemaOutput,
    execute: async ({ researchTopic, researchGoals, userContext, formFields }) => {
        // VALIDATION PHASE: Check each field for anti-patterns
        const validatedFields: typeof formFields = [];
        const rejectedFields: Array<{ label: string; reason: string }> = [];
        
        for (const field of formFields) {
            const validation = validateFieldLabel(field.label);
            if (validation.valid) {
                validatedFields.push(field);
            } else {
                rejectedFields.push({
                    label: field.label,
                    reason: validation.reason || 'Invalid field pattern',
                });
                console.warn(`[FormGenerator] Rejected field: "${field.label}" - ${validation.reason}`);
            }
        }
        
        // Analyze form quality
        const quality = analyzeFormQuality(validatedFields);
        if (quality.warnings.length > 0) {
            console.info(`[FormGenerator] Quality suggestions: ${quality.warnings.join('; ')}`);
        }
        
        // If too many fields were rejected, log a warning
        if (rejectedFields.length > formFields.length / 2) {
            console.warn(`[FormGenerator] More than half of fields were rejected as anti-patterns. ` +
                `Rejected: ${rejectedFields.map(f => f.label).join(', ')}`);
        }

        // Generate a unique form ID
        const formId = `form_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // Convert the simplified field format to full FormField format
        const fields = validatedFields.map((field, index) => {
            const formField: z.infer<typeof FormFieldSchema> = {
                id: field.fieldId,
                type: field.fieldType as z.infer<typeof FormFieldSchema>['type'],
                label: field.label,
                helpText: field.helpText,
                required: field.required,
                order: index,
            };

            // Add options if present
            if (field.options && field.options.length > 0) {
                formField.options = field.options.map(opt => ({
                    value: opt.toLowerCase().replace(/\s+/g, '_'),
                    label: opt,
                }));
            }

            // Add conditional visibility if present
            if (field.showOnlyIf) {
                formField.visibilityConditions = {
                    operator: 'AND',
                    conditions: [{
                        fieldId: field.showOnlyIf.dependsOnField,
                        operator: field.showOnlyIf.condition as 'equals' | 'not_equals' | 'contains',
                        value: field.showOnlyIf.value,
                    }],
                };
                formField.dependsOn = [field.showOnlyIf.dependsOnField];
            }

            return formField;
        });

        // Create the form schema
        const formSchema: z.infer<typeof FormSchemaOutput> = {
            id: formId,
            title: `Research: ${researchTopic}`,
            description: `This form will help gather the information needed to research: ${researchGoals}`,
            fields,
            researchTopic,
        };

        return formSchema;
    },
});

export default formGeneratorTool;
