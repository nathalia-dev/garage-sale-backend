const { BadRequestError } = require("../expressError");

function checkImageFileType(file, cb) {
	const filetypes = /jpeg|jpg|png|gif/;
	const mimetype = filetypes.test(file.mimetype);

	if (mimetype) {
		return cb(null, true);
	} else {
		cb(new BadRequestError("Only images are accepted (jpg, jpeg, png, gif)."));
	}
}

module.exports = { checkImageFileType };
