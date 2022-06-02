"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError, BadRequestError } = require("../expressError");
const Address = require("../models/address");

class Product {
	/** Create a product (from data), update db, return new product data.
	 *
	 * data should be { userId, productName, price, quantity, description, productStatusId }
	 *
	 * Returns { id, userId, productName, price, quantity, description, productStatusId, photos }
	 *
	 * Where photos = [] (empty array).
	 **/

	static async create({ userId, productName, price, quantity, description }) {
		const userHasAddress = await Address.hasOneAddress(userId);

		if (!userHasAddress) {
			throw new BadRequestError("You can't add a product without an address. Please, first add an address to your profile and than create a product.");
		}
		const productStatusId = await this.getCorrectProductStatus(quantity);

		const result = await db.query(
			`INSERT INTO products (user_id,
                                  product_name,
                                  price,
                                  quantity,
                                  description,
								  active,
                                  product_status_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, user_id AS "userId", product_name AS "productName", price, quantity, description, product_status_id AS "productStatusId"`,
			[userId, productName, price, quantity, description, true, productStatusId]
		);

		const product = result.rows[0];
		product.photos = [];
		return product;
	}

	/** Given a productId, return data about product.
	 *
	 * Returns { id, userId, productName, price, quantity, description, active, productStatusId, address, city, state, zipcode, photos }
	 * where photos are {[id, path, productId...]}
	 * Throws NotFoundError if not found.
	 **/

	static async get(productId) {
		const productRes = await db.query(
			`SELECT products.id,
                    products.user_id AS "userId",
                    product_name as "productName",
                    price,
                    quantity,
                    description,
					active,
                    product_status.status,
					address,
					city,
					state,
					zipcode
            FROM products
			INNER JOIN product_status ON Products.product_status_id=product_status.id
			INNER JOIN address ON products.user_id = address.user_id
            WHERE products.id = $1 AND is_default = $2 `,
			[productId, true]
		);

		const product = productRes.rows[0];

		if (!product) throw new NotFoundError(`No product: ${productId}`);

		product.photos = await this.findAllProductPhotos(productId);

		return product;
	}

	/** Find all products (optional fiilter on searchFilters).
	 *
	 * searchFilters (all optional):
	 *
	 * - userId
	 * - productName (will find case-insensitive, partial matches)
	 *
	 * Returns [{ id, userId, productName, price, quantity, description, active, city, state, zipcode,  productStatusId }, ...]
	 **/

	static async findAll({ userId, productName } = {}) {
		let query = `SELECT products.id,
					          products.user_id AS "userId",
					  		  product_name as "productName",
					          price,
					          quantity,
					          description,
							  active,
							  city, 
							  state,
							  zipcode,
					          product_status.status
			           FROM products
					   INNER JOIN product_status ON Products.product_status_id=product_status.id
					   INNER JOIN address ON products.user_id = address.user_id`;

		let whereExpressions = [`active = $1`, `is_default =$2`];
		let queryValues = [true, true];

		if (userId !== undefined) {
			queryValues.push(userId);
			whereExpressions.push(`products.user_id = $${queryValues.length}`);
		}

		if (productName !== undefined) {
			queryValues.push(`%${productName}%`);
			whereExpressions.push(`product_name ILIKE $${queryValues.length}`);
		}

		if (whereExpressions.length > 0) {
			query += " WHERE " + whereExpressions.join(" AND ");
		}

		query += " ORDER BY id";
		const productsRes = await db.query(query, queryValues);
		const products = productsRes.rows;

		for (let prod of products) {
			prod.photos = await Product.findAllProductPhotos(prod.id);
		}
		return products;
	}

	/** Update product with `data`.
	 *
	 * This is a "partial update" --- it's fine if data doesn't contain
	 * all the fields; this only changes provided ones.
	 *
	 * Data can include:
	 *   { productName, price, quantity, description, productStatusId }
	 *
	 * Returns { id, userId, productName, price, quantity, description, active, productStatusId }
	 *
	 * Throws NotFoundError if not found.
	 *
	 */

	static async update(productId, data) {
		if (data.quantity >= 0) {
			data.productStatusId = await this.getCorrectProductStatus(data.quantity);
		}

		const { setCols, values } = sqlForPartialUpdate(data, {
			productName: "product_name",
			productStatusId: "product_status_id",
		});

		const idVarIdx = "$" + (values.length + 1);

		const querySql = `UPDATE products
                              SET ${setCols} 
                              WHERE id = ${idVarIdx} 
                              RETURNING id,
                                        user_id AS "userId", 
                                        product_name AS "productName", 
                                        price, 
                                        quantity, 
                                        description,
										active, 
                                        product_status_id AS "productStatusId"`;

		const result = await db.query(querySql, [...values, productId]);
		const product = result.rows[0];

		if (!product) throw new NotFoundError(`No product: ${productId}`);

		return product;
	}

	/** Soft delete method.
	 *
	 * Just update the product.active to false.
	 *
	 * return undefined.
	 *
	 **/

	static async softRemove(productId) {
		const updateRes = await Product.update(productId, { active: false });
		const deleteProductFromAllCarts = await db.query(
			`DELETE
				FROM cart
				WHERE product_id = $1
				RETURNING id`,
			[updateRes.id]
		);
	}

	/** Checking if the product has a specific quantity; returns a boolean.
	 *
	 **/

	static async hasQuantity(productId, quantity) {
		const result = await db.query(`SELECT quantity FROM products WHERE id = $1`, [productId]);
		if (result.rows[0].quantity < quantity) {
			return false;
		}

		return true;
	}

	/** Checking if the product is active: returns a boolean.
	 *
	 **/

	static async isProductActive(productId) {
		const result = await db.query(`SELECT active from products WHERE id = $1`, [productId]);
		if (result.rows[0].active === false) {
			return false;
		}
		return true;
	}

	/** MODELS FOR PRODUCT STATUS */

	/** Get all product status in db.
	 *
	 * Returns [{ id, status }, ...]
	 */

	static async getAllProductStatus() {
		const productsStatus = await db.query(`SELECT id, status
												  FROM product_status`);
		return productsStatus.rows;
	}

	/** Get a product status by name.
	 *
	 * Returns an id number;
	 */

	static async getProductStatusByName(name) {
		const productsStatus = await db.query(
			`SELECT id, status
												FROM product_status
												WHERE status = $1`,
			[name]
		);
		return productsStatus.rows[0].id;
	}

	/** Checking the productStatus accordingly to the quantity it has.
	 *
	 * Returns productStatusId number.
	 */

	static async getCorrectProductStatus(quantity) {
		let productStatus = Product.getProductStatusByName("available");

		if (Number(quantity) === 0) {
			productStatus = Product.getProductStatusByName("out of stock");
		}

		return productStatus;
	}

	/** MODELS FOR PRODUCT PHOTOS */

	/** Add a photo for a specific product in db.
	 *
	 * data should be {producId, path}
	 *
	 * Returns [{ id, productId, path }, ...]
	 */

	static async addProductPhoto({ productId, path }) {
		const result = await db.query(
			`INSERT INTO product_photos (product_id,path)
             VALUES ($1, $2)
             RETURNING id, product_id AS "productId", path`,
			[productId, path]
		);

		const productPhoto = result.rows[0];

		return productPhoto;
	}

	/** Get a productPhoto by photoId.
	 *
	 * Returns { id, productId, path }
	 */

	static async getProductPhoto(photoId) {
		const productPhotoRes = await db.query(
			`SELECT id,
                    product_id AS "productId",
					path
            FROM product_photos
            WHERE id = $1 `,
			[photoId]
		);

		const productPhoto = productPhotoRes.rows[0];

		if (!productPhoto) throw new NotFoundError(`No photo: ${photoId}`);

		return productPhoto;
	}

	/** Get all photos for that productId.
	 *
	 * Returns [{ id, productId, path }, ...]
	 */

	static async findAllProductPhotos(productId) {
		const productPhotosRes = await db.query(
			`SELECT id,
					path,
					product_id AS "productId"
            FROM product_photos
            WHERE product_id = $1`,
			[productId]
		);
		return productPhotosRes.rows;
	}

	/** Remove a productPhoto by photoId.
	 *
	 * If it doesn't find, throw and NotFoundError.
	 *
	 * Returns undefined
	 */

	static async removeProductPhoto(photoId) {
		const result = await db.query(
			`DELETE
				   FROM product_photos
				   WHERE id = $1
				   RETURNING id`,
			[photoId]
		);
		const photo = result.rows[0];

		if (!photo) throw new NotFoundError(`No photo: ${photoId}`);
	}

	static async removeAllProductPhotos(productId) {
		const result = await db.query(
			`DELETE
				   FROM product_photos
				   WHERE product_id = $1
				   RETURNING id`,
			[productId]
		);

		return result.rows;
	}
}

module.exports = Product;
