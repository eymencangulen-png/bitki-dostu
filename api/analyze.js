const fetch = require("node-fetch");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "API key missing" });
  }

  const { imageBase64, mimeType, plantName, lang } = req.body;
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: "Image missing" });
  }

  const langMap = { tr:"Turkce", en:"English", de:"Deutsch", ru:"Russky", zh:"Chinese" };
  const langLabel = langMap[lang] || "Turkce";
  const pname = plantName || "unknown";

  const prompt = "Sen uzman bir bitki doktoru ve botanistsin. Fotograftaki bitkiyi analiz et. "
    + "Kullanici bitki adi olarak [" + pname + "] yazdi. "
    + "Sadece JSON formatinda yanit ver: "
    + '{"plantName":"ad","disease":"hastalik","treatment":"tedavi",'
    + '"sunlight":{"status":"good","text":"aciklama"},'
    + '"water":{"status":"good","text":"aciklama"},'
    + '"fertilizer":{"status":"good","text":"aciklama"},'
    + '"soil":{"status":"good","text":"aciklama"},'
    + '"careGuide":"rehber"} '
    + "status: good/warn/danger. Yaniti " + langLabel + " dilinde ver.";

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt }
          ]}],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let text = data.candidates[0].content.parts[0].text;
    text = text.trim().replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(text);
    return res.status(200).json(result);

  } catch(err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
