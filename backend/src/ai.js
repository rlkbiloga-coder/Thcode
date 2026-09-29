/* IA REAL no backend — chaves só no .env; providers OpenAI-compat */
const PROVIDERS = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', key: () => process.env.OPENAI_API_KEY },
  anthropic: { url: null, model: 'claude-3-5-sonnet-latest', key: () => process.env.ANTHROPIC_API_KEY },
  gemini: { url: null, model: 'gemini-1.5-flash', key: () => process.env.GEMINI_API_KEY },
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', key: () => process.env.GROQ_API_KEY },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free', key: () => process.env.OPENROUTER_API_KEY }
};

export function availableProviders() {
  return Object.entries(PROVIDERS).filter(([, p]) => !!p.key()).map(([name]) => name);
}

export async function aiChat({ provider = 'groq', messages, model, temperature = 0.7, max_tokens = 2048 }) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Provider desconhecido: ${provider}. Disponíveis: ${Object.keys(PROVIDERS).join(', ')}`);
  const key = p.key();
  if (!key) throw new Error(`Provider ${provider} sem API key no backend (.env)`);

  if (provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || p.model, max_tokens, temperature, system: messages.find(m => m.role === 'system')?.content, messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })) })
    });
    const t = await r.text();
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${t.slice(0, 200)}`);
    return { provider, content: JSON.parse(t).content[0].text };
  }
  if (provider === 'gemini') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || p.model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), systemInstruction: messages.find(m => m.role === 'system') ? { parts: [{ text: messages.find(m => m.role === 'system').content }] } : undefined })
    });
    const t = await r.text();
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${t.slice(0, 200)}`);
    return { provider, content: JSON.parse(t).candidates[0].content.parts[0].text };
  }
  /* OpenAI-compatível: openai, groq, openrouter */
  const r = await fetch(p.url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || p.model, messages, temperature, max_tokens })
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${provider} ${r.status}: ${t.slice(0, 200)}`);
  return { provider, content: JSON.parse(t).choices[0].message.content };
}
