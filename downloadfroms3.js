// This code snippet defines a function called `convertAndMergePDFs` that takes in the paths of multiple PDF and image files, merges them into a single PDF document, and saves the merged PDF file. It uses the `pdf-lib` library to
const fs = require("fs")
const { PDFDocument } = require("pdf-lib")
const AWS = require("aws-sdk")
require("aws-sdk/lib/maintenance_mode_message").suppress = true // using when use to javascript

AWS.config.update({
    credentials: {
        accessKeyId: process.env.S3_KEY,
        secretAccessKey: process.env.S3_SECRET,
    },
})

async function downloadFileFromS3(bucketName, key, localPath) {
    const s3 = new AWS.S3()
    const params = {
        Bucket: bucketName,
        Key: key,
    }

    const { Body } = await s3.getObject(params).promise()
    fs.writeFileSync(localPath, Body, "utf8")

    console.log(`Downloaded PDF file: ${localPath}`)
}

async function convertImageToPdf(pdfDoc, path) {
    const imageBytes = fs.readFileSync(path)
    const image = await pdfDoc.embedJpg(imageBytes) // Change to embedPng for PNG images, or use embedJpg for JPEG images
    const imageDims = image.scaleToFit(pdfDoc.getPage(0).getWidth(), pdfDoc.getPage(0).getHeight())

    const page = pdfDoc.addPage()
    const { width, height } = imageDims
    const x = (pdfDoc.getPage(0).getWidth() - width) / 2
    const y = (pdfDoc.getPage(0).getHeight() - height) / 2

    page.drawImage(image, {
        x,
        y,
        width,
        height,
    })
}

async function convertAndMergePDFs(filePaths, documentsPath, mergedPdfFilePath) {
    const data = []

    for (let i = 0; i < documentsPath?.length; i++) {
        const fileData = documentsPath[i]

        for (let j = 0; j < fileData?.files?.length; j++) {
            data.push(fileData.files[j])
        }
    }

    const pdfDoc = await PDFDocument.create()

    for (const path of filePaths) {
        const pdfBytes = fs.readFileSync(path)
        const pdf = await PDFDocument.load(pdfBytes)
        const [pdf1Page] = await pdfDoc.copyPages(pdf, [0])
        pdfDoc.addPage(pdf1Page)
    }

    for (const d of data) {
        const awsFileKey = d?.path?.split(".com/")[1] // extract key from url

        await downloadFileFromS3(process.env.S3_BUCKET, awsFileKey, `${awsFileKey}`) // download files from s3 bucket

        if (fs.existsSync(`${awsFileKey}`)) {
            if (d.mimetype === "application/pdf") {
                const pdfBytes2 = fs.readFileSync(awsFileKey)
                const pdf2 = await PDFDocument.load(pdfBytes2)
                const [pdf2Page] = await pdfDoc.copyPages(pdf2, [0])
                pdfDoc.addPage(pdf2Page)
            } else {
                await convertImageToPdf(pdfDoc, awsFileKey)
            }
        }
        fs.unlinkSync(awsFileKey)
    }

    const mergedPdfBytes = await pdfDoc.save()

    fs.writeFileSync(mergedPdfFilePath + ".pdf", mergedPdfBytes)

    return mergedPdfFilePath + ".pdf"
}

module.exports = convertAndMergePDFs
