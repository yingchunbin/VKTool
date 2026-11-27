/* Dump mã game Vạn Kiếp Tu Tiên (chỉ js/json/css/html, không ảnh) → tải về vk-game-source-<giờ>.zip
   Cách dùng: mở game, F12 → Console → dán toàn bộ file này → Enter. */
(async () => {
  const log = (...a) => console.log('[dump]', ...a);
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  const urls = new Set([location.href.split('#')[0], base + 'index.html']);
  for (const r of performance.getEntriesByType('resource')) {
    try { const u = new URL(r.name); if (u.origin === location.origin && /\.(js|mjs|json|css|html|yml|yaml|md)(\?|$)/i.test(u.pathname) && !/\/img\//.test(u.pathname)) urls.add(u.href.split('#')[0]); } catch {}
  }
  for (const s of document.querySelectorAll('script[src],link[href]')) {
    try { const u = new URL(s.src || s.href, location.href); if (u.origin === location.origin && /\.(js|mjs|json|css)(\?|$)/i.test(u.pathname)) urls.add(u.href.split('#')[0]); } catch {}
  }
  const files = [];
  // quét thêm import tĩnh / động trong các file js để lấy đủ chunk
  const queue = [...urls], seen = new Set();
  while (queue.length) {
    const u = queue.shift(); if (seen.has(u)) continue; seen.add(u);
    try {
      const res = await fetch(u, { cache: 'force-cache' }); if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      let name = decodeURIComponent(new URL(u).pathname.replace(/^\/+/, '')) || 'index.html'; if (name.endsWith('/')) name += 'index.html';
      files.push({ name: 'source/' + name, data: buf });
      if (/\.m?js(\?|$)/.test(u)) {
        const txt = new TextDecoder().decode(buf), dir = u.slice(0, u.lastIndexOf('/') + 1);
        for (const m of txt.matchAll(/(?:from|import\()\s*["'](\.{1,2}\/[^"']+\.m?js)["']/g)) { try { const n = new URL(m[1], dir).href; if (!seen.has(n)) queue.push(n) } catch {} }
        for (const m of txt.matchAll(/["'](\.{0,2}\/?[\w\-./]*assets\/[\w\-.]+\.(?:js|json|css))["']/g)) { try { const n = new URL(m[1].replace(/^\//, ''), m[1].startsWith('/') ? location.origin + '/' : dir).href; if (n.startsWith(location.origin) && !seen.has(n)) queue.push(n) } catch {} }
      }
      log(files.length, name, (buf.length / 1024 | 0) + 'KB');
    } catch (e) { log('bỏ qua', u, e.message) }
  }
  const info = { url: location.href, gio: new Date().toISOString(), gameVersion: window.tuTien?.gameVersion || null, ua: navigator.userAgent, soFile: files.length, core: Object.keys(window.tuTien?.core || {}).length };
  files.push({ name: 'source/_thong_tin.json', data: new TextEncoder().encode(JSON.stringify(info, null, 2)) });
  // ZIP không nén (store)
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 });
  const crc = (b) => { let c = ~0; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return ~c >>> 0 };
  const parts = [], cen = []; let off = 0; const enc = new TextEncoder();
  const u16 = (v) => new Uint8Array([v & 255, v >> 8 & 255]), u32 = (v) => new Uint8Array([v & 255, v >> 8 & 255, v >> 16 & 255, v >>> 24 & 255]);
  for (const f of files) {
    const nm = enc.encode(f.name), c = crc(f.data), sz = f.data.length;
    const lh = [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(sz), u32(sz), u16(nm.length), u16(0), nm];
    const lhLen = lh.reduce((a, b) => a + b.length, 0);
    parts.push(...lh, f.data);
    cen.push([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c), u32(sz), u32(sz), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off), nm]);
    off += lhLen + sz;
  }
  let cenLen = 0; for (const c of cen) { for (const p of c) { parts.push(p); cenLen += p.length } }
  parts.push(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cenLen), u32(off), u16(0));
  const blob = new Blob(parts, { type: 'application/zip' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'vk-game-source-' + new Date().toISOString().replace(/\D/g, '').slice(0, 14) + '.zip';
  document.body.appendChild(a); a.click(); a.remove();
  log('xong:', files.length, 'file,', (blob.size / 1048576).toFixed(1), 'MB →', a.download);
})();
