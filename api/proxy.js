// api/proxy.js

export default async function handler(req, res) {
  const target = req.query.url;

  if (!target) {
    res.status(400).send("Missing ?url= parameter.");
    return;
  }

  try {
    // Fetch the target URL with minimal headers to mimic browser request
    const response = await fetch(target, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // Add more headers if needed, but keep minimal to avoid blocking
      },
    });

    if (!response.ok) {
      // If target site returns error, forward that status
      res.status(response.status).send(`Upstream fetch failed with status ${response.status}`);
      return;
    }

    // Read content type to pass to client
    const contentType = response.headers.get('content-type') || 'text/html';

    // Read response body as text
    const body = await response.text();

    // Set headers for client
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORS
    // Remove iframe blocking headers (X-Frame-Options etc) by overriding
    res.setHeader('X-Frame-Options', '');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:");

    res.status(200).send(body);
  } catch (error) {
    console.error('Proxy fetch error:', error);
    res.status(500).send(`Proxy error: ${error.message}`);
  }
}
