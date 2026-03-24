exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API anahtari tanimli degil." }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Gecersiz istek." }) }; }

  const { imageBase64, mimeType, plantName, lang } = body;
  if (!imageBase64 || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: "Fotograf eksik." }) };
  }

  const langLabel = { tr:"Turkce", en:"English", de:"Deutsch", ru:"Russky", zh:"Chinese" }[lang] || "Turkce";

  const prompt = `Sen uzman bir bitki doktoru ve botanistsin. Fotograftaki bitkiyi analiz et.
Kullanici bitki adi olarak "${plantName || "bilinmeyen"}" yazdi.
Sadece JSON dondur, baska hicbir sey yazma:
{
  "plantName": "bitkinin dogru adi",
  "disease": "hastalik/sorun adi veya Saglikli",
  "treatment": "adim adim tedavi veya bakim onerisi",
  "sunlight": {"status":"good|warn|danger","text":"gunes durumu ve oneri"},
  "water": {"status":"good|warn|danger","text":"su durumu ve oneri"},
  "fertilizer": {"status":"good|warn|danger","text":"gubre durumu ve oneri"},
  "soil": {"status":"good|warn|danger","text":"toprak durumu"},
  "careGuide": "bu bitkiye ozel 4-5 maddelik bakim rehberi"
}
Yaniti ${langLabel} dilinde ver.`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
        })
      }
    );

    const data = await response.json();
    if (data.error) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Sunucu hatasi: " + err.message }) };
