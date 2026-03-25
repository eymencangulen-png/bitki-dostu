export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: "Vercel'de GEMINI_API_KEY eksik!" });
  }

  const { imageBase64, mimeType } = req.body;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: "Bitkiyi teşhis et ve şu JSON formatında cevap ver: {\"plantName\": \"...\", \"disease\": \"...\", \"treatment\": \"...\"}" }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const cleanText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(cleanText));
  } catch (err) {
    return res.status(500).json({ error: "Sistem hatası: " + err.message });
  }
}
