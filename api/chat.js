/* global process */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Uses the environment variable from Vercel securely on the server
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured on the server' });
  }

  try {
    const { messages, context } = req.body;
    
    // Construct payload for Gemini API
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const payload = {
      systemInstruction: {
        parts: [{ text: `You are the StudySync AI Day Manager, a professional and encouraging productivity coach for a B.Tech AI & DS student.
Your goals:
1. Help the student plan their day effectively using their task list and stats.
2. Provide technical advice on Data Structures & Algorithms (DSA), GATE CS/DA syllabus, and tech interview prep.
3. Be concise, direct, and structure your responses with clean Markdown (use bold text for emphasis, bullet points, and code blocks for snippets).

Current User Context:
${context}` }]
      },
      contents: geminiMessages
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return res.status(response.status).json({ error: `Gemini API Error: ${errorText}` });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error', stack: error.stack });
  }
}
