import fetch from 'node-fetch';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) {
    res.status(400).send('Missing ?url= parameter.');
    return;
  }

  try {
    // Fetch the target URL with user-agent forwarded
    const response = await fetch(target, {
      headers: { 'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0' },
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    let body = await response.text();

    if (contentType.includes('text/html')) {
      const $ = cheerio.load(body);

      // Helper: rewrite URLs to proxy URLs
      function rewriteUrl(url) {
        if (!url || url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('#')) return url;
        try {
          const absUrl = new URL(url, target).href;
          return `/api/proxy?url=${encodeURIComponent(absUrl)}`;
        } catch {
          return url;
        }
      }

      // Rewrite <a href>
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        $(el).attr('href', rewriteUrl(href));
        $(el).attr('target', '_self'); // open in same frame
      });

      // Rewrite <script src>
      $('script[src]').each((_, el) => {
        const src = $(el).attr('src');
        $(el).attr('src', rewriteUrl(src));
      });

      // Rewrite <link href>
      $('link[href]').each((_, el) => {
        const href = $(el).attr('href');
        $(el).attr('href', rewriteUrl(href));
      });

      // Rewrite <img src>
      $('img[src]').each((_, el) => {
        const src = $(el).attr('src');
        $(el).attr('src', rewriteUrl(src));
      });

      // Rewrite CSS url() inside style tags and inline styles (optional, more complex)

      body = $.html();
    } else {
      // For non-HTML content like images or JS, just pipe as is
      // We already got it as text for simplicity; you could fetch buffer for binaries
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', '');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:");    

    res.status(200).send(body);
  } catch (error) {
    res.status(500).send(`Proxy error: ${error.message}`);
  }
}
