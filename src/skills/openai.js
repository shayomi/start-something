import { installStep } from './utils.js';

const DATE = new Date().toISOString().split('T')[0];

export default {
  name: 'OpenAI',
  description: 'Set up OpenAI SDK with streaming chat, embeddings, image gen, and moderation helpers',
  category: 'AI / ML',
  supportedFrameworks: [],

  steps(context) {
    const { hasTypescript, packageManager, usesAppRouter } = context;
    const ext = hasTypescript ? 'ts' : 'js';
    const appDir = context.usesSrcDir ? 'src/app' : 'app';

    const openaiClient = hasTypescript
      ? `import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ─── Chat ─────────────────────────────────────────────────

export async function chat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
) {
  const response = await openai.chat.completions.create({
    model: options.model ?? 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
  });
  return response.choices[0].message.content;
}

// ─── Streaming chat ───────────────────────────────────────

export async function streamChat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { model?: string; temperature?: number } = {}
) {
  return openai.chat.completions.create({
    model: options.model ?? 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.7,
    stream: true,
  });
}

// ─── Embeddings ───────────────────────────────────────────

export async function embed(text: string | string[]): Promise<number[][]> {
  const input = Array.isArray(text) ? text : [text];
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input,
  });
  return response.data.map((d) => d.embedding);
}

export async function embedOne(text: string): Promise<number[]> {
  const [embedding] = await embed(text);
  return embedding;
}

// ─── Image generation ─────────────────────────────────────

export async function generateImage(
  prompt: string,
  options: { size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792'; quality?: 'standard' | 'hd' } = {}
) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: options.size ?? '1024x1024',
    quality: options.quality ?? 'standard',
  });
  return response.data[0].url;
}

// ─── Moderation ───────────────────────────────────────────

export async function moderate(input: string) {
  const response = await openai.moderations.create({ input });
  return response.results[0];
}

export async function isSafe(input: string): Promise<boolean> {
  const result = await moderate(input);
  return !result.flagged;
}
`
      : `import OpenAI from 'openai';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chat(messages, options = {}) {
  const response = await openai.chat.completions.create({
    model: options.model ?? 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
  });
  return response.choices[0].message.content;
}

export async function streamChat(messages, options = {}) {
  return openai.chat.completions.create({
    model: options.model ?? 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.7,
    stream: true,
  });
}

export async function embed(text) {
  const input = Array.isArray(text) ? text : [text];
  const response = await openai.embeddings.create({ model: 'text-embedding-3-small', input });
  return response.data.map((d) => d.embedding);
}

export async function embedOne(text) {
  const [embedding] = await embed(text);
  return embedding;
}

export async function generateImage(prompt, options = {}) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: options.size ?? '1024x1024',
    quality: options.quality ?? 'standard',
  });
  return response.data[0].url;
}

export async function isSafe(input) {
  const response = await openai.moderations.create({ input });
  return !response.results[0].flagged;
}
`;

    const streamRoute = usesAppRouter
      ? `import { streamChat } from '@/lib/openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await streamChat(messages);
  const textStream = OpenAIStream(stream);

  return new StreamingTextResponse(textStream);
}
`
      : `// Express streaming route example
// router.post('/api/chat', async (req, res) => {
//   const { messages } = req.body;
//   const stream = await streamChat(messages);
//   res.setHeader('Content-Type', 'text/plain');
//   for await (const chunk of stream) {
//     res.write(chunk.choices[0]?.delta?.content ?? '');
//   }
//   res.end();
// });
`;

    return [
      installStep(packageManager, ['openai', 'ai']),
      {
        type: 'write',
        label: `Write lib/openai.${ext}`,
        filePath: `lib/openai.${ext}`,
        content: openaiClient,
      },
      {
        type: 'write',
        label: usesAppRouter
          ? `Write ${appDir}/api/chat/route.${ext}`
          : `Write lib/openai-stream-example.${ext}`,
        filePath: usesAppRouter
          ? `${appDir}/api/chat/route.${ext}`
          : `lib/openai-stream-example.${ext}`,
        content: streamRoute,
      },
      {
        type: 'env',
        label: 'Add OpenAI env vars to .env.example',
        vars: {
          OPENAI_API_KEY: 'sk-your-openai-api-key',
          OPENAI_MODEL: 'gpt-4o-mini',
        },
      },
      {
        type: 'doc',
        label: 'Write docs/openai.md',
        content: docContent(DATE),
      },
    ];
  },

  nextSteps() {
    return [
      'Get your API key from https://platform.openai.com/api-keys',
      'Set OPENAI_API_KEY in .env',
      'Import { chat, streamChat, embedOne, generateImage } from "@/lib/openai"',
      'Use the Vercel AI SDK (already installed) for easy streaming in React',
      'Monitor usage and set spend limits at https://platform.openai.com/usage',
    ];
  },
};

function docContent(date) {
  return `# OpenAI Setup Guide
> Generated by ai-scaffold on ${date}

## What was set up
| Item | Detail |
|------|--------|
| Packages | \`openai\`, \`ai\` (Vercel AI SDK) |
| \`lib/openai.js\` | Chat, streaming, embeddings, image gen, moderation |
| \`app/api/chat/route.js\` | Streaming chat API route |

## Usage

### Chat completion
\`\`\`js
import { chat } from '@/lib/openai';

const reply = await chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is the capital of France?' },
]);
console.log(reply); // "The capital of France is Paris."
\`\`\`

### Streaming (React)
\`\`\`jsx
'use client';
import { useChat } from 'ai/react';

export function ChatUI() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}><b>{m.role}:</b> {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
\`\`\`

### Embeddings
\`\`\`js
import { embedOne } from '@/lib/openai';

const vector = await embedOne('Search query text');
// Returns: number[] of 1536 dimensions (text-embedding-3-small)
\`\`\`

### Image generation
\`\`\`js
import { generateImage } from '@/lib/openai';

const url = await generateImage('A futuristic city at sunset, digital art');
\`\`\`

### Content moderation
\`\`\`js
import { isSafe } from '@/lib/openai';

const safe = await isSafe(userMessage);
if (!safe) return Response.json({ error: 'Content not allowed' }, { status: 400 });
\`\`\`

## Resources
- [OpenAI Docs](https://platform.openai.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
`;
}
