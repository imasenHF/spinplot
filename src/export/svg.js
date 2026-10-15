export function svgFromScene({ design, scene }) {
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const clips = new Map(),
    defs = [],
    idFor = (clip) => {
      if (!clip) return "";
      if (!clips.has(clip.d)) {
        const id = "clip" + clips.size;
        clips.set(clip.d, id);
        defs.push(`<clipPath id="${id}"><path d="${esc(clip.d)}"/></clipPath>`);
      }
      return ` clip-path="url(#${clips.get(clip.d)})"`;
    };
  const body = scene
    .map((o) => {
      const clip = idFor(o.clip);
      if (o.type === "path")
        return `<path d="${esc(o.d)}"${o.fill ? ` fill="${esc(o.fill)}"` : ' fill="none"'}${o.stroke ? ` stroke="${esc(o.stroke)}" stroke-width="${o.width}"${o.dash.length ? ` stroke-dasharray="${o.dash.join(" ")}"` : ""}` : ""}${clip}/>`;
      return `<text x="${o.x}" y="${o.y}" transform="matrix(${o.m.join(" ")})" fill="${esc(o.fill)}" style="font:${esc(o.font)}"${clip}>${esc(o.text)}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${design.width}" height="${design.height}" viewBox="0 0 ${design.width} ${design.height}"><defs>${defs.join("")}</defs>${body}</svg>`;
}
