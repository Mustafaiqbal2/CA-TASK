import { Mastra } from "@mastra/core";
import { formBuilderAgent } from "./agents/form-builder-agent";
import { researchAgent } from "./agents/research-agent";

/**
 * Mastra Configuration
 * 
 * This is the central configuration for all Mastra agents and tools.
 * We use Google Gemini as the LLM provider.
 */

// Initialize Mastra instance with registered agents
export const mastra = new Mastra({
    agents: {
        formBuilder: formBuilderAgent,
        researcher: researchAgent,
    },
});

/**
 * Get the Form Builder Agent
 */
export function getFormBuilderAgent() {
    return mastra.getAgent('formBuilder');
}

/**
 * Get the Research Agent
 */
export function getResearchAgent() {
    return mastra.getAgent('researcher');
}

export default mastra;
