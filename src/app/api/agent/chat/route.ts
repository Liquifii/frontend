/**
 * POST /api/agent/chat
 * Body: { message: string, wallet_address?: string, conversation_id?: string }
 * Returns: { reply: string, transactionRequest?: { action: 'deposit' | 'withdraw', amount_usdm: number } }
 *
 * Supports multiple providers via env (CHAT_PROVIDER=groq|openai|gemini|anthropic):
 * - GROQ_API_KEY → Groq (free tier, llama-3.3-70b-versatile)
 * - OPENAI_API_KEY → OpenAI
 * - GEMINI_API_KEY → Google Gemini
 * - ANTHROPIC_API_KEY → Claude
 */

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import { GoogleGenAI } from '@google/genai'
import { agentTools, AGENT_SYSTEM_PROMPT, getOpenAITools, getGeminiTools } from '../../../../lib/agent/tools'
import {
  executeReadTool,
  isWriteTool,
  buildTransactionIntent,
} from '../../../../lib/agent/execute-tools'
import { checkRateLimit, pruneRateLimitStore } from '../../../../lib/agent/rate-limit'
import {
  getConversationHistory,
  appendToConversation,
} from '../../../../lib/agent/state'

/** Simple cache for read results (optional, reduces RPC/Graph load) */
const readCache = new Map<string, { data: string; expires: number }>()
const CACHE_TTL_MS = 15 * 1000 // 15 seconds

function getCachedRead(key: string): string | null {
  const entry = readCache.get(key)
  if (!entry || Date.now() > entry.expires) return null
  return entry.data
}

function setCachedRead(key: string, data: string): void {
  readCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
}

function getProvider(): 'openai' | 'anthropic' | 'gemini' | 'groq' {
  const force = process.env.CHAT_PROVIDER?.toLowerCase()
  if (force === 'groq' && process.env.GROQ_API_KEY) return 'groq'
  if (force === 'openai' && process.env.OPENAI_API_KEY) return 'openai'
  if (force === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (force === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)) return 'gemini'
  const groqKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim()
  const openaiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()
  const anthropicKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()
  if (groqKey) return 'groq'
  if (geminiKey) return 'gemini'
  if (openaiKey) return 'openai'
  if (anthropicKey) return 'anthropic'
  return 'anthropic'
}

export async function POST(request: Request) {
  try {
    const provider = getProvider()
    const hasGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()
    const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()
    const hasAnthropic = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()
    const hasGemini = ((process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) ?? '').trim().length > 0
    if (provider === 'groq' && !hasGroq) {
      return NextResponse.json(
        { error: 'Agent not configured. Set GROQ_API_KEY in .env (from console.groq.com, free tier). Restart the dev server after changing .env.' },
        { status: 503 }
      )
    }
    if (provider === 'openai' && !hasOpenAI) {
      return NextResponse.json(
        { error: 'Agent not configured. Set OPENAI_API_KEY in .env (or CHAT_PROVIDER=openai and add the key). Restart the dev server after changing .env.' },
        { status: 503 }
      )
    }
    if (provider === 'anthropic' && !hasAnthropic) {
      return NextResponse.json(
        { error: 'Agent not configured. Set ANTHROPIC_API_KEY in .env. Restart the dev server after changing .env.' },
        { status: 503 }
      )
    }
    if (provider === 'gemini' && !hasGemini) {
      return NextResponse.json(
        { error: 'Agent not configured. Set GEMINI_API_KEY in .env (from Google AI Studio, free tier). Restart the dev server after changing .env.' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const walletAddress = typeof body.wallet_address === 'string' ? body.wallet_address.trim() : ''
    const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : null

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const rateLimitId = walletAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anon'
    const rate = checkRateLimit(rateLimitId)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfterMs: rate.retryAfterMs },
        { status: 429, headers: rate.retryAfterMs ? { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } : undefined }
      )
    }

    pruneRateLimitStore()

    const history = getConversationHistory(conversationId)
    let transactionRequest: { action: 'deposit' | 'withdraw'; amount_usdm: number } | null = null
    let lastText = ''

    // (Reverted: no pre-parse; let the provider tools determine intents)

    const systemPrompt = walletAddress
      ? `${AGENT_SYSTEM_PROMPT}\n\nThe connected user's wallet address is: ${walletAddress}. Use this address when calling get_vault_balance, get_wallet_balance, get_transaction_history, or get_total_earnings.`
      : AGENT_SYSTEM_PROMPT

    if (provider === 'gemini') {
      const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim()
      const ai = new GoogleGenAI({ apiKey })
      const geminiTools = getGeminiTools()

      type GeminiContent = { role: 'user' | 'model'; parts: Array<{ text?: string; functionCall?: { name?: string; args?: Record<string, unknown>; id?: string }; functionResponse?: { name?: string; id?: string; response?: Record<string, unknown> } }> }
      const contents: GeminiContent[] = [
        ...history.map((m) => ({
          role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
          parts: [{ text: m.content }],
        })),
        { role: 'user' as const, parts: [{ text: message }] },
      ]

      const maxToolRounds = 5
      for (let round = 0; round < maxToolRounds; round++) {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.0-flash',
          contents,
          config: {
            systemInstruction: systemPrompt,
            tools: geminiTools.length ? [{ functionDeclarations: geminiTools }] : undefined,
            maxOutputTokens: 1024,
          },
        })

        const text = response.text ?? ''
        if (text) lastText = text

        const functionCalls = response.functionCalls
        if (!functionCalls?.length) break

        const modelParts: GeminiContent['parts'] = text ? [{ text }] : []
        for (const fc of functionCalls) {
          modelParts.push({
            functionCall: {
              id: fc.id,
              name: fc.name,
              args: fc.args ?? {},
            },
          })
        }
        contents.push({ role: 'model', parts: modelParts })

        const responseParts: GeminiContent['parts'] = []
        for (const fc of functionCalls) {
          const name = fc.name ?? ''
          const args = (fc.args ?? {}) as Record<string, unknown>
          let result: string
          if (isWriteTool(name)) {
            const intent = buildTransactionIntent(name, args)
            if (intent) {
              transactionRequest = intent
              result = JSON.stringify({ status: 'transaction_sent_to_user_for_approval', action: intent.action, amount_usdm: intent.amount_usdm })
            } else {
              result = JSON.stringify({ error: 'Invalid amount' })
            }
          } else {
            const cacheKey = `${name}:${JSON.stringify(args)}`
            let cached = getCachedRead(cacheKey)
            if (cached === null) {
              cached = await executeReadTool(name, args)
              setCachedRead(cacheKey, cached)
            }
            result = cached
          }
          responseParts.push({
            functionResponse: {
              id: fc.id,
              name,
              response: { output: result },
            },
          })
        }
        contents.push({ role: 'user', parts: responseParts })
      }
    } else if (provider === 'groq') {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
      const openaiTools = getOpenAITools()

      type GroqMessage = 
        | { role: 'system'; content: string }
        | { role: 'user'; content: string }
        | { role: 'assistant'; content: string | null; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> }
        | { role: 'tool'; tool_call_id: string; content: string }
      
      const messages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }) as GroqMessage),
        { role: 'user', content: message },
      ]

      const maxToolRounds = 5
      for (let round = 0; round < maxToolRounds; round++) {
        const response = await groq.chat.completions.create({
          model: process.env.GROQ_CHAT_MODEL ?? 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          temperature: 0.2,
          messages: messages as any,
          tools: openaiTools.length ? openaiTools : undefined,
        })

        const choice = response.choices?.[0]
        if (!choice) break

        const msg = choice.message
        if (msg.content) {
          if (typeof msg.content === 'string') {
            lastText = msg.content
          } else if (Array.isArray(msg.content)) {
            const contentArray = msg.content as Array<{ type?: string; text?: string }>
            lastText = contentArray.map((c) => (c.type === 'text' ? c.text || '' : '')).join('')
          }
        }

        const toolCalls = msg.tool_calls
        if (!toolCalls?.length) break

        const toolResults: GroqMessage[] = []
        for (const tc of toolCalls) {
          const name = tc.function?.name ?? ''
          const args = (() => {
            try {
              return JSON.parse(tc.function?.arguments ?? '{}') as Record<string, unknown>
            } catch {
              return {}
            }
          })()

          if (isWriteTool(name)) {
            const intent = buildTransactionIntent(name, args)
            if (intent) {
              transactionRequest = intent
              toolResults.push({
                role: 'tool',
                tool_call_id: tc.id!,
                content: JSON.stringify({ status: 'transaction_sent_to_user_for_approval', action: intent.action, amount_usdm: intent.amount_usdm }),
              })
            } else {
              toolResults.push({ role: 'tool', tool_call_id: tc.id!, content: JSON.stringify({ error: 'Invalid amount' }) })
            }
          } else {
            const cacheKey = `${name}:${JSON.stringify(args)}`
            let result = getCachedRead(cacheKey)
            if (result === null) {
              result = await executeReadTool(name, args)
              setCachedRead(cacheKey, result)
            }
            toolResults.push({ role: 'tool', tool_call_id: tc.id!, content: result })
          }
        }

        messages.push({
          role: 'assistant',
          content: msg.content ?? null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id!,
            type: 'function' as const,
            function: { name: tc.function?.name ?? '', arguments: tc.function?.arguments ?? '{}' },
          })),
        })
        messages.push(...toolResults)
      }
    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const openaiTools = getOpenAITools()

      type OpenAIMessage = OpenAI.Chat.ChatCompletionMessageParam
      const messages: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }) as OpenAIMessage),
        { role: 'user', content: message },
      ]

      const maxToolRounds = 5
      for (let round = 0; round < maxToolRounds; round++) {
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
          max_tokens: 1024,
          messages,
          tools: openaiTools.length ? openaiTools : undefined,
        })

        const choice = response.choices?.[0]
        if (!choice) break

        const msg = choice.message
        if (msg.content) {
          if (typeof msg.content === 'string') {
            lastText = msg.content
          } else if (Array.isArray(msg.content)) {
            const contentArray = msg.content as Array<{ type?: string; text?: string }>
            lastText = contentArray.map((c) => (c.type === 'text' ? c.text || '' : '')).join('')
          }
        }

        const toolCalls = msg.tool_calls
        if (!toolCalls?.length) break

        const toolResults: OpenAIMessage[] = []
        for (const tc of toolCalls) {
          const functionCall = 'function' in tc ? tc.function : null
          const name = functionCall?.name ?? ''
          const args = (() => {
            try {
              return JSON.parse(functionCall?.arguments ?? '{}') as Record<string, unknown>
            } catch {
              return {}
            }
          })()

          if (isWriteTool(name)) {
            const intent = buildTransactionIntent(name, args)
            if (intent) {
              transactionRequest = intent
              toolResults.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify({ status: 'transaction_sent_to_user_for_approval', action: intent.action, amount_usdm: intent.amount_usdm }),
              })
            } else {
              toolResults.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: 'Invalid amount' }) })
            }
          } else {
            const cacheKey = `${name}:${JSON.stringify(args)}`
            let result = getCachedRead(cacheKey)
            if (result === null) {
              result = await executeReadTool(name, args)
              setCachedRead(cacheKey, result)
            }
            toolResults.push({ role: 'tool', tool_call_id: tc.id, content: result })
          }
        }

        messages.push({
          role: 'assistant',
          content: msg.content ?? null,
          tool_calls: toolCalls.map((tc) => {
            const functionCall = 'function' in tc ? tc.function : null
            return {
              id: tc.id,
              type: 'function' as const,
              function: { name: functionCall?.name ?? '', arguments: functionCall?.arguments ?? '{}' },
            }
          }),
        })
        messages.push(...toolResults)
      }
    } else {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      type MessageParam = { role: 'user' | 'assistant'; content: string | Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> }
      const messages: MessageParam[] = history.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      messages.push({ role: 'user', content: message })

      const maxToolRounds = 5
      for (let round = 0; round < maxToolRounds; round++) {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          tools: agentTools,
          messages,
        })

        const content = response.content ?? []
        const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = []

        for (const block of content) {
          if (block.type === 'text') {
            lastText = block.text
          }
          if (block.type === 'tool_use') {
            toolUseBlocks.push({
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            })
          }
        }

        if (response.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
          break
        }

        if (toolUseBlocks.length === 0) {
          break
        }

        const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = []

        for (const tool of toolUseBlocks) {
          if (isWriteTool(tool.name)) {
            const intent = buildTransactionIntent(tool.name, tool.input)
            if (intent) {
              transactionRequest = intent
              toolResults.push({
                type: 'tool_result',
                tool_use_id: tool.id,
                content: JSON.stringify({ status: 'transaction_sent_to_user_for_approval', action: intent.action, amount_usdm: intent.amount_usdm }),
              })
            } else {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: tool.id,
                content: JSON.stringify({ error: 'Invalid amount' }),
              })
            }
          } else {
            const cacheKey = `${tool.name}:${JSON.stringify(tool.input)}`
            let result = getCachedRead(cacheKey)
            if (result === null) {
              result = await executeReadTool(tool.name, tool.input)
              setCachedRead(cacheKey, result)
            }
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tool.id,
              content: result,
            })
          }
        }

        messages.push({
          role: 'assistant',
          content: content as Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>,
        })
        messages.push({
          role: 'user',
          content: toolResults,
        } as unknown as MessageParam)
      }
    }

    const reply = lastText || 'I couldn\'t generate a response. Please try again.'

    if (conversationId) {
      appendToConversation(conversationId, { role: 'user', content: message })
      appendToConversation(conversationId, {
        role: 'assistant',
        content: reply,
        transactionRequest: transactionRequest ?? undefined,
      })
    }

    return NextResponse.json({
      reply,
      ...(transactionRequest && { transactionRequest }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Agent request failed', details: message },
      { status: 500 }
    )
  }
}
