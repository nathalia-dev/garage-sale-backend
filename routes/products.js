"use strict";

/** Routes for products. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureCorrectUser, ensureCorrectUserWithApiCall } = require("../middleware/auth");
const { BadRequestError, UnauthorizedError } = require("../expressError");
const Product = require("../models/products");
const productNewSchema = require("../schemas/productNew.json");
const productUpdateSchema = require("../schemas/productUpdate.json");
const productPhotoNewSchema = require("../schemas/productPhotoNew.json");

const router = express.Router();

/** POST products/ { product }  => { product }
 *
 * Adds a new product.
 *
 * This returns the newly created product:
 *  {product: { id, userId, productName, price, quantity, description, productStatusId  }
 *
 * Authorization required: The product must belong to the same user as the logged in user
 **/

router.post("/products", ensureCorrectUser, async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, productNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const product = await Product.create(req.body);
		return res.status(201).json({ product });
	} catch (err) {
		return next(err);
	}
});

/** GET products/ => { products: [ {id, userId, productName, price, quantity, description, productStatusId }, ... ] }
 *
 * Returns list of all products.
 *
 * Can provide search filter in query:
 * - userId
 * - productName (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 **/

router.get("/products", async function (req, res, next) {
	const q = req.query;

	if (q.userId !== undefined) q.userId = +q.userId;

	try {
		const products = await Product.findAll(q);
		return res.json({ products });
	} catch (err) {
		return next(err);
	}
});

/** GET products/status => { products: [ {id, status }, ... ] }
 *
 * Returns list of all product status.
 *
 * Authorization required: none
 **/


router.get("/products/status", async function (req,res,next) {
	try {

		const productStatus = await Product.getAllProductStatus()
		return res.json({ productStatus })

	} catch(err) {
		return next();
	}
})

/** GET products/[product_id] => {product: { id, userId, productName, price, quantity, description, productStatusId  } }
 *
 * Returns the specific product
 *
 * Authorization required: none
 **/

router.get("/products/:product_id", async function (req, res, next) {
	try {
		const product = await Product.get(req.params.product_id);
		return res.json({ product });
	} catch (err) {
		return next(err);
	}
});

/** PATCH products/[product_id] { product } => { product }
 *
 * Data can include:
 *   { productName, price, quantity, description, productStatusId }
 *
 * Returns { id, userId, productName, price, quantity, description, productStatusId }
 *
 * Authorization required: The product must belong to the same user as the logged in user
 **/

router.patch("/products/:product_id", ensureCorrectUserWithApiCall(Product, "product_id"), async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, productUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const updatedProduct = await Product.update(req.params.product_id, req.body);
		return res.json({ updatedProduct });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /products/[product_id]  =>  { deleted: id }
 *
 * Authorization required: The product must belong to the same user as the logged in user
 */

router.delete("/products/:product_id", ensureCorrectUserWithApiCall(Product, "product_id"), async function (req, res, next) {
	try {
		await Product.softRemove(req.params.product_id);
		return res.json({ deactivated: +req.params.product_id });
	} catch (err) {
		return next(err);
	}
});



/********** ROUTES FOR PRODUCT PHOTOS ***********/



/** POST product/:product_id/photos { photo }  => { photo }
 *
 * Adds a new photo.
 *
 * This returns the newly created photo:
 *  {productPhoto: { id, productId, path  }
 *
 * Authorization required: The product must belong to the same user as the logged in user
 **/

router.post("/products/:product_id/photos", ensureCorrectUserWithApiCall(Product, "product_id"), async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, productPhotoNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		//cheking if the body has the same productId that is in our url param (product_id).
		if (String(req.body.productId) !== req.params.product_id) {
			throw new UnauthorizedError();
		}

		const productPhoto = await Product.addProductPhoto(req.body);
		return res.status(201).json({ productPhoto });
	} catch (err) {
		return next(err);
	}
});

/** GET /products/:product_id/photos => { productPhoto: [ {id, productId, path }, ... ] }
 *
 * Returns list of ALL photos for that specific product.
 *
 * Authorization required: none
 **/

router.get("/products/:product_id/photos", async function (req, res, next) {
	try {
		const productPhotos = await Product.findAllProductPhotos(req.params.product_id);
		return res.json({ productPhotos });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /products/:product_id/photos  =>  { deletedAllProductPhotos: productId }
 *
 * Removing ALL the photos for that specific product.
 *  
 * Authorization required: The product must belong to the same user as the logged in user
 */

router.delete("/products/:product_id/photos", ensureCorrectUserWithApiCall(Product, "product_id"), async function (req, res, next) {
	try {
		await Product.removeAllProductPhotos(req.params.product_id);
		return res.json({ deletedAllProductPhotos: `ProductId: ${+req.params.product_id}` });
	} catch (err) {
		return next(err);
	}
});

/** GET /products/:product_id/photos/:photo_id => {productPhoto: { id, productId, path  } }
 *
 * Returns the specific product photo.
 *
 * Authorization required: none
 **/

 router.get("/products/:product_id/photos/:photo_id", async function (req, res, next) {
	try {
		const productPhoto = await Product.getProductPhoto(req.params.photo_id);

		//cheking if the param product_id matches with the photo productId.
		if(String(productPhoto.productId) !== req.params.product_id) {
			throw new BadRequestError();
		}

		return res.json({ productPhoto });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /products/:product_id/photos/:photo_id  =>  { deletedProductPhoto: photoId}
 *
 * Removing just the specific photo.
 * 
 * Authorization required: The product must belong to the same user as the logged in user
 */

 router.delete("/products/:product_id/photos/:photo_id", ensureCorrectUserWithApiCall(Product, "product_id"), async function (req, res, next) {
	try {
		const productPhoto = await Product.getProductPhoto(req.params.photo_id)

		//cheking if the param product_id matches with the photo productId.
		if(String(productPhoto.productId) !== req.params.product_id) {
			throw new BadRequestError();
		}

		await Product.removeProductPhoto(req.params.photo_id);
		return res.json({ deletedProductPhoto: +req.params.photo_id });
	} catch (err) {
		return next(err);
	}
});




module.exports = router;
