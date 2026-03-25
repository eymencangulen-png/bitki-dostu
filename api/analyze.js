export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const apiKey = process.env.GEMINI_API_KEY;
  const { imageBase64, mimeType } = req.body;

  // En kararlı Google API bağlantısı
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: "Bitkiyi teşhis et ve şu formatta yanıtla: {\"plantName\": \"...\", \"disease\": \"...\", \"treatment\": \"...\"}" }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const resultText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(resultText));
  } catch (err) {
    return res.status(500).json({ error: "Sunucu hatası: " + err.message });
  }
}
