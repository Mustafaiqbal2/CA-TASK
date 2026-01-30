
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import OpenAI from 'openai';

/**
 * Data Synthesis Tool
 * 
 * Uses OpenAI GPT-4o-mini to synthesize research data from multiple sources
 * into a structured summary with key findings.
 */
export const dataSynthesisTool = createTool({
    id: 'data-synthesis',
    description: 'Synthesize research data from multiple sources into a structured summary with key findings',
    inputSchema: z.object({
        sources: z.array(z.object({
            content: z.string(),
            url: z.string(),
        })).describe('List of source content and URLs to synthesize'),
        query: z.string().describe('The original research query or topic to focus on'),
    }),
    outputSchema: z.object({
        summary: z.string(),
        keyFindings: z.array(z.string()),
        sources: z.array(z.string()),
    }),
    execute: async ({ sources, query }) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set');
        }

        const openai = new OpenAI({ apiKey });

        const prompt = `You are a research analyst. Synthesize the following information to answer the query: "${query}".
            
Sources:
${sources.map((s: { url: string; content: string }, i: number) => `[${i + 1}] (${s.url}): ${s.content}`).join('\n\n')}

Provide a concise summary and a list of key findings.
Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
    "summary": "comprehensive summary...",
    "keyFindings": ["finding 1", "finding 2"...],
    "sources": ["url1", "url2"...]
}`;

        try {
            const result = await openai.chat.completions.create({
                model: 'gpt-4.1',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
            });

            const text = result.choices[0]?.message?.content || '{}';
            const data = JSON.parse(text);

            return {
                summary: data.summary || 'No summary available',
                keyFindings: data.keyFindings || [],
                sources: data.sources || sources.map((s: { url: string }) => s.url),
            };
        } catch (error) {
            console.error('Data synthesis error:', error);
            throw error;
        }
    },
});

export default dataSynthesisTool;
