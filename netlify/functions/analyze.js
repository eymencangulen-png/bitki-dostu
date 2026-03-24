exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API anahtarı sunucuda tanımlı değil." }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Geçersiz istek." }) }; }

  const { imageBase64, mimeType, plantName, lang } = body;
  if (!imageBase64 || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: "Fotoğraf eksik." }) };
  }

  const langLabel = { tr: "Türkçe", en: "English", de: "Deutsch", ru: "Русский", zh: "中文" }[lang] || "Türkçe";
  const prompt = `Sen uzman bir bitki doktoru ve botanistsin. Fotoğraftaki bitkiyi analiz et.
Kullanıcı bitki adı olarak "${plantName || "bilinmeyen"}" yazdı.

Sadece JSON döndür, başka hiçbir şey yazma:
{
  "plantName": "bitkinin doğru adı",
  "disease": "hastalık/sorun adı veya Sağlıklı",
  "treatment": "adım adım tedavi veya bakım önerisi",
  "sunlight": {"status":"good|warn|danger","text":"güneş durumu ve öneri"},
  "water": {"status":"good|warn|danger","text":"su durumu ve öneri"},
  "fertilizer": {"status":"good|warn|danger","text":"gübre durumu ve öneri"},
  "soil": {"status":"good|warn|danger","text":"toprak durumu"},
  "careGuide": "bu bitkiye özel 4-5 maddelik bakım rehberi"
}
Yanıtı ${langLabel} dilinde ver.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
    }

    const text = data.content[0].text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Sunucu hatası: " + err.message }) };
  }
};
