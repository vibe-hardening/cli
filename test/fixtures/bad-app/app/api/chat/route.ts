import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEfGhIjKl0123',
});

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  return Response.json(r);
}
