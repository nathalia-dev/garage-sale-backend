require('dotenv').config()

const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey =process.env.AWS_SECRET_KEY

const s3 = new S3({
    region,
    accessKeyId,
    secretAccessKey
})

//uploads a file to S3 --> to my app , it needs to return the image Key
//min 20:48 do video,  mostra o obj que retorna da promise. {Etag, Location, key, Key, Bucket} --> os dois keys sao iguais. 
//pelo app do cara, usaria o que retorna da funciton uploadFile , ".key".
// entao seria res = await uploadFile(req.body.something) --- res.key

// o que preciso entender agora é : quando colocamos num formulario um file input... o que vem no body?
//isso para poder entender essas coisas que ele ta pegando aqui no uploadFile, como file.path e fileName
// outra coisa, tem que usar multer? ver codigo min 18:32

//https://www.youtube.com/watch?v=NZElg91l_ms&ab_channel=SamMeech-Ward

function uploadFile(file) {
    console.log("file" ,file)
    const fileStream = fs.createReadStream(file.path)

    const uploadParams = {
        Bucket: bucketName,
        Body: fileStream,
        Key: file.filename
    }

    return s3.upload(uploadParams).promise();

}

function getFileStream(fileKey) {
    console.log(fileKey)
    const downloadParams = {
        Key: fileKey,
        Bucket: bucketName
    }
    
    return s3.getObject(downloadParams).createReadStream()
}

module.exports ={ uploadFile, getFileStream }