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
