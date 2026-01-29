import { mastra } from '@/mastra';
import { handleChatStream } from '@mastra/ai-sdk';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set' }), { status: 500 });
    }

    const mastraStream = await handleChatStream({
      mastra,
      agentId: 'form-builder-agent',
      params: body,
      defaultOptions: { maxSteps: 5 },
      sendReasoning: false,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = mastraStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = value as any;

            // Robust text handling: check for 'delta' (Mastra) and 'textDelta' (AI SDK types)
            const textContent = chunk.delta || chunk.textDelta || chunk.content || chunk.text;

            // 1. Handle Text
            if ((chunk.type === 'text-delta' || chunk.type === 'text') && typeof textContent === 'string') {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(textContent)}\n`));
            }
            // Fallback for untyped text chunks if relevant
            else if (typeof textContent === 'string' &&
              chunk.type !== 'tool-call' &&
              chunk.type !== 'tool-result' &&
              chunk.type !== 'error') {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(textContent)}\n`));
            }

            // 2. Handle Tool Results (Form Generation)
            if (chunk.type === 'tool-result' && chunk.toolName === 'formGenerator') {
              const result = chunk.result;
              const formAction = { action: 'generate_form', form: result };
              const markdownBlock = `\n\n\`\`\`json\n${JSON.stringify(formAction, null, 2)}\n\`\`\`\n\n`;
              controller.enqueue(encoder.encode(`0:${JSON.stringify(markdownBlock)}\n`));
            }

            // 3. Handle Errors
            if (chunk.type === 'error') {
              const errorMsg = chunk.errorText || 'Unknown error occurred';
              controller.enqueue(encoder.encode(`0:${JSON.stringify(`\n\n**Error**: ${errorMsg}`)}\n`));
            }
          }
        } catch (err) {
          console.error('[Chat API] Stream error:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    });

  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
}
