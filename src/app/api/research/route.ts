
import { mastra } from '@/mastra';
import { streamText } from 'ai';

// Allow long running research tasks
export const maxDuration = 300;

export async function POST(req: Request) {
    console.log('========== RESEARCH API CALLED ==========');

    try {
        // Parse request body
        let body;
        try {
            const text = await req.text();
            console.log('[1] Request body received, length:', text.length);
            if (!text) {
                return new Response(JSON.stringify({ error: 'Empty request body' }), { status: 400 });
            }
            body = JSON.parse(text);
            console.log('[2] Request parsed successfully');
        } catch (e) {
            console.error('[ERROR] Failed to parse request body:', e);
            return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
        }

        const { formId, formData, location } = body;
        console.log('[3] Form ID:', formId);
        console.log('[4] Location:', location);

        // Get researcher agent
        console.log('[5] Getting researcher agent...');
        const researcher = mastra.getAgent('researcher');

        if (!researcher) {
            console.error('[ERROR] Research agent not found in mastra');
            throw new Error('Research agent not found');
        }
        console.log('[6] Researcher agent retrieved successfully');


        // Validate API keys
        console.log('[7] Checking API keys...');
        if (!process.env.OPENAI_API_KEY) {
            console.error('[ERROR] OPENAI_API_KEY not set');
            return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500 });
        }
        if (!process.env.TAVILY_API_KEY) {
            console.error('[ERROR] TAVILY_API_KEY not set');
            return new Response(JSON.stringify({ error: 'Missing TAVILY_API_KEY' }), { status: 500 });
        }
        console.log('[8] API keys validated');

        // Create stream
        console.log('[9] Creating ReadableStream...');
        const stream = new ReadableStream({
            async start(controller) {
                console.log('[10] Stream started');

                try {
                    // Send initial connection message
                    const initMsg = `\n[System: Research process started...]`;
                    controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(initMsg)}\n`));
                    console.log('[11] Init message sent to client');

                    // Build prompt
                    const userPrompt = `
                        Conduct research for the following request:
                        
                        Session Location Context: ${JSON.stringify(location)}
                        
                        Form Title: ${formData.title || 'Research Request'}
                        Form Data: ${JSON.stringify(formData)}
                        
                        Please execute the research plan, gather data, and provide the final JSON report.
                    `;
                    console.log('[12] User prompt built, length:', userPrompt.length);

                    // Call agent with timeout protection
                    console.log('[13] Calling researcher.stream()...');

                    // Create a timeout promise (2 minutes for complex research)
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        setTimeout(() => reject(new Error('Agent stream timeout after 120 seconds')), 120000);
                    });

                    let result;
                    try {
                        result = await Promise.race([
                            researcher.stream(userPrompt, {
                                maxSteps: 10, // Allow more steps for complete research cycle
                                onStepFinish: (step) => {
                                    // Check for report in tool results or content
                                    // This is critical if the agent doesn't stream the tool output as text deltas
                                    const anyStep = step as any;
                                    const toolName = anyStep.toolName || anyStep.payload?.toolName;

                                    if (anyStep.type === 'tool-result' && (toolName === 'dataSynthesis' || toolName === 'data-synthesis')) {
                                        // Extract text content from the step
                                        const content = anyStep.content || [];
                                        for (const item of content) {
                                            if (item.type === 'text' && item.text) {
                                                console.log('[Research API] Found report in step-finish, streaming to client...');
                                                // Send as a standard text chunk so client accumulates it
                                                controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(item.text)}\n`));
                                            }
                                        }
                                    }
                                }
                            }),
                            timeoutPromise
                        ]);
                        console.log('[14] Agent stream initialized successfully');
                    } catch (streamError) {
                        console.error('[ERROR] Agent stream failed:', streamError);
                        const errorMsg = `\n[System Error: ${streamError instanceof Error ? streamError.message : String(streamError)}]`;
                        controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(errorMsg)}\n`));
                        controller.close();
                        return;
                    }

                    // Process stream
                    console.log('[15] Starting to read from agent stream...');
                    let chunkCount = 0;

                    for await (const part of result.fullStream) {
                        chunkCount++;
                        if (chunkCount % 50 === 0) console.log(`[Research API] Processed ${chunkCount} chunks...`);

                        const chunk = part as any;
                        
                        if (chunk.type === 'text-delta') {
                            // Mastra v1.x with AI SDK v5+ uses chunk.payload.text
                            // AI SDK v4 (legacy) uses chunk.textDelta
                            const text = chunk.payload?.text || chunk.textDelta || '';
                            if (text && typeof text === 'string') {
                                controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(text)}\n`));
                            }
                        } else if (chunk.type === 'tool-call') {
                            // Mastra uses payload.toolName for tool name
                            const toolName = chunk.payload?.toolName || chunk.toolName || 'unknown tool';
                            const toolMsg = `\n[System: Using tool ${toolName}...]`;
                            controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(toolMsg)}\n`));
                        } else if (chunk.type === 'tool-result') {
                            // Send tool result notification
                            const toolName = chunk.payload?.toolName || chunk.toolName || 'tool';
                            const resultMsg = `\n[System: ${toolName} completed]`;
                            controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(resultMsg)}\n`));
                        } else if (chunk.type === 'error') {
                            const errorMsg = `\n[System Error: ${chunk.payload?.error || chunk.error || 'Unknown error'}]`;
                            controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(errorMsg)}\n`));
                            console.error('[CHUNK-ERROR]', chunk.payload || chunk.error);
                        } else if (chunk.type === 'step-finish') {
                            // Notify about step completion
                            const stepMsg = `\n[System: Step completed, proceeding...]`;
                            controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(stepMsg)}\n`));
                        }
                    }

                    console.log('[Research API] Stream completed');
                    controller.close();

                } catch (error) {
                    console.error('[ERROR] Stream processing error:', error);
                    console.error('[ERROR] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

                    // Try to notify client
                    try {
                        const errorMsg = `\n[System Error: ${error instanceof Error ? error.message : String(error)}]`;
                        controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(errorMsg)}\n`));
                    } catch (e) {
                        console.error('[ERROR] Could not send error to client:', e);
                    }
                    controller.close();
                }
            },
        });

        console.log('[18] Returning stream response');
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error('[FATAL ERROR] Top-level catch:', error);
        console.error('[FATAL ERROR] Stack:', error instanceof Error ? error.stack : 'No stack');
        return new Response(JSON.stringify({
            error: 'Research failed initialization',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
