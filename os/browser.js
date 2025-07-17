export async function init(OS) {
  OS.registerApp('browser', () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    container.style.overflow = 'hidden';
    container.style.fontFamily = 'sans-serif';

    // Address bar container
    const addressBar = document.createElement('div');
    addressBar.style.display = 'flex';
    addressBar.style.padding = '6px';
    addressBar.style.borderBottom = '1px solid #ccc';
    addressBar.style.gap = '6px';

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.disabled = true;
    styleNavButton(backBtn);

    // Forward button
    const forwardBtn = document.createElement('button');
    forwardBtn.textContent = 'Forward →';
    forwardBtn.disabled = true;
    styleNavButton(forwardBtn);

    // Input and Go button
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter URL (e.g. https://example.com)';
    input.style.flex = '1';
    input.style.padding = '6px 8px';
    input.style.fontSize = '1rem';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';

    const goBtn = document.createElement('button');
    goBtn.textContent = 'Go';
    goBtn.style.padding = '6px 12px';
    goBtn.style.border = '1px solid #ccc';
    goBtn.style.background = '#ff7f00';
    goBtn.style.color = 'white';
    goBtn.style.fontWeight = 'bold';
    goBtn.style.cursor = 'pointer';
    goBtn.style.borderRadius = '4px';

    addressBar.append(backBtn, forwardBtn, input, goBtn);

    // Content display container (scrollable)
    const contentDiv = document.createElement('div');
    contentDiv.style.flex = '1';
    contentDiv.style.overflowY = 'auto';
    contentDiv.style.padding = '10px';
    contentDiv.style.background = 'white';
    contentDiv.style.borderTop = '1px solid #ccc';
    contentDiv.style.height = '100%';

    container.appendChild(addressBar);
    container.appendChild(contentDiv);

    const win = OS.createWindow('OrangeSpace Browser (Complex)', container, { left: '100px', top: '100px' });

    // History stack
    const historyStack = [];
    let historyIndex = -1;

    function styleNavButton(btn) {
      btn.style.border = '1px solid #ccc';
      btn.style.background = '#eee';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = 'bold';
      btn.style.borderRadius = '4px';
      btn.style.userSelect = 'none';
      btn.style.padding = '6px 10px';
    }

    function updateNavButtons() {
      backBtn.disabled = historyIndex <= 0;
      forwardBtn.disabled = historyIndex >= historyStack.length -1;
    }

    function resolveURL(base, relative) {
      try {
        return new URL(relative, base).href;
      } catch {
        return relative;
      }
    }

    // Rewrite relative URLs inside the injected HTML
    function rewriteRelativeURLs(html, baseUrl) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Fix <a> href
      doc.querySelectorAll('a[href]').forEach(a => {
        a.href = resolveURL(baseUrl, a.getAttribute('href'));
        a.target = '_self'; // Keep navigation inside this window
        a.addEventListener('click', e => {
          e.preventDefault();
          loadPage(a.href, true);
        });
      });

      // Fix <img> src
      doc.querySelectorAll('img[src]').forEach(img => {
        img.src = resolveURL(baseUrl, img.getAttribute('src'));
      });

      // Fix <link> href (stylesheets)
      doc.querySelectorAll('link[href]').forEach(link => {
        const rel = link.getAttribute('rel');
        if (rel === 'stylesheet') {
          link.href = resolveURL(baseUrl, link.getAttribute('href'));
        }
      });

      // Fix <script> src (scripts won’t run anyway, but fix src anyway)
      doc.querySelectorAll('script[src]').forEach(script => {
        script.src = resolveURL(baseUrl, script.getAttribute('src'));
      });

      // Remove all inline scripts to avoid conflicts
      doc.querySelectorAll('script').forEach(script => {
        script.remove();
      });

      // Insert a basic CSS reset style
      const styleReset = doc.createElement('style');
      styleReset.textContent = `
        /* CSS Reset */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: sans-serif;
          background: white;
          color: black;
        }
      `;
      doc.head.prepend(styleReset);

      return doc.documentElement.outerHTML;
    }

    async function loadPage(url, addToHistory = true) {
      if (!url) return;

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      input.value = url;
      contentDiv.innerHTML = `<p style="color: #555;">Loading ${url} ...</p>`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        let html = await response.text();

        // Get base URL from <base> tag or fallback to page URL
        const baseMatch = html.match(/<base\s+href="([^"]*)"/i);
        const baseUrl = baseMatch ? baseMatch[1] : url;

        // Rewrite relative URLs
        html = rewriteRelativeURLs(html, baseUrl);

        // Inject rewritten HTML
        contentDiv.innerHTML = html;

        // Manage history
        if (addToHistory) {
          historyStack.splice(historyIndex + 1);
          historyStack.push(url);
          historyIndex++;
          updateNavButtons();
        }

      } catch (err) {
        contentDiv.innerHTML = `<p style="color:red;">Failed to load page: ${err.message}</p>`;
      }
    }

    backBtn.onclick = () => {
      if (historyIndex > 0) {
        historyIndex--;
        loadPage(historyStack[historyIndex], false);
        updateNavButtons();
      }
    };

    forwardBtn.onclick = () => {
      if (historyIndex < historyStack.length -1) {
        historyIndex++;
        loadPage(historyStack[historyIndex], false);
        updateNavButtons();
      }
    };

    goBtn.onclick = () => {
      loadPage(input.value.trim());
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        loadPage(input.value.trim());
      }
    });

    // Start blank
    contentDiv.innerHTML = `<p style="color: #555;">Enter a URL and press Go</p>`;
  });
}
