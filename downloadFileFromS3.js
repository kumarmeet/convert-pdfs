const fs = require("fs")
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

module.exports = {
    downloadFileFromS3,
}
