export function pdfFromScene({ design, scene }) {
  const enc = new TextEncoder(),
    chunks = [],
    offsets = [0];
  let length = 0;
  const add = (v) => {
    const b = typeof v === "string" ? enc.encode(v) : v;
    chunks.push(b);
    length += b.length;
  };
  const color = (value) => {
    const source = String(value ?? "").trim();
    let hex = source.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
    if (hex) {
      if (hex.length <= 4) hex = [...hex].map((v) => v + v).join("");
      return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    }

    const rgb = source.match(/^rgba?\((.*)\)$/i);
    if (rgb) {
      const channels = rgb[1].trim().replace(/\s*\/\s*/, " ").split(/[\s,]+/);
      if (channels.length >= 3) {
        return channels.slice(0, 3).map((channel) => {
          const percent = channel.endsWith("%");
          const number = Number(percent ? channel.slice(0, -1) : channel);
          if (!Number.isFinite(number)) throw new Error(`Unsupported PDF color: ${source}`);
          return Math.max(0, Math.min(255, percent ? number * 2.55 : number)) / 255;
        });
      }
    }
    throw new Error(`Unsupported PDF color: ${source || "(empty)"}`);
  };
  const rgb = (v, op) =>
    color(v)
      .map((x) => x.toFixed(4))
      .join(" ") + ` ${op}\n`;
  const pdfPath = (d) =>
    d
      .replace(
        /([ML])\s*([-+\de.E]+)\s+([-+\de.E]+)/g,
        (_, c, x, y) => `${x} ${y} ${c === "M" ? "m" : "l"}`,
      )
      .replace(/\bZ\b/g, "h");
  const pdfText = (v) =>
    String(v)
      .replace(/[\\()]/g, "\\$&")
      .replace(
        /[^\x20-\x7e]/g,
        (c) =>
          ({
            ν: "v",
            Δ: "D",
            "×": "x",
            "−": "-",
            "–": "-",
            "—": "-",
            "²": "2",
            "³": "3",
          })[c] ||
          (() => {
            throw new Error(
              "PDF vector text contains unsupported Unicode; export SVG for this label",
            );
          })(),
      );
  let ops = `q 0.75 0 0 -0.75 0 ${(design.height * 0.75).toFixed(3)} cm\n`;
  for (const o of scene) {
    ops += "q\n";
    if (o.clip) ops += `${pdfPath(o.clip.d)} W n\n`;
    if (o.type === "path") {
      if (o.fill) ops += rgb(o.fill, "rg");
      if (o.stroke) {
        ops += rgb(o.stroke, "RG") + `${o.width} w\n`;
        ops += o.dash.length ? `[${o.dash.join(" ")}] 0 d\n` : "[] 0 d\n";
      }
      ops += `${pdfPath(o.d)} ${o.fill && o.stroke ? "B" : o.fill ? "f" : "S"}\n`;
    } else {
      const size = Number(o.font.match(/([\d.]+)px/)?.[1] || 12),
        [a, b, c, d, e, f] = o.m;
      ops +=
        rgb(o.fill, "rg") +
        `BT /F1 ${size} Tf ${a} ${b} ${-c} ${-d} ${a * o.x + c * o.y + e} ${b * o.x + d * o.y + f} Tm (${pdfText(o.text)}) Tj ET\n`;
    }
    ops += "Q\n";
  }
  ops += "Q\n";
  const stream = enc.encode(ops);
  add("%PDF-1.4\n");
  const obj = (n, body) => {
    offsets[n] = length;
    add(`${n} 0 obj\n${body}\nendobj\n`);
  };
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${(design.width * 0.75).toFixed(3)} ${(design.height * 0.75).toFixed(3)}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
  );
  offsets[4] = length;
  add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n`);
  add(stream);
  add("\nendstream\nendobj\n");
  obj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const xref = length;
  add("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++)
    add(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: "application/pdf" });
}
