"use strict";

const db = require("../db");
const { NotFoundError, BadRequestError } = require("../expressError");
const Product = require("../models/products");

class Cart {
	/** Create a cartItem (from data), update db, return new cartItem data.
	 *
	 * data should be { user_id, product_id, quantity, date }
	 *
	 * Returns { id, user_id, product_id, quantity, date }
	 **/

	static async createItem({ userId, productId, quantity }) {
		/** cheking if the product is still active. */
		const isProductActive = await Product.isProductActive(productId);
		if (isProductActive === false) throw new BadRequestError("This product is no longer available.");

		/** cheking if the productId is already in the user's cart. if it does, we are gonna update the item adding the quantity. Otherwise, we create a new cartItem. **/
		const productAlreadyInCart = await Cart.productAlreadyInCart(productId, userId);

		if (productAlreadyInCart.length > 0) {
			const qty = quantity + productAlreadyInCart[0].quantity;
			const updateItemRes = await Cart.update(productAlreadyInCart[0].id, qty);
			return updateItemRes;
		}
		//blocking the user from adding more quantity than there is available
		if (!(await Product.hasQuantity(productId, quantity))) throw new BadRequestError("Quantity not available.");

		const result = await db.query(
			`INSERT INTO cart  (user_id,
                                product_id,
                                quantity)
             VALUES ($1, $2, $3)
             RETURNING id, user_id AS "userId", product_id AS "productId", quantity, date`,
			[userId, productId, quantity]
		);

		const newCartItem = result.rows[0];

		return newCartItem;
	}

	/** Get all itens in the user's cart.
	 *
	 * It performs a ineer join to provide more info about the product.
	 *
	 * Returns [{ cart.id, userId, sellerId, productId, productName, price, quantityRequested, quantityAvailable, date, city, state, zipcode }, ...]
	 *
	 **/

	static async getAllItens(userId) {
		const allCartItems = await db.query(
			`SELECT cart.id,
					cart.user_id AS "userId",
					products.user_id AS "sellerId",
		  			product_id AS "productId",
					product_name AS  "productName",
					price,
					cart.quantity AS "quantityRequested",
					products.quantity AS "quantityAvailable",
				    date,
					city,
					state,
					zipcode
 			 FROM cart
			 INNER JOIN products ON cart.product_id = products.id
			 INNER JOIN address ON address.user_id = products.user_id
			 WHERE cart.user_id = $1 AND is_default = $2
			 ORDER By date`,
			[userId, true]
		);

		return allCartItems.rows;
	}

	/** Given a cartItem id, return data about cardItem.
	 *
	 * Returns { cart.id, userId, sellerId, productId, productName, price, quantityRequested, quantityAvailable, date }
	 *
	 * Throws NotFoundError if not found.
	 * (using this model for auth middleware "ensureCorrecUserWithApiCall" )
	 *
	 **/

	static async get(cartItemId) {
		const cartItemRes = await db.query(
			`SELECT cart.id,
					cart.user_id AS "userId",
					products.user_id AS "sellerId",
		  			product_id AS "productId",
					product_name AS  "productName",
					price,
					cart.quantity AS "quantityRequested",
					products.quantity AS "quantityAvailable",
				    date
 			  FROM cart
			  INNER JOIN products ON cart.product_id = products.id
			  WHERE cart.id = $1`,
			[cartItemId]
		);

		const cartItem = cartItemRes.rows[0];

		if (!cartItem) throw new NotFoundError(`No cartItem: ${cartItemId}`);
		return cartItem;
	}

	/** Update the quantity of a specific cartItem with `data`.
	 *
	 * Data can include:
	 *   { quantity }
	 *
	 * Returns { id, userId, productId, quantity, date }
	 *
	 * Throws NotFoundError if not found.
	 *
	 */

	static async update(cartItemId, quantity) {
		//getting productId to very the available quantity.
		const resProductId = await Cart.get(cartItemId);
		const productId = resProductId.productId;

		//blocking the user from adding more quantity than there is available
		if (!(await Product.hasQuantity(productId, quantity))) throw new BadRequestError("Quantity not available.");

		const result = await db.query(
			`UPDATE cart
                                       SET quantity = $1
                                       WHERE id = $2
									   RETURNING id,
									   user_id AS "userId",
		  							   product_id AS "productId",
									   quantity,
				   					   date `,
			[quantity, cartItemId]
		);

		const cartItem = result.rows[0];

		if (!cartItem) throw new NotFoundError(`No cartItem: ${cartItemId}`);

		return cartItem;
	}

	/** Delete given cartItem from database; returns undefined.
	 *
	 * Throws NotFoundError if cartItem not found.
	 **/

	static async remove(cartItemId) {
		const result = await db.query(
			`DELETE
			   FROM cart
			   WHERE id = $1
			   RETURNING id`,
			[cartItemId]
		);
		const cartItem = result.rows[0];

		if (!cartItem) throw new NotFoundError(`No cartItem: ${cartItemId}`);
	}

	/** Delete given productId from cart's table
	 * This productId will be deleted from all the carts;
	 * returns undefined.**/

	static async removeProductFromAllCarts(productId) {
		const result = await db.query(
			`DELETE
				FROM cart
				WHERE product_id = $1
				RETURNING id`,
			[productId]
		);
		const deletedProduct = result.rows[0];

		if (!deletedProduct) {
			return `The productId ${productId} was not found at Cart's table.`;
		}
	}

	/** Check if a specific product is already in the user's cart.
	 *
	 * If it does, the method returns an array with the cartItemId and quantity.
	 *
	 * Otherwise, it returns an empaty array.
	 **/

	static async productAlreadyInCart(productId, userId) {
		const result = await db.query(`SELECT id, quantity FROM cart WHERE product_id = $1 AND user_id = $2`, [productId, userId]);
		if (result.rows.length > 0) {
			console.log(result.rows);
			return result.rows;
		}
		return [];
	}
}

module.exports = Cart;
