const fetch = require("node-fetch");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const { imageBase64, mimeType, plantName, lang } = req.body;

  // KRİTİK NOKTA: Güncel URL ve Model Yapısı
  // Sürümü 'v1' yapıyoruz ve modeli 'gemini-1.5-flash' olarak çağırıyoruz
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Sen uzman bir botanikçisin. Fotoğrafı analiz et ve bitki adını, varsa hastalığını ve tedavi yöntemlerini Türkçe olarak açıkla. 
  Yanıtı sadece şu JSON formatında ver: {"plantName": "...", "disease": "...", "treatment": "..."}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
       return res.status(500).json({ error: "Google API Hatası: " + data.error.message });
    }

    const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(text));

  } catch (err) {
    return res.status(500).json({ error: "Sistem hatası: " + err.message });
  }
}
