
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dataSynthesisTool = createTool({
    id: 'data-synthesis',
    description: 'Synthesize research data from multiple sources into a summary',
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
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const prompt = `
            You are a research analyst. Synthesize the following information to answer the query: "${query}".
            
            Sources:
            ${sources.map((s: { url: string; content: string }, i: number) => `[${i + 1}] (${s.url}): ${s.content}`).join('\n\n')}
            
            Provide a concise summary and a list of key findings.
            Return ONLY a JSON object with this structure:
            {
                "summary": "comprehensive summary...",
                "keyFindings": ["finding 1", "finding 2"...],
                "sources": ["url1", "url2"...]
            }
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // simple cleanup to get JSON
            const jsonStr = text.replace(/```json\n?|\n?```/g, '');
            const data = JSON.parse(jsonStr);

            return {
                summary: data.summary,
                keyFindings: data.keyFindings,
                sources: data.sources || sources.map((s: { url: string }) => s.url),
            };
        } catch (error) {
            console.error('Data synthesis error:', error);
            throw error;
        }
    },
});
