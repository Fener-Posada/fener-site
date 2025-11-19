// api/agent.js
export default async function handler(req, res) {
  // Solo aceptamos POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  // message = texto del usuario
  // history (opcional) = array con mensajes anteriores
  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing 'message' in body" });
  }

  // --------- LIMITE POR LONGITUD (para cuidar créditos) ----------
  const trimmed = message.trim();
  const charCount = trimmed.length;
  const wordCount = trimmed.split(/\s+/).length;

  const MAX_CHARS = 350;  // puedes ajustar estos valores
  const MAX_WORDS = 80;

  if (charCount > MAX_CHARS || wordCount > MAX_WORDS) {
    const softReply =
      "Veo que tu consulta es bastante completa y detallada 😊. " +
      "Prefiero revisarla contigo en una llamada para darte una respuesta seria. " +
      "Escríbeme por LinkedIn o correo y agendamos algo.";

    return res.status(200).json({ reply: softReply });
  }
  // ---------------------------------------------------------------

  try {
    // Construimos el contexto: sistema + un poco de historial + mensaje actual
    const messages = [
      {
        role: "system",
        content: `
You are the AI agent embedded in the personal website of Fener Posada.
Fener is an Analytics Engineer from Colombia (GMT-5) with 4+ years in analytics & BI,
100+ cross-functional data projects (sales, finance, marketing, logistics, accounting),
and strong skills in Power BI, Fabric, SQL, Python, and n8n/AI agents.

Your job is to:
- Answer questions about Fener's profile, experience and projects.
- Explain what kind of dashboards and automations he builds.
- Suggest how he could help the user's team with data/analytics/automation.
- Keep answers concise, friendly and professional.
- When relevant, encourage contacting him through the contact section / LinkedIn / email.

If the user asks general questions not related to Fener or data/analytics,
briefly answer but then gently bring the conversation back to Fener's work.
        `.trim()
      },
      // En el futuro podemos pegar aquí parte del historial:
      // ...history.slice(-6),
      {
        role: "user",
        content: message
      }
    ];

    // Llamada a la API de OpenAI usando fetch
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // modelo económico de chat
        messages,
        max_tokens: 250,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return res
        .status(500)
        .json({ error: "OpenAI API error", details: errorText });
    }

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content ??
      "Sorry, I couldn't generate a reply right now.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Agent error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}