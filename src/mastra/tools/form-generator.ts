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
        'date', 'datetime', 'boolean'
    ]).describe('Field type'),
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
    options: z.array(FieldOptionSchema).optional().describe('Options for select/multiselect/radio'),
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
 */
export const formGeneratorTool = createTool({
    id: 'form-generator',
    description: `Generate a structured form schema for gathering research criteria and constraints from the user.
  
Use this tool to build a Requirements Gathering Form that the user will fill out.
The form should focus on:
- User preferences (e.g. "Budget Limit", "Preferred Platform")
- Constraints (e.g. "Must have API", "No Subscription")
- Research priorities (e.g. "Speed is more important than Cost")

It should NOT include fields for the data you are expected to find (e.g. "Product Price", "Company Address", "List of Features").`,
    inputSchema: z.object({
        researchTopic: z.string().describe('The main research topic'),
        researchGoals: z.string().describe('What the user wants to learn or achieve'),
        userContext: z.string().describe('Any relevant context about the user (location, industry, etc.)'),
        formFields: z.array(z.object({
            fieldId: z.string(),
            fieldType: z.string(),
            label: z.string(),
            helpText: z.string().optional(),
            required: z.boolean(),
            options: z.array(z.string()).optional(),
            showOnlyIf: z.object({
                dependsOnField: z.string(),
                condition: z.string(),
                value: z.string(),
            }).optional(),
        })).describe('List of fields to include in the form'),
    }),
    outputSchema: FormSchemaOutput,
    execute: async ({ researchTopic, researchGoals, userContext, formFields }) => {

        // Generate a unique form ID
        const formId = `form_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // Convert the simplified field format to full FormField format
        const fields = formFields.map((field, index) => {
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
