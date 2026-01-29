
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const webSearchTool = createTool({
    id: 'web-search',
    description: 'Search the web for information using Tavily API',
    inputSchema: z.object({
        query: z.string().describe('The search query'),
        region: z.string().optional().describe('The region to bias search results towards'),
    }),
    outputSchema: z.object({
        results: z.array(z.object({
            title: z.string(),
            snippet: z.string(),
            url: z.string(),
        })),
    }),
    execute: async ({ query, region }) => {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            throw new Error('TAVILY_API_KEY is not set');
        }

        // Construct search parameters
        const body: Record<string, any> = {
            api_key: apiKey,
            query,
            search_depth: 'basic',
            include_answer: false,
            include_images: false,
            include_raw_content: false,
            max_results: 5,
        };

        // Note: Tavily API doesn't strictly support region param in the basic endpoint in the same way as Google,
        // but we can append it to the query or use search_depth 'advanced' features if needed.
        // For now, we'll append it to the query to guide the search engine.
        if (region) {
            body.query = `${query} related to ${region}`;
        }

        try {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Tavily API error: ${response.status} ${error}`);
            }

            const data = await response.json();

            return {
                results: data.results.map((result: any) => ({
                    title: result.title,
                    snippet: result.content,
                    url: result.url,
                })),
            };
        } catch (error) {
            console.error('Web search error:', error);
            throw error;
        }
    },
});
