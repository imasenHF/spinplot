import { pdfPageDimensions } from "./pdf-utils.js";
import notoRegularUrl from "../assets/fonts/NotoSansSC-Regular.ttf?url";
import notoBoldUrl from "../assets/fonts/NotoSansSC-Bold.ttf?url";

let notoFontFilesPromise;

async function addUnicodeFont(doc) {
  if (!notoFontFilesPromise) {
    notoFontFilesPromise = Promise.all([notoRegularUrl, notoBoldUrl].map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not load the embedded Unicode font for PDF export");
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      return btoa(binary);
    }));
  }
  const [regular, bold] = await notoFontFilesPromise;
  doc.addFileToVFS("NotoSansSC-Regular.ttf", regular);
  doc.addFont("NotoSansSC-Regular.ttf", "NotoSansSC", "normal");
  doc.addFileToVFS("NotoSansSC-Bold.ttf", bold);
  doc.addFont("NotoSansSC-Bold.ttf", "NotoSansSC", "bold");
}

function prepareUnicodeText(root) {
  const textNodes = [...root.querySelectorAll("text")];
  const allText = textNodes.map((node) => node.textContent || "").join("");
  const hasUnicode = /[^\x00-\x7f]/.test(allText);
  if (!hasUnicode) return false;

  const namespace = "http://www.w3.org/2000/svg";
  for (const node of textNodes) {
    const value = node.textContent || "";
    if (!/[^\x00-\x7f]/.test(value)) continue;
    const bold = /\bbold\b/i.test(node.getAttribute("style") || "");
    const parts = value.match(/[^\x00-\x7f]+|[\x00-\x7f]+/g) || [];
    node.replaceChildren(...parts.map((part) => {
      const span = node.ownerDocument.createElementNS(namespace, "tspan");
      if (/[^\x00-\x7f]/.test(part)) {
        span.setAttribute("font-family", "NotoSansSC");
        if (bold) span.setAttribute("font-weight", "bold");
      }
      span.textContent = part;
      return span;
    }));
  }
  return true;
}


export async function pdfFromSvg({ svg, design }) {
  if (typeof svg !== "string" || !svg.trim()) {
    throw new Error("PDF export requires an SVG document");
  }
  const { width, height } = pdfPageDimensions(design);
  if (typeof DOMParser === "undefined") {
    throw new Error("PDF export requires a browser DOM parser");
  }

  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = parsed.documentElement;
  if (root?.localName !== "svg" || parsed.querySelector("parsererror")) {
    throw new Error("Could not parse the vector figure as SVG");
  }

  const needsUnicodeFont = prepareUnicodeText(root);
  const { jsPDF } = await import("jspdf");
  await import("svg2pdf.js");
  const doc = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "pt",
    format: [width, height],
    compress: false,
    precision: 12,
    putOnlyUsedFonts: true,
  });
  if (needsUnicodeFont) await addUnicodeFont(doc);
  doc.setProperties({
    title: "SpinPlot figure",
    subject: "Vector scientific plot exported from SpinPlot",
    creator: "SpinPlot",
  });

  await doc.svg(root, { x: 0, y: 0, width, height });
  return doc.output("blob");
}
