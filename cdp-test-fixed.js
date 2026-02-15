const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function run() {
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = tabs.find(t => t.url.includes('social-search'));
  if (!page) { console.log('No social-search tab found'); return; }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          resolve(msg.result || msg);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.on('open', async () => {
    try {
      // Reload the page to pick up latest changes
      await send('Page.navigate', { url: 'http://localhost:4100/social-search' });
      await new Promise(r => setTimeout(r, 4000));

      // Take screenshot of the welcome state
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\social-search-welcome.png', Buffer.from(screenshot.data, 'base64'));
      console.log('Screenshot saved: screen/social-search-welcome.png');

      // Now search
      console.log('Searching for "cybersecurity"...');
      await send('Runtime.evaluate', {
        expression: `
          const input = document.querySelector('input[matinput]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, 'cybersecurity');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            'value set';
          } else { 'no input'; }
        `
      });
      await new Promise(r => setTimeout(r, 500));

      // Click search button
      await send('Runtime.evaluate', {
        expression: `
          const btn = document.querySelector('button.search-btn');
          if (btn) { btn.click(); 'clicked'; } else { 'no btn'; }
        `
      });

      // Wait for results
      console.log('Waiting for search results (sequential, may take a moment)...');
      await new Promise(r => setTimeout(r, 20000));

      // Take screenshot of results
      const screenshot2 = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\osentLib\\screen\\social-search-results-fixed.png', Buffer.from(screenshot2.data, 'base64'));
      console.log('Screenshot saved: screen/social-search-results-fixed.png');

      // Check results
      const pageContent = await send('Runtime.evaluate', {
        expression: `
          const results = document.querySelectorAll('.result-card');
          const provHeaders = document.querySelectorAll('.provider-header');
          const errorMsgs = document.querySelectorAll('.provider-error');
          let info = 'Results cards: ' + results.length + '\\n';
          info += 'Provider sections: ' + provHeaders.length + '\\n';
          provHeaders.forEach(h => info += '  - ' + h.textContent.trim() + '\\n');
          if (errorMsgs.length > 0) {
            errorMsgs.forEach(e => info += 'Error: ' + e.textContent.trim() + '\\n');
          }
          info;
        `
      });
      console.log('Page state:\\n' + (pageContent.result?.value || 'check screenshot'));

      ws.close();
    } catch (err) {
      console.error('Error:', err.message);
      ws.close();
    }
  });
}

run().catch(console.error);
