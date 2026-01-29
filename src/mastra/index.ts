import { Mastra } from "@mastra/core";
import { formBuilderAgent } from "./agents/form-builder-agent";
import { researchAgent } from "./agents/research-agent";
import { researchWorkflow } from "./workflows/research-workflow";

/**
 * Mastra Configuration
 * 
 * Central configuration for all Mastra agents, tools, and workflows.
 * 
 * Architecture:
 * - Agents: formBuilder (interview), researcher (research execution)
 * - Workflows: researchWorkflow (orchestrates research steps)
 * - Tools: formGenerator, webSearch, dataSynthesis, locationContext
 * 
 * LLM Provider: OpenAI GPT-4o
 */

// Initialize Mastra with agents and workflows
export const mastra = new Mastra({
    agents: {
        formBuilder: formBuilderAgent,
        researcher: researchAgent,
    },
    workflows: {
        research: researchWorkflow,
    },
});

/**
 * Get the Form Builder Agent
 * Used for interviewing users about research needs
 */
export function getFormBuilderAgent() {
    return mastra.getAgent('formBuilder');
}

/**
 * Get the Research Agent
 * Used for conducting research with tools
 */
export function getResearchAgent() {
    return mastra.getAgent('researcher');
}

/**
 * Get the Research Workflow
 * Used for orchestrating multi-step research process
 */
export function getResearchWorkflow() {
    return mastra.getWorkflow('research');
}

export default mastra;
