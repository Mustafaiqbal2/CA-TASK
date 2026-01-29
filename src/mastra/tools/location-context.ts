
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const locationContextTool = createTool({
    id: 'location-context',
    description: 'Get location context from IP address',
    inputSchema: z.object({
        ip: z.string().optional().describe('User IP address (optional, will try to detect if not provided)'),
    }),
    outputSchema: z.object({
        country: z.string(),
        region: z.string(),
        city: z.string(),
        timezone: z.string(),
    }),
    execute: async ({ ip }) => {
        // Use ipapi.co (free tier, no key required for limited usage)
        // If IP is not provided or is localhost, we might default or fail gracefully
        let queryIp = ip;
        if (!queryIp || queryIp === '::1' || queryIp === '127.0.0.1') {
            // If localhost, stick to a default or public IP check
            // For this task, we'll try to fetch own public IP if none provided
            queryIp = '';
        }

        try {
            const url = queryIp ? `https://ipapi.co/${queryIp}/json/` : 'https://ipapi.co/json/';
            const response = await fetch(url);

            if (!response.ok) {
                // Fallback for dev/rate limits
                return {
                    country: 'Unknown',
                    region: 'Unknown',
                    city: 'Unknown',
                    timezone: 'UTC'
                };
            }

            const data = await response.json();

            return {
                country: data.country_name || 'Unknown',
                region: data.region || 'Unknown',
                city: data.city || 'Unknown',
                timezone: data.timezone || 'UTC',
            };
        } catch (error) {
            console.error('Location lookup error:', error);
            return {
                country: 'Unknown',
                region: 'Unknown',
                city: 'Unknown',
                timezone: 'UTC'
            };
        }
    },
});
