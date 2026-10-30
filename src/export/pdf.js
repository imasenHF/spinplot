export async function pdfFromCanvas({ canvas, design, dpi, quality = 0.98 }) {
  if (!canvas || !design?.width || !design?.height) {
    throw new Error("PDF export requires a rendered canvas and design dimensions");
  }
  const jpeg = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode PDF page image"))),
      "image/jpeg",
      quality,
    );
  });
  const image = new Uint8Array(await jpeg.arrayBuffer());
  if (
    image.length < 4 ||
    image[0] !== 0xff ||
    image[1] !== 0xd8 ||
    image.at(-2) !== 0xff ||
    image.at(-1) !== 0xd9
  ) {
    throw new Error("Canvas did not produce a valid JPEG image for PDF export");
  }

  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let length = 0;
  const add = (value) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id, body) => {
    offsets[id] = length;
    add(`${id} 0 obj\n${body}\nendobj\n`);
  };

  const pageWidth = (design.width * 72) / 96;
  const pageHeight = (design.height * 72) / 96;
  const pixelWidth = canvas.width;
  const pixelHeight = canvas.height;
  const content = encoder.encode(
    `q\n${pageWidth.toFixed(3)} 0 0 ${pageHeight.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`,
  );

  add("%PDF-1.4\n%âãÏÓ\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(3)} ${pageHeight.toFixed(3)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );

  offsets[4] = length;
  add(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
  );
  add(image);
  add("\nendstream\nendobj\n");

  offsets[5] = length;
  add(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`);
  add(content);
  add("endstream\nendobj\n");

  const xref = length;
  add("xref\n0 6\n0000000000 65535 f \n");
  for (let id = 1; id <= 5; id++) {
    add(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  add(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  );
  return new Blob(chunks, { type: "application/pdf" });
}
