export default async function handler(req, res) {
  const target = req.query.url;

  if (!target) {
    res.status(400).send("Missing ?url= parameter.");
    return;
  }

  try {
    const response = await fetch(target, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      },
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    const body = await response.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', '');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:");

    res.status(200).send(body);
  } catch (error) {
    res.status(500).send(`Proxy error: ${error.message}`);
  }
}
