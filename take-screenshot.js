const { execSync } = require('child_process');

// Use Chrome DevTools Protocol via fetch
const http = require('http');
const https = require('https');
const fs = require('fs');

async function screenshot() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const url = 'http://localhost:4100/social-search';
  const outputPath = 'C:\\osentLib\\screen\\social_search.png';
  const tempDir = process.env.TEMP + '\\chrome-screenshot-' + Date.now();

  // Launch Chrome with remote debugging
  const { spawn } = require('child_process');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    url
  ], { stdio: 'ignore' });

  // Wait for Chrome to start
  await new Promise(r => setTimeout(r, 3000));

  try {
    // Get the websocket URL
    const jsonRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await jsonRes.json();
    const wsUrl = tabs[0]?.webSocketDebuggerUrl;

    if (!wsUrl) {
      console.log('No WebSocket URL found');
      chrome.kill();
      return;
    }

    // Use CDP via WebSocket
    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);

    let msgId = 1;

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        ws.on('message', function handler(data) {
          const msg = JSON.parse(data.toString());
          if (msg.id === id) {
            ws.removeListener('message', handler);
            resolve(msg.result);
          }
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise(r => ws.on('open', r));

    // Wait for page to load
    await new Promise(r => setTimeout(r, 5000));

    // Take screenshot
    const result = await send('Page.captureScreenshot', { format: 'png' });

    // Save
    fs.mkdirSync('C:\\osentLib\\screen', { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(result.data, 'base64'));
    console.log('Screenshot saved to ' + outputPath);

    ws.close();
  } catch (err) {
    console.error('Error:', err.message);

    // Fallback: try simple fetch approach
    try {
      const jsonRes = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      console.log('Tabs:', JSON.stringify(jsonRes.map(t => t.url)));
    } catch (e2) {
      console.error('Fallback error:', e2.message);
    }
  }

  chrome.kill();
  process.exit(0);
}

screenshot().catch(console.error);
