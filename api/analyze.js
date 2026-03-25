export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  const { imageBase64, mimeType } = req.body;

  // Google'ın en güncel ve kararlı (v1) bağlantı yolu
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: "Bu bitkiyi teşhis et. Yanıtı sadece şu JSON formatında ver: {\"plantName\": \"...\", \"disease\": \"...\", \"treatment\": \"...\"}" }
          ]
        }]
      })
    });

    const data = await response.json();
    
    // Hata ayıklama: Google'dan gelen hata mesajını doğrudan göster
    if (data.error) {
      return res.status(500).json({ error: "Google Hatası: " + data.error.message });
    }

    const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    return res.status(500).json({ error: "Sistem Hatası: " + err.message });
  }
}
