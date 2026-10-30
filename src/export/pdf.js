import { jsPDF } from "jspdf";
import "svg2pdf.js";

export async function pdfFromSvg({ svg, design }) {
  if (typeof svg !== "string" || !svg.trim() || !design?.width || !design?.height) {
    throw new Error("PDF export requires SVG markup and design dimensions");
  }
  if (typeof DOMParser === "undefined") {
    throw new Error("Vector PDF export requires a browser DOM");
  }

  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (parsed.querySelector("parsererror") || parsed.documentElement?.localName?.toLowerCase() !== "svg") {
    throw new Error("Could not parse the vector SVG for PDF export");
  }

  const pageWidth = (design.width * 72) / 96;
  const pageHeight = (design.height * 72) / 96;
  const doc = new jsPDF({
    unit: "pt",
    format: [pageWidth, pageHeight],
    orientation: pageWidth >= pageHeight ? "landscape" : "portrait",
    compress: true,
    putOnlyUsedFonts: true,
    floatPrecision: 16,
  });

  await doc.svg(parsed.documentElement, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  return doc.output("blob");
}
