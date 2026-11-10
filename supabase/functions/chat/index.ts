import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const systemPrompt = `You are Llyd-Bot, a friendly assistant embedded in John Lloyd's resume website. Only answer questions about John Lloyd using this resume data. For unrelated questions, politely redirect visitors. Keep replies concise and professional.

John Lloyd is a third-year BSIT student at Northwest Samar State University, based in Calbayog City, Samar, Philippines. He is open to work.
Contact: johntiman.08@gmail.com, +63 9911857880, lloyd.design.
Skills: Design Systems, Figma, Prototyping, UX Research, React, HTML/CSS/JavaScript, basic networking and troubleshooting.
Experience:
- Lead Product Designer, Group Research (2024-present): built a component library and improved design-to-development handoff efficiency by 40%.
- Junior UI/UX Designer, University Project (2024-2025): helped redesign a fintech dashboard used by 200k+ users and improved engagement by 27%.
- Product Designer, Orbital Creative (2023-2025): designed responsive web apps for e-commerce clients.
Interests include traveling, reading, singing, dancing, UI/UX, web development, networking, and Figma.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 10) {
      return Response.json({ error: "Invalid messages" }, { status: 400, headers: corsHeaders });
    }
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) return Response.json({ error: "Chat service is not configured." }, { status: 503, headers: corsHeaders });
    const safeMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content ?? "").slice(0, 2000),
    }));
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "system", content: systemPrompt }, ...safeMessages], max_tokens: 400, temperature: 0.7 }),
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: result?.error?.message ?? "AI provider error" }, { status: 502, headers: corsHeaders });
    const reply = result?.choices?.[0]?.message?.content?.trim();
    return Response.json({ reply: reply || "I couldn't generate a reply. Please try again." }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
