const fs = require("fs");
const AWS = require("aws-sdk");
require("aws-sdk/lib/maintenance_mode_message").suppress = true; // using when use to javascript

AWS.config.update({
    credentials: {
        accessKeyId: process.env.S3_KEY,
        secretAccessKey: process.env.S3_SECRET,
    },
    region: process.env.S3_REGION,
});

async function downloadFileFromS3(bucketName, key, localPath) {
    const s3 = new AWS.S3();
    const params = {
        Bucket: bucketName,
        Key: key,
    };

    const { Body } = await s3.getObject(params).promise();
    fs.writeFileSync(localPath, Body, "utf8");

    console.log(`Downloaded PDF file: ${localPath}`);
}

const updateS3Object = async (bucketName, objectKey, updatedContent) => {
    const s3 = new AWS.S3();

    fs.readFile(updatedContent, async (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        }

        const params = {
            Bucket: bucketName,
            Key: objectKey,
            Body: data,
            ACL: "public-read",
        };

        try {
            await s3.putObject(params).promise();
            console.log(`Object with key "${objectKey}" updated successfully.`);
        } catch (error) {
            console.error("Error updating object:", error);
        }
    });
};

module.exports = {
    downloadFileFromS3,
    updateS3Object,
};
