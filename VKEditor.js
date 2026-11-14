(() => {
  'use strict';

  const TOOL_VERSION = 'VK-EDITOR-2.2.0';
  const SAVE_KEY = 'tu-tien:run';
  const PREFIX = 'VKTT1.';
  const XOR_KEY = new TextEncoder().encode('van-kiep-tu-tien/save#1');
  const MAX_BYTES = 16 * 1024 * 1024;
  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8', { fatal: true });

  const fields = [
    ['linhThach', 'Linh thạch', ['nhanVat', 'linhThach']],
    ['congHien', 'Cống hiến', ['nhanVat', 'congHien']],
    ['thanThuc', 'Thần thức', ['nhanVat', 'chiSo', 'than_thuc']],
    ['ngoTinh', 'Ngộ tính', ['nhanVat', 'chiSo', 'ngo_tinh']],
    ['khiVan', 'Khí vận', ['nhanVat', 'chiSo', 'khi_van']],
    ['thanPhap', 'Thân pháp', ['nhanVat', 'chiSo', 'than_phap']],
    ['canCot', 'Căn cốt', ['nhanVat', 'chiSo', 'can_cot']],
    ['daoTam', 'Đạo tâm', ['nhanVat', 'chiSo', 'dao_tam']],
    ['tamMa', 'Tâm ma / Ma niệm', ['nhanVat', 'chiSo', 'tam_ma']]
  ];

  const get = (obj, path) => path.reduce((v, k) => v?.[k], obj);
  const set = (obj, path, value) => {
    let p = obj;
    for (let i = 0; i < path.length - 1; i++) p = p[path[i]];
    p[path[path.length - 1]] = value;
  };

  function fnv1a(bytes) {
    let hash = 2166136261;
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function xor(bytes) {
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ XOR_KEY[i % XOR_KEY.length];
    return out;
  }

  function fromBase64(text) {
    const raw = atob(text);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function toBase64(bytes) {
    let raw = '';
    for (let i = 0; i < bytes.length; i += 32768) {
      raw += String.fromCharCode(...bytes.subarray(i, Math.min(i + 32768, bytes.length)));
    }
    return btoa(raw);
  }

  function lzDecompress(bytes) {
    const out = [];
    let i = 0;
    while (i < bytes.length) {
      const opcode = bytes[i++];
      if (opcode === 0) {
        const length = bytes[i++];
        if (!length || i + length > bytes.length || out.length + length > MAX_BYTES) throw new Error('Khối literal LZ không hợp lệ.');
        for (let n = 0; n < length; n++) out.push(bytes[i++]);
      } else if (opcode === 1) {
        if (i + 3 > bytes.length) throw new Error('Lệnh copy LZ bị thiếu.');
        const distance = bytes[i++] | (bytes[i++] << 8);
        const length = bytes[i++];
        const start = out.length - distance;
        if (!distance || start < 0 || !length || out.length + length > MAX_BYTES) throw new Error('Lệnh copy LZ không hợp lệ.');
        for (let n = 0; n < length; n++) out.push(out[start + n]);
      } else {
        throw new Error(`Opcode LZ không hợp lệ: ${opcode}.`);
      }
    }
    return Uint8Array.from(out);
  }

  function unpack(bytes) {
    if (bytes.length < 1) throw new Error('Packed save rỗng.');
    if (bytes[0] === 0) return bytes.subarray(1);
    if (bytes[0] === 1) return lzDecompress(bytes.subarray(1));
    throw new Error(`Pack mode không hợp lệ: ${bytes[0]}.`);
  }

  function decodeSave(text) {
    if (typeof text !== 'string' || !text.trim().startsWith(PREFIX)) throw new Error(`Save không bắt đầu bằng ${PREFIX}`);
    const container = fromBase64(text.trim().slice(PREFIX.length));
    if (container.length < 5) throw new Error('Container quá ngắn.');
    const storedHash = (container[0] << 24 | container[1] << 16 | container[2] << 8 | container[3]) >>> 0;
    const packed = xor(container.subarray(4));
    const actualHash = fnv1a(packed);
    if (storedHash !== actualHash) throw new Error(`Checksum sai: ${storedHash.toString(16)} != ${actualHash.toString(16)}`);
    const json = unpack(packed);
    if (json.length > MAX_BYTES) throw new Error('Save vượt giới hạn 16 MiB.');
    return { object: JSON.parse(dec.decode(json)), storedHash, packedLength: packed.length, jsonLength: json.length };
  }

  function lzCompress(bytes) {
    let out = new Uint8Array(Math.max(1024, bytes.length >> 1));
    let outPos = 0;
    const ensure = length => {
      if (outPos + length <= out.length) return;
      const grown = new Uint8Array(Math.max(out.length * 2, outPos + length));
      grown.set(out.subarray(0, outPos));
      out = grown;
    };
    const last = new Map();
    let cursor = 0, literalStart = 0;
    const flushLiterals = end => {
      while (literalStart < end) {
        const length = Math.min(255, end - literalStart);
        ensure(2 + length);
        out[outPos++] = 0;
        out[outPos++] = length;
        out.set(bytes.subarray(literalStart, literalStart + length), outPos);
        outPos += length;
        literalStart += length;
      }
    };
    const keyAt = i => (bytes[i] << 16 ^ bytes[i + 1] << 8 ^ bytes[i + 2]) >>> 0;
    while (cursor < bytes.length) {
      let length = 0, distance = 0;
      if (cursor + 3 <= bytes.length) {
        const key = keyAt(cursor);
        const previous = last.get(key);
        if (previous !== undefined && cursor - previous <= 4096) {
          const max = Math.min(255, bytes.length - cursor);
          let matched = 0;
          while (matched < max && bytes[previous + matched] === bytes[cursor + matched]) matched++;
          if (matched >= 4) { length = matched; distance = cursor - previous; }
        }
        last.set(key, cursor);
      }
      if (length >= 4) {
        flushLiterals(cursor);
        ensure(4);
        out[outPos++] = 1;
        out[outPos++] = distance & 255;
        out[outPos++] = distance >>> 8 & 255;
        out[outPos++] = length;
        for (let i = 1; i < length && cursor + i + 3 < bytes.length; i++) last.set(keyAt(cursor + i), cursor + i);
        cursor += length;
        literalStart = cursor;
      } else cursor++;
    }
    flushLiterals(bytes.length);
    return out.slice(0, outPos);
  }

  function pack(bytes) {
    const compressed = lzCompress(bytes);
    if (compressed.length >= bytes.length) {
      const raw = new Uint8Array(1 + bytes.length);
      raw[0] = 0; raw.set(bytes, 1); return raw;
    }
    const packed = new Uint8Array(1 + compressed.length);
    packed[0] = 1; packed.set(compressed, 1); return packed;
  }

  function encodeSave(object) {
    const json = enc.encode(JSON.stringify(object));
    if (json.length > MAX_BYTES) throw new Error('Save sau chỉnh sửa vượt giới hạn 16 MiB.');
    const packed = pack(json);
    const hash = fnv1a(packed);
    const encrypted = xor(packed);
    const container = new Uint8Array(4 + encrypted.length);
    container[0] = hash >>> 24 & 255;
    container[1] = hash >>> 16 & 255;
    container[2] = hash >>> 8 & 255;
    container[3] = hash & 255;
    container.set(encrypted, 4);
    return { container: PREFIX + toBase64(container), hash, packedLength: packed.length, jsonLength: json.length };
  }

  function validateRun(run) {
    if (!run || typeof run !== 'object' || Array.isArray(run)) throw new Error('Save run không phải object.');
    if (run.version !== 10) throw new Error(`Save version ${String(run.version)}; editor hỗ trợ version 10.`);
    for (const [, label, path] of fields) {
      const value = get(run, path);
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Sai schema: ${label} tại run.${path.join('.')}`);
    }
  }

  const originalText = localStorage.getItem(SAVE_KEY);
  if (!originalText) return alert(`Không tìm thấy ${SAVE_KEY}. Hãy vào nhân vật rồi chạy lại.`);

  let decoded;
  try {
    decoded = decodeSave(originalText);
    validateRun(decoded.object);
  } catch (error) {
    console.error(`${TOOL_VERSION} LOAD FAILED`, error);
    return alert(`VK Editor dừng an toàn:\n${error.message}`);
  }

  document.getElementById('vk-editor-v2')?.remove();
  const panel = document.createElement('section');
  panel.id = 'vk-editor-v2';
  panel.innerHTML = `
    <style>
      #vk-editor-v2{position:fixed;z-index:2147483647;top:8px;right:8px;width:min(370px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;box-sizing:border-box;background:#122231;color:#f7fbff;padding:14px;border:1px solid #64819a;border-radius:12px;box-shadow:0 12px 40px #0009;font:14px/1.4 system-ui,sans-serif;color-scheme:dark}
      #vk-editor-v2 *{box-sizing:border-box}#vk-editor-v2 header{display:flex;align-items:center;justify-content:space-between;gap:8px}#vk-editor-v2 h2{font-size:16px;margin:0}#vk-editor-v2 .vk-close{font-size:20px;padding:2px 9px;background:#34495b}#vk-editor-v2 .vk-meta{margin:7px 0 10px;color:#b9cad8;font-size:12px}#vk-editor-v2 .vk-grid{display:grid;grid-template-columns:minmax(0,1fr) 128px;gap:8px;align-items:center}#vk-editor-v2 label{overflow-wrap:anywhere}#vk-editor-v2 input{width:100%;padding:7px 8px;background:#081521;color:#fff;border:1px solid #62809a;border-radius:6px}#vk-editor-v2 input:focus{outline:2px solid #5eb2ff;outline-offset:1px}#vk-editor-v2 button{cursor:pointer;border:0;border-radius:7px;padding:8px 11px;background:#1575bd;color:#fff;font-weight:600}#vk-editor-v2 .vk-apply{width:100%;margin-top:12px;padding:10px}#vk-editor-v2 .vk-status{display:block;min-height:20px;margin-top:8px;color:#ffd584;font-style:normal}#vk-editor-v2 .vk-note{margin:8px 0 0;color:#aebfcd;font-size:11px}
    </style>
    <header><h2>VK Editor 2.2</h2><button type="button" class="vk-close" aria-label="Đóng">×</button></header>
    <div class="vk-meta">Save v${decoded.object.version} · ${decoded.jsonLength.toLocaleString('vi-VN')} byte JSON</div>
    <div class="vk-grid"></div>
    <button type="button" class="vk-apply">Áp dụng và tải lại</button>
    <em class="vk-status" aria-live="polite"></em>
    <p class="vk-note">Để trống để giữ nguyên. Chỉ nhận số nguyên an toàn ≥ 0. Công cụ tải save gốc thành tệp phục hồi trước khi ghi; bản backup sẵn có của game được giữ nguyên để tránh vượt quota.</p>`;
  document.documentElement.appendChild(panel);

  const grid = panel.querySelector('.vk-grid');
  const status = panel.querySelector('.vk-status');
  for (const [id, label, path] of fields) {
    const current = get(decoded.object, path);
    const lab = document.createElement('label');
    lab.htmlFor = `vk-${id}`;
    lab.textContent = `${label} (${current})`;
    const input = document.createElement('input');
    input.id = `vk-${id}`;
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.placeholder = 'Giữ nguyên';
    grid.append(lab, input);
  }

  panel.querySelector('.vk-close').addEventListener('click', () => panel.remove());
  panel.querySelector('.vk-apply').addEventListener('click', () => {
    const changes = [];
    for (const [id, label, path] of fields) {
      const raw = panel.querySelector(`#vk-${id}`).value.trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isSafeInteger(value) || value < 0) {
        status.textContent = `${label}: phải là số nguyên an toàn ≥ 0.`;
        return;
      }
      changes.push({ id, label, path, oldValue: get(decoded.object, path), newValue: value });
    }
    if (!changes.length) {
      status.textContent = 'Chưa nhập giá trị cần thay đổi.';
      return;
    }

    const keys = [SAVE_KEY, `${SAVE_KEY}:backup`, `${SAVE_KEY}:sealed`, `${SAVE_KEY}:lost`];
    const originals = Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
    const stamp = Date.now();
    let backupDownloaded = false;

    try {
      // Re-read immediately before editing to avoid overwriting a save changed while the panel was open.
      const currentText = localStorage.getItem(SAVE_KEY);
      if (currentText !== originalText) throw new Error('Save đã thay đổi từ lúc mở editor. Đóng editor, tải lại trang rồi thử lại.');
      const run = decodeSave(currentText).object;
      validateRun(run);
      for (const change of changes) set(run, change.path, change.newValue);

      const encoded = encodeSave(run);
      const roundTrip = decodeSave(encoded.container).object;
      for (const change of changes) {
        if (get(roundTrip, change.path) !== change.newValue) throw new Error(`Kiểm tra trước ghi thất bại: ${change.label}`);
      }

      // A full extra localStorage copy can exceed the browser quota. Export the original
      // run as a downloadable recovery file instead, without consuming site storage.
      try {
        const blob = new Blob([originalText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tu-tien-run-backup-${stamp}.txt`;
        link.style.display = 'none';
        document.documentElement.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        backupDownloaded = true;
      } catch (backupError) {
        console.warn('Không thể tải bản sao lưu ra tệp; vẫn giữ cơ chế phục hồi trong phiên ghi.', backupError);
      }

      // Do not duplicate the new run into :backup here. On storage-constrained origins,
      // that second full save exceeds quota. The original :backup remains untouched,
      // while the exact pre-edit run has already been exported as a recovery file.
      localStorage.setItem(SAVE_KEY, encoded.container);
      localStorage.setItem(`${SAVE_KEY}:sealed`, '1');

      const written = decodeSave(localStorage.getItem(SAVE_KEY)).object;
      for (const change of changes) {
        if (get(written, change.path) !== change.newValue) throw new Error(`Kiểm tra sau ghi thất bại: ${change.label}`);
      }

      console.table(changes.map(({ label, path, oldValue, newValue }) => ({ chỉ_số: label, đường_dẫn: `run.${path.join('.')}`, cũ: oldValue, mới: newValue })));
      console.log(`${TOOL_VERSION} SUCCESS`, { hash: encoded.hash, packedLength: encoded.packedLength, jsonLength: encoded.jsonLength, backupDownloaded, gameBackupPreserved: originals[`${SAVE_KEY}:backup`] !== null });
      status.textContent = 'Đã ghi và xác minh thành công. Đang tải lại…';
      setTimeout(() => location.reload(), 350);
    } catch (error) {
      for (const [key, value] of Object.entries(originals)) {
        try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch {}
      }
      console.error(`${TOOL_VERSION} STOPPED`, error);
      status.textContent = `Lỗi: ${error.message}`;
      alert(`VK Editor dừng an toàn; dữ liệu gốc đã được phục hồi:\n${error.message}`);
    }
  });
})();
