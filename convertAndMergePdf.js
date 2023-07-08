const fs = require("fs");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

async function convertImageToPdf(pdfDoc, path) {
  const imageBytes = fs.readFileSync(path);
  const image = await pdfDoc.embedJpg(imageBytes); // Change to embedPng for PNG images, or use embedJpg for JPEG images
  const imageDims = image.scaleToFit(
    pdfDoc.getPage(0).getWidth(),
    pdfDoc.getPage(0).getHeight()
  );

  const page = pdfDoc.addPage();
  const { width, height } = imageDims;
  const x = (pdfDoc.getPage(0).getWidth() - width) / 2;
  const y = (pdfDoc.getPage(0).getHeight() - height) / 2;

  page.drawImage(image, {
    x,
    y,
    width,
    height,
  });
}

async function convertAndMergePDFs(
  pdfFilePath1,
  documentsPath,
  mergedPdfFilePath
) {
  const data = [];

  for (let i = 0; i < documentsPath.length; i++) {
    const fileData = documentsPath[i];

    for (let j = 0; j < fileData.files.length; j++) {
      data.push(fileData.files[j]);
    }
  }

  const pdfDoc = await PDFDocument.create();

  const pdfBytes1 = fs.readFileSync(await pdfFilePath1);
  const pdf1 = await PDFDocument.load(pdfBytes1);
  const [pdf1Page] = await pdfDoc.copyPages(pdf1, [0]);
  pdfDoc.addPage(pdf1Page);

  //if multiple pdf generated, eg: created multiple html files and prior pdf convertion to merging
  //  for (const path of filePaths) {
  //   const pdfBytes = fs.readFileSync(path);
  //   const pdf = await PDFDocument.load(pdfBytes);
  //   const [pdf1Page] = await pdfDoc.copyPages(pdf, [0]);
  //   pdfDoc.addPage(pdf1Page);
  // }

  for (const d of data) {
    if (fs.existsSync(d.path)) {
      if (d.mimetype === "application/pdf") {
        const pdfBytes2 = fs.readFileSync(d.path);
        const pdf2 = await PDFDocument.load(pdfBytes2);
        const [pdf2Page] = await pdfDoc.copyPages(pdf2, [0]);
        pdfDoc.addPage(pdf2Page);
      } else {
        await convertImageToPdf(pdfDoc, d.path);
      }
    }
  }

  const mergedPdfBytes = await pdfDoc.save();

  fs.writeFileSync(mergedPdfFilePath + ".pdf", mergedPdfBytes);
  console.log("PDF merging completed.");
  return mergedPdfFilePath + ".pdf";
}

module.exports = convertAndMergePDFs;
