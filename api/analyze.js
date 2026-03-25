const fetch = require("node-fetch");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const { imageBase64, mimeType, plantName, lang } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "API key tanımlı değil" });
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
Sen uzman bir botanikçisin.

SADECE geçerli JSON döndür. Başka hiçbir açıklama yazma.

Format:
{
  "plantName": "string",
  "disease": "string",
  "treatment": "string"
}

Eğer emin değilsen "Bilinmiyor" yaz.

Görseli analiz et ve sonucu ver.
`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    // DEBUG (istersen kaldırabilirsin)
    console.log("GEMINI RESPONSE:", JSON.stringify(data, null, 2));

    // 🔴 API hata kontrolü
    if (data.error) {
      return res.status(500).json({
        error: "Google API Hatası",
        detail: data.error.message,
      });
    }

    // 🔴 candidates kontrolü
    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({
        error: "Boş response (candidates yok)",
        full: data,
      });
    }

    const parts = data.candidates[0]?.content?.parts;

    if (!parts || parts.length === 0) {
      return res.status(500).json({
        error: "Content parts boş",
        full: data,
      });
    }

    // 🔴 text part bul
    const textPart = parts.find((p) => p.text);

    if (!textPart) {
      return res.status(500).json({
        error: "Text response yok",
        full: data,
      });
    }

    // 🔴 temizle
    const cleanText = textPart.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // 🔴 JSON parse güvenli
    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (err) {
      return res.status(500).json({
        error: "JSON parse hatası",
        raw: cleanText,
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({
      error: "Sistem hatası",
      message: err.message,
    });
  }
}
