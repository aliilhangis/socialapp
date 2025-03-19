const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // CORS başlıkları
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS isteği için yanıt
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const data = JSON.parse(event.body);
    const { imageBase64 } = data;

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image data is required' })
      };
    }

    // API anahtarını çevre değişkeninden al
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      console.error('GEMINI_API_KEY çevre değişkeni ayarlanmamış');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key is not configured' })
      };
    }
    
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

    const requestData = {
      contents: [{
        parts: [
          {
            text: "Bu fotoğraf için Instagram'da kullanılabilecek, algoritma dostu, en fazla 5 satır uzunluğunda bir açıklama ve en fazla 5 adet ilgili hashtag oluştur. Açıklamayı ve hashtag'leri ayrı ayrı döndür. Türkçe olarak yanıt ver."
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    };

    console.log('Gemini API isteği gönderiliyor...');
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API hatası:', responseData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'API request failed', 
          details: responseData 
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message })
    };
  }
}; 
