export function canvasBlob(c, mime, q) {
  return new Promise((r) => c.toBlob(r, mime, q));
}
export function bmpBlob(canvas, dpi) {
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height,
    data = ctx.getImageData(0, 0, w, h).data,
    row = Math.ceil((w * 3) / 4) * 4,
    size = 54 + row * h,
    b = new ArrayBuffer(size),
    dv = new DataView(b);
  dv.setUint16(0, 0x4d42, true);
  dv.setUint32(2, size, true);
  dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true);
  dv.setInt32(22, h, true);
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true);
  const ppm = Math.round(dpi / 0.0254);
  dv.setInt32(38, ppm, true);
  dv.setInt32(42, ppm, true);
  let p = 54;
  for (let y = h - 1; y >= 0; y--) {
    const start = p;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      dv.setUint8(p++, data[i + 2]);
      dv.setUint8(p++, data[i + 1]);
      dv.setUint8(p++, data[i]);
    }
    while (p - start < row) dv.setUint8(p++, 0);
  }
  return new Blob([b], { type: "image/bmp" });
}
export function tiffBlob(canvas, dpi) {
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height,
    rgba = ctx.getImageData(0, 0, w, h).data,
    pixels = w * h * 3,
    ifdOffset = 8,
    entries = 12,
    ifdSize = 2 + entries * 12 + 4,
    extraOffset = ifdOffset + ifdSize,
    bitsOffset = extraOffset,
    xresOffset = bitsOffset + 6,
    yresOffset = xresOffset + 8,
    pixelOffset = yresOffset + 8,
    total = pixelOffset + pixels,
    b = new ArrayBuffer(total),
    dv = new DataView(b);
  dv.setUint8(0, 0x49);
  dv.setUint8(1, 0x49);
  dv.setUint16(2, 42, true);
  dv.setUint32(4, ifdOffset, true);
  dv.setUint16(ifdOffset, entries, true);
  let e = ifdOffset + 2;
  const entry = (tag, type, count, val) => {
    dv.setUint16(e, tag, true);
    dv.setUint16(e + 2, type, true);
    dv.setUint32(e + 4, count, true);
    if (type === 3 && count === 1) {
      dv.setUint16(e + 8, val, true);
      dv.setUint16(e + 10, 0, true);
    } else dv.setUint32(e + 8, val, true);
    e += 12;
  };
  entry(256, 4, 1, w);
  entry(257, 4, 1, h);
  entry(258, 3, 3, bitsOffset);
  entry(259, 3, 1, 1);
  entry(262, 3, 1, 2);
  entry(273, 4, 1, pixelOffset);
  entry(277, 3, 1, 3);
  entry(278, 4, 1, h);
  entry(279, 4, 1, pixels);
  entry(282, 5, 1, xresOffset);
  entry(283, 5, 1, yresOffset);
  entry(296, 3, 1, 2);
  dv.setUint32(e, 0, true);
  dv.setUint16(bitsOffset, 8, true);
  dv.setUint16(bitsOffset + 2, 8, true);
  dv.setUint16(bitsOffset + 4, 8, true);
  for (const off of [xresOffset, yresOffset]) {
    dv.setUint32(off, dpi, true);
    dv.setUint32(off + 4, 1, true);
  }
  let p = pixelOffset;
  for (let i = 0; i < rgba.length; i += 4) {
    dv.setUint8(p++, rgba[i]);
    dv.setUint8(p++, rgba[i + 1]);
    dv.setUint8(p++, rgba[i + 2]);
  }
  return new Blob([b], { type: "image/tiff" });
}
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
export async function pngWithDpi(blob, dpi) {
  const src = new Uint8Array(await blob.arrayBuffer()),
    ppm = Math.round(dpi / 0.0254),
    data = new Uint8Array(9),
    dv = new DataView(data.buffer);
  dv.setUint32(0, ppm);
  dv.setUint32(4, ppm);
  data[8] = 1;
  const type = new TextEncoder().encode("pHYs"),
    chunk = new Uint8Array(4 + 4 + 9 + 4),
    cdv = new DataView(chunk.buffer);
  cdv.setUint32(0, 9);
  chunk.set(type, 4);
  chunk.set(data, 8);
  const crcInput = new Uint8Array(4 + 9);
  crcInput.set(type);
  crcInput.set(data, 4);
  cdv.setUint32(17, crc32(crcInput));
  const pos = 33,
    out = new Uint8Array(src.length + chunk.length);
  out.set(src.slice(0, pos), 0);
  out.set(chunk, pos);
  out.set(src.slice(pos), pos + chunk.length);
  return new Blob([out], { type: "image/png" });
}
export async function jpegWithDpi(blob, dpi) {
  const a = new Uint8Array(await blob.arrayBuffer()),
    d = Math.max(1, Math.min(65535, Math.round(dpi)));
  for (let i = 2; i < a.length - 18; i++) {
    if (
      a[i] === 0xff &&
      a[i + 1] === 0xe0 &&
      a[i + 4] === 0x4a &&
      a[i + 5] === 0x46 &&
      a[i + 6] === 0x49 &&
      a[i + 7] === 0x46 &&
      a[i + 8] === 0
    ) {
      a[i + 11] = 1;
      a[i + 12] = (d >> 8) & 255;
      a[i + 13] = d & 255;
      a[i + 14] = (d >> 8) & 255;
      a[i + 15] = d & 255;
      break;
    }
  }
  return new Blob([a], { type: "image/jpeg" });
}
