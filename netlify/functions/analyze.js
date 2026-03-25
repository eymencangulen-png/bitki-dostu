exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Sistem hatası: API anahtarı eksik." }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Geçersiz istek." }) }; }

  const { imageBase64, mimeType, plantName = "Bilinmiyor", lang = "tr" } = body;

  if (!imageBase64 || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: "Lütfen bir bitki fotoğrafı yükleyin." }) };
  }

  const langMap = { tr: "Turkish", en: "English", de: "German", ru: "Russian", zh: "Chinese" };
  const langLabel = langMap[lang] || "Turkish";

  // PROMPT OPTİMİZASYONU: Daha derin analiz ve JSON garantisi
  const prompt = `Sen dünya çapında tanınan uzman bir bitki patoloğu ve botanikçisin. 
    Kullanıcı bu bitki için "${plantName}" ismini verdi. Fotoğrafı dikkatle incele. 
    Yanıtını sadece ve sadece aşağıdaki JSON formatında ver, asla açıklama metni ekleme.
    JSON yapısı:
    {
      "plantName": "Bitkinin tam bilimsel ve yaygın adı",
      "disease": "Hastalık adı veya 'Sağlıklı' durumu",
      "treatment": "Adım adım tedavi planı veya koruma önerisi",
      "sunlight": {"status": "good/warn/danger", "text": "Işık ihtiyacı detayı"},
      "water": {"status": "good/warn/danger", "text": "Sulama rutini önerisi"},
      "fertilizer": {"status": "good/warn/danger", "text": "Gübreleme ihtiyacı"},
      "soil": {"status": "good/warn/danger", "text": "Toprak ve saksı durumu"},
      "careGuide": "Bu bitki için genel uzun vadeli bakım rehberi"
    }
    Önemli: Yanıt dili mutlaka ${langLabel} olmalı.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 } // Sıcaklığı düşürdüm (daha tutarlı yanıt)
      })
    });

    const data = await response.json();

    // HATA YÖNETİMİ: Kota aşımı kontrolü
    // HATA YÖNETİMİ: Kullanıcı dostu mesajlar
    if (data.error) {
      if (data.error.code === 429) {
        return { 
          statusCode: 429, 
          body: JSON.stringify({ error: "Bitki uzmanlarımız şu an diğer saksılarla ilgileniyor. Teşhis için lütfen 30 saniye sonra tekrar deneyin." }) 
        };
      }
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "Bahçemizde küçük bir bakım çalışması var, lütfen birazdan tekrar deneyin." }) 
      };
    }
    // JSON TEMİZLEME (Bazı durumlarda Gemini markdown ekleyebiliyor)
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json|```/g, "").trim();
    
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
