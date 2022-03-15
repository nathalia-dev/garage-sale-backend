const express = require("express");

const fs = require('fs');
const util = require('util')
const unlinkFile = util.promisify(fs.unlink)

const multer = require("multer")
const upload = multer({ dest: 'uploads/' })
const {uploadFile, getFileStream} = require( "../s3")

const router = express.Router();

router.post("/", upload.single('photo'), async function (req, res, next) {
	try {
        const file = req.file
		const result = await uploadFile(file)
		//after the upload to s3 bucket, delete the file from server's uploads folder.
		await unlinkFile(file.path)
		return res.json({photoId: result.Key});
	} catch (err) {
		const file = req.file
		//if an error occur to the upload to s3 bucket, delete the file from server's uploads folder.
		await unlinkFile(file.path)
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

module.exports = router;