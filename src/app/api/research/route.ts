
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
        const researchDepth = formData?.researchDepth || 'standard';
        const isFollowUp = researchDepth === 'followup';
        const followUpQuery = formData?.followUpQuery || '';
        const originalContext = formData?.originalContext || '';
        
        console.log('[3] Form ID:', formId);
        console.log('[4] Location:', location);
        console.log('[4.1] Research Depth:', researchDepth);
        if (isFollowUp) console.log('[4.2] Follow-up Query:', followUpQuery);

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

                    // Build prompt with explicit user requirements
                    // Parse form data to extract key criteria
                    const requirements: string[] = [];
                    for (const [key, value] of Object.entries(formData)) {
                        if (value && key !== 'title' && key !== 'description' && key !== 'researchDepth') {
                            // Format the field name nicely
                            const fieldName = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                            if (Array.isArray(value)) {
                                requirements.push(`- ${fieldName}: ${value.join(', ')}`);
                            } else if (typeof value === 'boolean') {
                                requirements.push(`- ${fieldName}: ${value ? 'Yes' : 'No'}`);
                            } else {
                                requirements.push(`- ${fieldName}: ${value}`);
                            }
                        }
                    }

                    // Determine maxSteps and timeout based on research depth
                    const isDeepResearch = researchDepth === 'deep';
                    const maxSteps = isFollowUp ? 5 : (isDeepResearch ? 25 : 15);
                    const timeoutMs = isFollowUp ? 45000 : (isDeepResearch ? 300000 : 150000); // 45s for follow-up, 5 min for deep, 2.5 min for standard
                    
                    // Build prompt based on mode
                    let userPrompt: string;
                    
                    if (isFollowUp) {
                        // Follow-up mode: Quick, targeted research - MINIMAL searches
                        userPrompt = `
## Quick Follow-up Question

**Context from previous research**: 
${originalContext}

**User Question**: ${followUpQuery}

## IMPORTANT: This is a FAST follow-up
- Answer using the existing context FIRST before searching
- Only do 1-2 searches if the answer isn't in the context
- Be concise but ALWAYS provide a substantive answer
- If you genuinely can't find information, explain what you know and what's missing

## Output Format (JSON)
{
  "title": "Follow-up: [brief topic]",
  "summary": "A DIRECT, SUBSTANTIVE answer to the question (2-4 paragraphs with specific data/numbers if available). NEVER say 'I couldn't find' without providing what you DO know.",
  "keyFindings": ["Specific finding 1 with data", "Specific finding 2 with data", "Specific finding 3 if available"],
  "sources": [{"title": "Source Name", "url": "https://actual-url.com", "snippet": "Relevant quote"}]
}

## CRITICAL RULES
- ALWAYS provide a real answer - don't just say "rephrase your question"
- If the exact data isn't available, provide related data or estimates
- Include numbers, percentages, or specific facts when possible
- If the context has the answer, use it directly
- If you need to search, search for specific statistics or data

Answer the question now:`;
                    } else {
                        // Standard/Deep mode
                        userPrompt = `
## Research Request

**Topic**: ${formData.title || formData.researchTopic || 'General Research'}

**RESEARCH_DEPTH**: ${researchDepth.toUpperCase()}
${isDeepResearch ? '(Execute COMPREHENSIVE research with risk assessment - 20-25 tool calls, explore thoroughly)' : '(Execute THOROUGH research - 12-15 tool calls, cover all angles)'}

**User Location**: ${location?.city || 'Unknown'}, ${location?.country || 'Global'} (use this for regional context, pricing, and availability)

## CRITICAL USER REQUIREMENTS
The user has specified the following criteria that MUST be addressed in your research:

${requirements.length > 0 ? requirements.join('\n') : 'No specific requirements provided'}

## Your Task
1. **PRIORITIZE** finding options/products/services that MATCH the user's specific requirements listed above
2. Search for solutions that explicitly satisfy each criterion
3. Compare options based on HOW WELL they meet the stated requirements
4. In your recommendations, explain WHY each suggestion fits the user's criteria
5. If a popular option does NOT meet the user's requirements, mention it but clearly state why it doesn't fit
6. Include DETAILED pricing information with tiers and hidden costs
7. Research user reviews, Reddit discussions, and real-world experiences
${isDeepResearch ? '8. **DEEP MODE**: Include risk assessment - search for problems, complaints, and failure stories for top candidates\n9. **DEEP MODE**: Search for "problems with [product]", "why I switched from [product]" for each recommendation' : ''}

## Important
- Do NOT provide a generic overview of the topic
- DO find and compare specific options that match the user's stated needs
- EACH recommendation should reference back to the user's requirements
- Include pricing that is relevant to the user's location (${location?.country || 'their region'})
- Include a COMPREHENSIVE comparison matrix with scores on multiple criteria
- Include implementation steps and considerations
${isDeepResearch ? '- Include "riskAssessment" section in your output with potential issues found' : ''}

Form Data (raw): ${JSON.stringify(formData)}

Execute the ${researchDepth.toUpperCase()} research plan. Be THOROUGH - the user is counting on comprehensive research. Provide the final JSON report.
                        `;
                    }
                    console.log('[12] User prompt built, length:', userPrompt.length);

                    // Call agent with timeout protection
                    console.log('[13] Calling researcher.stream()...');
                    console.log('[13.1] Max steps:', maxSteps, 'Timeout:', timeoutMs / 1000, 'seconds');

                    // Create a timeout promise based on depth
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        setTimeout(() => reject(new Error(`Agent stream timeout after ${timeoutMs / 1000} seconds`)), timeoutMs);
                    });

                    let result;
                    try {
                        result = await Promise.race([
                            researcher.stream(userPrompt, {
                                maxSteps: maxSteps,
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
                    let streamClosed = false;
                    
                    const safeClose = () => {
                        if (!streamClosed) {
                            streamClosed = true;
                            try {
                                controller.close();
                            } catch (e) {
                                // Already closed
                            }
                        }
                    };

                    for await (const part of result.fullStream) {
                        if (streamClosed) break;
                        
                        chunkCount++;
                        if (chunkCount % 50 === 0) console.log(`[Research API] Processed ${chunkCount} chunks...`);

                        const chunk = part as any;
                        
                        if (chunk.type === 'text-delta') {
                            // Mastra v1.x with AI SDK v5+ uses chunk.payload.text
                            // AI SDK v4 (legacy) uses chunk.textDelta
                            const text = chunk.payload?.text || chunk.textDelta || '';
                            if (text && typeof text === 'string') {
                                try {
                                    controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(text)}\n`));
                                } catch (e) {
                                    // Controller closed (client aborted)
                                    console.log('[Research API] Client disconnected, stopping stream');
                                    streamClosed = true;
                                    break;
                                }
                            }
                        } else if (chunk.type === 'tool-call') {
                            // Mastra uses payload.toolName for tool name
                            const toolName = chunk.payload?.toolName || chunk.toolName || 'unknown tool';
                            const toolMsg = `\n[System: Using tool ${toolName}...]`;
                            try {
                                controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(toolMsg)}\n`));
                            } catch (e) {
                                console.log('[Research API] Client disconnected');
                                streamClosed = true;
                                break;
                            }
                        } else if (chunk.type === 'tool-result') {
                            // Send tool result notification
                            const toolName = chunk.payload?.toolName || chunk.toolName || 'tool';
                            const resultMsg = `\n[System: ${toolName} completed]`;
                            try {
                                controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(resultMsg)}\n`));
                            } catch (e) {
                                console.log('[Research API] Client disconnected');
                                streamClosed = true;
                                break;
                            }
                        } else if (chunk.type === 'error') {
                            const errorMsg = `\n[System Error: ${chunk.payload?.error || chunk.error || 'Unknown error'}]`;
                            try {
                                controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(errorMsg)}\n`));
                            } catch (e) {
                                console.log('[Research API] Client disconnected');
                                streamClosed = true;
                                break;
                            }
                            console.error('[CHUNK-ERROR]', chunk.payload || chunk.error);
                        } else if (chunk.type === 'step-finish') {
                            // Notify about step completion
                            const stepMsg = `\n[System: Step completed, proceeding...]`;
                            try {
                                controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(stepMsg)}\n`));
                            } catch (e) {
                                console.log('[Research API] Client disconnected');
                                streamClosed = true;
                                break;
                            }
                        }
                    }

                    console.log('[Research API] Stream completed');
                    safeClose();

                } catch (error) {
                    console.error('[ERROR] Stream processing error:', error);
                    console.error('[ERROR] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

                    // Try to notify client (may fail if already closed)
                    try {
                        const errorMsg = `\n[System Error: ${error instanceof Error ? error.message : String(error)}]`;
                        controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(errorMsg)}\n`));
                        controller.close();
                    } catch (e) {
                        // Controller already closed, ignore
                    }
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
