"use strict";

const db = require("../db");
const { NotFoundError, BadRequestError } = require("../expressError");
const Product = require("../models/products")

class Cart {
	/** Create a cartItem (from data), update db, return new cartItem data.
	 *
	 * data should be { user_id, product_id, quantity, date }
	 *
	 * Returns { id, user_id, product_id, quantity, date }
	 **/

	static async createItem({ userId, productId, quantity }) {

		//blocking the user from adding more quantity than there is available
		if (! await Product.hasQuantity(productId, quantity)) throw new BadRequestError("Quantity not available.")

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
	 * Returns [{ id, userId, productId, quantity, date }, ...]
	 *
	 **/

	static async getAllItens(userId) {
		const allCartItems = await db.query(
			`SELECT id,
					user_id AS "userId",
		  			product_id AS "productId",
					quantity,
				    date
 			 FROM cart
			 WHERE user_id = $1
			 ORDER By date`,
			[userId]
		);

		return allCartItems.rows;
	}


  /** Given a cartItem id, return data about cardItem.
   *
   * Returns { id, userId, productId, quantity, date }
   *
   * Throws NotFoundError if not found.
   * (using this model for auth middleware "ensureCorrecUserWithApiCall" )
   * 
   **/

	static async get(cartItemId) {
		const cartItemRes = await db.query(
			`SELECT id,
					user_id AS "userId",
		  			product_id AS "productId",
					quantity,
				    date
 			 FROM cart
			  WHERE id = $1`, [ cartItemId ]);
	
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
		const result = await db.query(`UPDATE cart
                                       SET quantity = $1
                                       WHERE id = $2
									   RETURNING id,
									   user_id AS "userId",
		  							   product_id AS "productId",
									   quantity,
				   					   date `, 
                                       [quantity, cartItemId]);

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
}

module.exports = Cart;
