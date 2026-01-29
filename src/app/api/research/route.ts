
import { mastra } from '@/mastra';
import { streamText } from 'ai';

// Allow long running research tasks
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { formId, formData, location } = await req.json();

        const researcher = mastra.getAgent('researcher');

        if (!researcher) {
            throw new Error('Research agent not found');
        }

        // specific instructions based on form data
        const userPrompt = `
        Conduct research for the following request:
        
        Session Location Context: ${JSON.stringify(location)}
        
        Form Title: ${formData.title || 'Research Request'}
        Form Data: ${JSON.stringify(formData)}
        
        Please execute the research plan, gather data, and provide the final JSON report.
    `;

        // Stream the response using AI SDK streamText which supports tool calling
        // Note: mastra agents wrap the AI SDK model. We can use researcher.stream() if available
        // or access the underlying model. Mastra agent.stream() is the standard way.

        // We want to stream the text and tool steps if possible.
        const result = await researcher.stream(userPrompt);

        // Manually create a stream response compatible with AI SDK Data Stream Protocol
        // Format: 0:"text content"\n
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.textStream) {
                        controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(chunk)}\n`));
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error('Research API Error:', error);
        return new Response(JSON.stringify({ error: 'Research failed' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
