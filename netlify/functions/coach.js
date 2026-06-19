const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-OpenAI-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: { message: 'Method not allowed' } })
    };
  }

  const apiKey = process.env.OPENAI_API_KEY ||
    (event.headers['x-openai-key'] || event.headers['X-OpenAI-Key']);

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: { message: 'OpenAI API key not configured. Set OPENAI_API_KEY in Netlify environment variables, or send X-OpenAI-Key header from the app.' }
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        messages: body.messages || [],
        max_tokens: body.max_tokens || 900,
        temperature: body.temperature != null ? body.temperature : 0.7
      })
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: { message: err.message || 'Server error' } })
    };
  }
};
