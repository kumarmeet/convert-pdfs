// This code snippet defines a function called `convertAndMergePDFs` that takes in the paths of multiple PDF and image files, merges them into a single PDF document, and saves the merged PDF file. It uses the `pdf-lib` library to
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const { downloadFileFromS3 } = require("./downloadFileFromS3");

async function convertImageToPdf(pdfDoc, path) {
    try {
        const imageBytes = fs.readFileSync(path);

        // Detect image format based on file signature
        let image;
        let isValidImage = false;

        // Check for JPEG format
        if (imageBytes[0] === 0xFF && imageBytes[1] === 0xD8) {
            image = await pdfDoc.embedJpg(imageBytes);
            isValidImage = true;
        }

        // Check for PNG format
        if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4E && imageBytes[3] === 0x47) {
            image = await pdfDoc.embedPng(imageBytes);
            isValidImage = true;
        }

        if (isValidImage) {
            const imageDims = image.scaleToFit(pdfDoc.getPage(0).getWidth(), pdfDoc.getPage(0).getHeight());
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
        } else {
            console.error("Unsupported or invalid image format:", path);
        }
    } catch (error) {
        console.error("Error converting image to PDF:", error);
    }
}


async function convertAndMergePDFs(filePaths, documentsPath, mergedPdfFilePath) {
    const data = [];

    for (let i = 0; i < documentsPath?.length; i++) {
        const fileData = documentsPath[i];

        for (let j = 0; j < fileData?.files?.length; j++) {
            data.push(fileData.files[j]);
        }
    }

    const pdfDoc = await PDFDocument.create();

    // Merge pages from input PDFs
    for (const path of filePaths) {
        const pdfBytes = fs.readFileSync(path);
        const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

        // Copy all pages from the input PDF and add them to the merged PDF
        const pages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => {
            pdfDoc.addPage(page);
        });
    }

    // Merge images and other PDFs from data
    for (const d of data) {
        if (d) {
            const awsFileKey = d?.path?.split(".com/")[1]; // extract key from url
            const firstDecode = decodeURIComponent(awsFileKey);
            const secondDecode = firstDecode.replace(/\+/g, " ");

            console.log("decoded string", firstDecode);

            await downloadFileFromS3(process.env.S3_BUCKET, secondDecode, `${awsFileKey}`); // download files from S3 bucket

            if (fs.existsSync(`${awsFileKey}`)) {
                if (d.mimetype === "application/pdf") {
                    const pdfBytes2 = fs.readFileSync(awsFileKey);
                    const pdf2 = await PDFDocument.load(pdfBytes2, { ignoreEncryption: true });
                    const pages = await pdfDoc.copyPages(pdf2, pdf2.getPageIndices());
                    pages.forEach((page) => {
                        pdfDoc.addPage(page);
                    });
                } else {
                    await convertImageToPdf(pdfDoc, awsFileKey);
                }
            }
            fs.unlinkSync(awsFileKey);
        }
    }

    const mergedPdfBytes = await pdfDoc.save();

    fs.writeFileSync(mergedPdfFilePath + ".pdf", mergedPdfBytes);

    return mergedPdfFilePath + ".pdf";
}

module.exports = convertAndMergePDFs;
