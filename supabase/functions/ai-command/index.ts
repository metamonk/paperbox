/**
 * AI Command Edge Function
 * Handles AI-powered canvas commands with streaming responses
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { streamText } from 'npm:ai@5.0.76';
import { openai } from 'npm:@ai-sdk/openai@2.0.52';
import { getSystemPrompt } from './prompts.ts';
import { tools } from './tools.ts';

// CORS headers for client-side requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { prompt, context } = await req.json();

    if (!prompt || !context) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt or context' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[ai-command] Processing request:', {
      userId: user.id,
      canvasId: context.canvasId,
      prompt: prompt.substring(0, 100),
    });

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate system prompt with canvas context
    const systemPrompt = getSystemPrompt(context);

    console.log('[ai-command] Tools available:', Object.keys(tools));
    console.log('[ai-command] Tool definitions:', JSON.stringify(tools, null, 2));
    console.log('[ai-command] User prompt:', prompt);
    console.log('[ai-command] System prompt length:', systemPrompt.length);
    console.log('[ai-command] Starting streamText with GPT-4o-mini...');

    // Stream AI response with tool calling
    const result = await streamText({
      model: openai('gpt-4o-mini', { apiKey: openaiApiKey }),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      tools: tools,
      maxSteps: 5, // Allow multi-step tool execution
      toolChoice: 'auto', // Let AI decide when to use tools
    });

    console.log('[ai-command] streamText initialized successfully');

    // Create SSE stream for client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[ai-command] Starting to stream from OpenAI...');
          
          // Use fullStream to get both text deltas and tool calls as they arrive
          for await (const part of result.fullStream) {
            console.log('[ai-command] Stream part type:', part.type);
            
            switch (part.type) {
              case 'text-delta':
                // Stream text as it arrives
                const textChunk = {
                  type: 'text',
                  content: part.textDelta,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(textChunk)}\n\n`)
                );
                break;
              
              case 'tool-call':
                // Stream tool call when it arrives
                console.log('[ai-command] Tool call received:', part.toolName);
                // SDK version 5.0.76 uses 'args' property for tool arguments
                const toolArguments = (part as any).args || (part as any).input;
                console.log('[ai-command] Tool call parameters:', JSON.stringify(toolArguments, null, 2));
                const toolChunk = {
                  type: 'tool-call',
                  toolCall: {
                    toolName: part.toolName,
                    parameters: toolArguments,
                  },
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(toolChunk)}\n\n`)
                );
                break;
              
              case 'finish':
                console.log('[ai-command] Stream finished:', part.finishReason);
                break;
            }
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[ai-command] Streaming error:', error);
          console.error('[ai-command] Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            type: typeof error,
            stringified: JSON.stringify(error, null, 2),
          });
          const errorChunk = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[ai-command] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

