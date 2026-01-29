import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

/**
 * Research Workflow
 * 
 * This workflow orchestrates the research process using Mastra's
 * workflow system for explicit step-by-step execution.
 * 
 * Flow:
 * 1. validateInput - Validate and extract research parameters
 * 2. planResearch - Create research plan with search queries
 * 3. executeResearch - Perform web searches (calls research agent)
 * 4. synthesizeResults - Compile findings into final report
 */

// ============================================
// Input/Output Schemas
// ============================================

const WorkflowInputSchema = z.object({
    formId: z.string().describe('Unique form identifier'),
    formData: z.record(z.any()).describe('Form data from user'),
    location: z.object({
        country: z.string(),
        city: z.string(),
        region: z.string(),
        timezone: z.string(),
        isOverridden: z.boolean().optional(),
    }).optional().describe('User location context'),
});

const WorkflowOutputSchema = z.object({
    title: z.string(),
    summary: z.string(),
    keyFindings: z.array(z.string()),
    sources: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
    })),
});

// ============================================
// Step 1: Validate Input
// ============================================

const validateInputStep = createStep({
    id: 'validate-input',
    description: 'Validate and extract research parameters from form data',
    inputSchema: WorkflowInputSchema,
    outputSchema: z.object({
        isValid: z.boolean(),
        topic: z.string(),
        location: z.string(),
        criteria: z.record(z.any()),
        errors: z.array(z.string()).optional(),
    }),
    execute: async ({ inputData }) => {
        const errors: string[] = [];

        // Validate required fields
        if (!inputData.formData) {
            errors.push('Form data is required');
        }

        // Extract topic
        const topic = inputData.formData?.title
            || inputData.formData?.researchTopic
            || 'General Research';

        // Extract location context
        const location = inputData.location
            ? `${inputData.location.city}, ${inputData.location.country}`
            : 'Global';

        return {
            isValid: errors.length === 0,
            topic,
            location,
            criteria: inputData.formData || {},
            errors: errors.length > 0 ? errors : undefined,
        };
    },
});

// ============================================
// Step 2: Plan Research
// ============================================

const planResearchStep = createStep({
    id: 'plan-research',
    description: 'Create a research plan with search queries and key areas',
    inputSchema: z.object({
        isValid: z.boolean(),
        topic: z.string(),
        location: z.string(),
        criteria: z.record(z.any()),
        errors: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
        searchQueries: z.array(z.string()),
        keyAreas: z.array(z.string()),
        topic: z.string(),
        location: z.string(),
    }),
    execute: async ({ inputData }) => {
        // Generate search queries based on topic and location
        const searchQueries = [
            `${inputData.topic} overview`,
            `${inputData.topic} ${inputData.location} options`,
            `${inputData.topic} pricing comparison 2024`,
            `${inputData.topic} reviews and ratings`,
            `best ${inputData.topic} alternatives`,
        ];

        // Identify key areas to research
        const keyAreas = [
            'Overview & Features',
            'Pricing & Plans',
            'User Reviews',
            'Regional Availability',
            'Alternatives & Comparisons',
        ];

        return {
            searchQueries,
            keyAreas,
            topic: inputData.topic,
            location: inputData.location,
        };
    },
});

// ============================================
// Step 3: Execute Research (placeholder - actual agent call happens in API)
// ============================================

const executeResearchStep = createStep({
    id: 'execute-research',
    description: 'Execute the research plan using web search tools',
    inputSchema: z.object({
        searchQueries: z.array(z.string()),
        keyAreas: z.array(z.string()),
        topic: z.string(),
        location: z.string(),
    }),
    outputSchema: z.object({
        rawResults: z.array(z.object({
            query: z.string(),
            results: z.array(z.object({
                title: z.string(),
                url: z.string(),
                snippet: z.string(),
            })),
        })),
        topic: z.string(),
        location: z.string(),
    }),
    execute: async ({ inputData }) => {
        // In a full implementation, this would call the web search tool
        // For the workflow demo, we return placeholder structure
        // The actual search is done by the research agent in the API route

        return {
            rawResults: inputData.searchQueries.map(query => ({
                query,
                results: [], // Actual results filled by agent
            })),
            topic: inputData.topic,
            location: inputData.location,
        };
    },
});

// ============================================
// Step 4: Synthesize Results
// ============================================

const synthesizeResultsStep = createStep({
    id: 'synthesize-results',
    description: 'Compile research findings into a structured report',
    inputSchema: z.object({
        rawResults: z.array(z.object({
            query: z.string(),
            results: z.array(z.object({
                title: z.string(),
                url: z.string(),
                snippet: z.string(),
            })),
        })),
        topic: z.string(),
        location: z.string(),
    }),
    outputSchema: WorkflowOutputSchema,
    execute: async ({ inputData }) => {
        // Compile all sources
        const allSources = inputData.rawResults.flatMap(r => r.results);

        return {
            title: `Research Report: ${inputData.topic}`,
            summary: `Comprehensive research on ${inputData.topic} tailored for ${inputData.location}.`,
            keyFindings: [
                `Research conducted for: ${inputData.topic}`,
                `Location context: ${inputData.location}`,
                `${allSources.length} sources analyzed`,
            ],
            sources: allSources.slice(0, 10), // Top 10 sources
        };
    },
});

// ============================================
// Create the Workflow
// ============================================

export const researchWorkflow = createWorkflow({
    id: 'research-workflow',
    description: 'Orchestrates the research process from form input to final report',
    inputSchema: WorkflowInputSchema,
    outputSchema: WorkflowOutputSchema,
})
    .then(validateInputStep)
    .then(planResearchStep)
    .then(executeResearchStep)
    .then(synthesizeResultsStep)
    .commit();

export default researchWorkflow;

// Export individual steps for testing
export { validateInputStep, planResearchStep, executeResearchStep, synthesizeResultsStep };
