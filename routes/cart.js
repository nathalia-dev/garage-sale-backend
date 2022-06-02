"use strict";

/** Routes for cart. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureCorrectUser, ensureCorrectUserWithApiCall } = require("../middleware/auth");
const { BadRequestError, UnauthorizedError } = require("../expressError");
const Cart = require("../models/cart");
const cartNewSchema = require("../schemas/cartNew.json");
const cartUpdateSchema = require("../schemas/cartUpdate.json");

const router = express.Router();

/** POST /cart { cartItem }  => { cartItem }
 *
 * Adds a new cartItem.
 *
 * This returns the newly created cartItem:
 *  {cartItem: { id, userId, productId, quantity, date  }
 *
 * Authorization required: The cart must belong to the same user as the logged in user
 **/

router.post("/", ensureCorrectUser, async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, cartNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const cartItem = await Cart.createItem(req.body);
		return res.status(201).json({ cartItem });
	} catch (err) {
		return next(err);
	}
});

/** GET /cart
 *
 * Find all the items at the user's cart.
 *
 * This returns:
 *  { cartItems: { id, userId, productId, quantity, date }, ... }
 *
 * Authorization required: The cart must belong to the same user as the logged in user
 *
 **/

router.get("/", async function (req, res, next) {
	try {
		const cartItems = await Cart.getAllItens(res.locals.user.id);
		return res.json({ cart: cartItems });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /cart/:cartItem_id { quantity } => { quantity }
 *
 * Data can include:
 *   { quantity }
 *
 * Returns { iid, userId, productId, quantity, date }
 *
 * Authorization required: The cart must belong to the same user as the logged in user
 **/

router.patch("/:cartItem_id", ensureCorrectUserWithApiCall(Cart, "cartItem_id"), async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, cartUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const updatedCartItem = await Cart.update(req.params.cartItem_id, req.body.quantity);
		return res.json({ updatedCartItem });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /cart/:cartItem_id  =>  { deleted:  cartItem  ${cartItem_id} }
 *
 * Authorization required: The cart must belong to the same user as the logged in user
 */

router.delete("/:cartItem_id", ensureCorrectUserWithApiCall(Cart, "cartItem_id"), async function (req, res, next) {
	try {
		await Cart.remove(req.params.cartItem_id);
		return res.json({ deleted: ` cartItem ${+req.params.cartItem_id}` });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
