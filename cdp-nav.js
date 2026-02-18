const http = require('http');
const WebSocket = require('ws');

(async () => {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const page = tabs.find(t => t.type === 'page');
  if (!page) { console.log('No page tab'); return; }
  console.log('Tab:', page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = id++;
    const to = setTimeout(() => { ws.off('message', h); rej(new Error('timeout')); }, 15000);
    const h = d => {
      const msg = JSON.parse(d.toString());
      if (msg.id === i) { clearTimeout(to); ws.off('message', h); res(msg.result || msg); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });

  ws.on('open', async () => {
    try {
      await send('Page.navigate', { url: 'http://localhost:4100/login' });
      console.log('Navigated to login page');
      ws.close();
    } catch (e) {
      console.error(e.message);
      ws.close();
    }
  });
})();
