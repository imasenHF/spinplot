import { jsPDF } from "jspdf";
import "svg2pdf.js";

export function pdfPageDimensions(design) {
  const width = Number(design?.width);
  const height = Number(design?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("PDF export requires positive design dimensions");
  }
  return {
    width: (width * 72) / 96,
    height: (height * 72) / 96,
  };
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

  const doc = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "pt",
    format: [width, height],
    compress: false,
    precision: 12,
    putOnlyUsedFonts: true,
  });
  doc.setProperties({
    title: "SpinPlot figure",
    subject: "Vector scientific plot exported from SpinPlot",
    creator: "SpinPlot",
  });

  await doc.svg(root, { x: 0, y: 0, width, height });
  return doc.output("blob");
}
