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
  const pname = plantName || "bilinmeyen";

  const prompt = "Sen uzman bir bitki doktoru ve botanistsin. Fotograftaki bitkiyi analiz et.\n"
    + "Kullanici bitki adi olarak '" + pname + "' yazdi.\n\n"
    + "Sadece JSON dondur, baska hicbir sey yazma:\n"
    + "{\n"
    + '  "plantName": "bitkinin dogru adi",\n'
    + '  "disease": "hastalik/sorun adi veya Saglikli",\n'
    + '  "treatment": "adim adim tedavi veya bakim onerisi",\n'
    + '  "sunlight": {"status":"good","text":"gunes durumu ve oneri"},\n'
    + '  "water": {"status":"good","text":"su durumu ve oneri"},\n'
    + '  "fertilizer": {"status":"good","text":"gubre durumu ve oneri"},\n'
    + '  "soil": {"status":"good","text":"toprak durumu"},\n'
    + '  "careGuide": "bu bitkiye ozel 4-5 maddelik bakim rehberi"\n'
    + "}\n"
    + "status alanlari icin good, warn veya danger kullan. Yaniti " + langLabel + " dilinde ver.";

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

    let text = data.candidates[0].content.parts[0].text || "";
    text = text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Sunucu hatasi: " + err.message }) };
  }
};
