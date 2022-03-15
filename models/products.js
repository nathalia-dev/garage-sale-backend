"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError, BadRequestError } = require("../expressError");

class Product {
	/** Create a product (from data), update db, return new product data.
	 *
	 * data should be { userId, productName, price, quantity, description, productStatusId }
	 *
	 * Returns { id, userId, productName, price, quantity, description, productStatusId }
	 **/

	static async create({ userId, productName, price, quantity, description }) {

		const productStatusId = await this.getCorrectProductStatus(quantity)

		const result = await db.query(
			`INSERT INTO products (user_id,
                                  product_name,
                                  price,
                                  quantity,
                                  description,
                                  product_status_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, user_id AS "userId", product_name AS "productName", price, quantity, description, product_status_id AS "productStatusId"`,
			[userId, productName, price, quantity, description, productStatusId]
		);

		const product = result.rows[0];

		return product;
	}

	/** Given a productId, return data about product.
	 *
	 * Returns { id, userId, productName, price, quantity, description, productStatusId, photos }
	 *	where photos is [photoId, ...]
	 * Throws NotFoundError if not found.
	 **/

	static async get(productId) {
		const productRes = await db.query(
			`SELECT products.id,
                    user_id AS "userId",
                    product_name as "productName",
                    price,
                    quantity,
                    description,
                    product_status.status
            FROM products
			INNER JOIN product_status ON Products.product_status_id=product_status.id
            WHERE products.id = $1 `,
			[productId]
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
	 * Returns [{ id, user_id, product_name, price, quantity, description, product_status_id }, ...]
	 **/

	static async findAll({ userId, productName } = {}) {
		let query = `SELECT products.id,
					          user_id AS "userId",
					  		  product_name as "productName",
					          price,
					          quantity,
					          description,
					          product_status.status
			           FROM products
					   INNER JOIN product_status ON Products.product_status_id=product_status.id`;

		let whereExpressions = [];
		let queryValues = [];

		if (userId !== undefined) {
			queryValues.push(userId);
			whereExpressions.push(`user_id = $${queryValues.length}`);
		}

		if (productName !== undefined) {
			queryValues.push(`%${productName}`);
			whereExpressions.push(`product_name ILIKE $${queryValues.length}`);
		}

		if (whereExpressions.length > 0) {
			query += " WHERE " + whereExpressions.join(" AND ");
		}

		query += " ORDER BY id";
		const productsRes = await db.query(query, queryValues);

		return productsRes.rows;
	}

	/** Update product data with `data`.
	 *
	 * This is a "partial update" --- it's fine if data doesn't contain
	 * all the fields; this only changes provided ones.
	 *
	 * Data can include:
	 *   { productName, price, quantity, description, productStatusId }
	 *
	 * Returns { id, productName, price, quantity, description, productStatusId }
	 *
	 * Throws NotFoundError if not found.
	 *
	 */

	static async update(productId, data) {

		if (data.quantity >= 0) {
			data.productStatusId = await this.getCorrectProductStatus(data.quantity)
		}

		const { setCols, values } = sqlForPartialUpdate(data, {
			productName: "product_name",
			productStatusId: "product_status_id"
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
                                        product_status_id AS "productStatusId"`;

		const result = await db.query(querySql, [...values, productId]);
		const product = result.rows[0];

		if (!product) throw new NotFoundError(`No product: ${productId}`);

		return product;
	}

	/** Delete given product from database; returns undefined.
	 * 
	 * First check if the product has ever been sold. If true, will return a BadRequestError.
	 * 
	 * Throws NotFoundError if product not found.
	 **/

	static async remove(productId) {

		const productHasBeenSold = await this.hasEverBeenSold(productId)

		if (productHasBeenSold) throw new BadRequestError(`You can't delete ${productId}.`)

		const result = await db.query(
			`DELETE
				   FROM products
				   WHERE id = $1
				   RETURNING id`,
			[productId]
		);
		const product = result.rows[0];

		if (!product) throw new NotFoundError(`No product: ${productId}`);
	}

	/** Checking if the product is on product_orders table; returns a boolean.
	*
	**/

	static async hasEverBeenSold(productId) {

		const result = await db.query(`SELECT id 
											FROM product_orders 
											WHERE product_id = $1`, [productId]);
		
		if (result.rows.length > 0){
			return true
		}

		return false
	}

    /** Checking if the product has a specific quantity; returns a boolean.
	*
	**/

	static async hasQuantity(productId, quantity) {
		const result = await db.query(`SELECT quantity FROM products WHERE id = $1`, [productId])
		if(result.rows[0].quantity < quantity) {
			return false
		}

		return true
	}

	/** MODELS FOR PRODUCT STATUS */

	static async getAllProductStatus() {
		const productsStatus = await db.query(`SELECT id, status
												  FROM product_status`);
		return productsStatus.rows;
	}

	static async getProductStatusByName(name) {
		const productsStatus = await db.query(`SELECT id, status
												FROM product_status
												WHERE status = $1`, [name]);
		return productsStatus.rows[0].id;
	}

	static async getCorrectProductStatus(quantity) {

		let productStatus = this.getProductStatusByName("available")

		if (Number(quantity) === 0) {
			productStatus = this.getProductStatusByName("out of stock")
		}

		return productStatus
	}

	/** MODELS FOR PRODUCT PHOTOS */

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

	//maybe here return only the paths? files key? 
	static async findAllProductPhotos(productId) {
		const productPhotosRes = await db.query(
			`SELECT id,
					path
            FROM product_photos
            WHERE product_id = $1`,
			[productId]
		);
		return productPhotosRes.rows;
	}

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
