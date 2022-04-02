const express = require("express");
const { BadRequestError } = require("../expressError");
const fs = require('fs');
const util = require('util')
const unlinkFile = util.promisify(fs.unlink)

const {checkFileType} = require("../helpers/checkFileType")

const multer = require("multer")
const upload = multer({ dest: 'uploads/', fileFilter: function (_req, file, cb) {
	checkFileType(file, cb)
} })
const {uploadFile, getFileStream, deleteFile} = require( "../s3")


const router = express.Router();

router.post("/", upload.single('photo'), async function (req, res, next) {
	try {
        const file = req.file

		//file.path validation
		if(!file?.path) {
			throw new BadRequestError("The file you are trying to upload is incomplete: missing file.path")
		}

		const result = await uploadFile(file)

		//after the upload to s3 bucket, delete the file from server's uploads folder.
		await unlinkFile(file.path)
		return res.json({photoId: result.Key});
	} catch (err) {
		const file = req.file
		if(file?.path) {
			//if an error occur to the upload to s3 bucket, delete the file from server's uploads folder.
			await unlinkFile(file.path)
		}
		return next(err);
	}
});

router.get("/:photo_key", async function (req, res, next) {
	try {
		const photoKey = req.params.photo_key
		const readSream = getFileStream(photoKey)
		readSream.pipe(res)
	} catch (err) {
		return next(err);
	}
});

router.delete("/:photo_key", async function (req, res, next) {
	try {
		
		const photoKey = req.params.photo_key
		const resDeletePhoto = await deleteFile(photoKey)

		return res.json({"deleted":photoKey})
	} catch(err) {
		return next(err)
	}
})

module.exports = router;