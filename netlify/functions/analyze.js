exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  var GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key missing" }) };
  }

  var body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) }; }

  var imageBase64 = body.imageBase64;
  var mimeType = body.mimeType;
  var plantName = body.plantName || "unknown";
  var lang = body.lang || "tr";

  if (!imageBase64 || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: "Image missing" }) };
  }

  var langMap = { tr: "Turkce", en: "English", de: "Deutsch", ru: "Russky", zh: "Chinese" };
  var langLabel = langMap[lang] || "Turkce";

  var prompt = "Sen uzman bir bitki doktoru ve botanistsin. Fotograftaki bitkiyi analiz et. "
    + "Kullanici bitki adi olarak [" + plantName + "] yazdi. "
    + "Sadece asagidaki JSON formatinda yanit ver, baska hicbir sey yazma: "
    + '{"plantName":"bitkinin adi","disease":"hastalik veya Saglikli","treatment":"tedavi onerisi",'
    + '"sunlight":{"status":"good","text":"gunes oneri"},'
    + '"water":{"status":"good","text":"su oneri"},'
    + '"fertilizer":{"status":"good","text":"gubre oneri"},'
    + '"soil":{"status":"good","text":"toprak durumu"},'
    + '"careGuide":"bakim rehberi"} '
    + "status degerleri: good, warn veya danger olabilir. "
    + "Yaniti " + langLabel + " dilinde ver.";

  try {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY;

    var reqBody = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: prompt }
        ]
      }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
    };

    var response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody)
    });

    var data = await response.json();

    if (data.error) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
    }

    var text = data.candidates[0].content.parts[0].text;
    text = text.trim().replace(/```json/g, "").replace(/```/g, "").trim();
    var result = JSON.parse(text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };

  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error: " + err.message }) };
  }
};
