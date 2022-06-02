"use strict";

/** Routes for orders. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn } = require("../middleware/auth");
const { BadRequestError, UnauthorizedError } = require("../expressError");
const Order = require("../models/orders");
const Product = require("../models/products");

const router = express.Router();

/** POST /order/{ cart }  => { cart }
 *
 * Adds a new order.
 *
 * This returns the newly created order:
 *
 *  {newOrder: `Order ${orderId} sucessfuly created.`  }
 *
 * Authorization required: logged in user.
 **/

router.post("/checkout", async function (req, res, next) {
	try {
		const cart = req.body.cart;

		//verifications for checkout

		for (let item of cart) {
			//check if the userId from the cart is the same as the logged in user
			if (String(item.userId) !== res.locals.user.id) {
				throw new UnauthorizedError("Cart belongs to another user.");
			}

			//check if the quantity requested for each product exists.
			let hasQuantity = await Product.hasQuantity(item.productId, item.quantityRequested);
			let isProductActive = await Product.isProductActive(item.productId);
			if (!hasQuantity) {
				throw new BadRequestError(`The product ${item.productId} does not have the requested quantity.`);
			}
			if (!isProductActive) {
				throw new BadRequestError(`The product ${item.productName} - ID ${item.productId} is no longer available. Please delete it from your cart to proceed to checkout`);
			}
		}

		const newOrder = await Order.create(cart);
		return res.status(201).json({ newOrder });
	} catch (err) {
		return next(err);
	}
});

/** GET orders/buyer => { orders: [ {id, date, buyerId, transactionId, total, products }, ... ] }
 *
 * where products are: [{ productId, name, seller, quantity, total}, ...]
 *
 * Returns a list of all orders, with details of each product envolved, that the user was the buyer.
 *
 * Authorization required: logged in user.
 **/

router.get("/orders/buyer", async function (req, res, next) {
	try {
		const orders = await Order.getOrdersForBuyer(res.locals.user.id);
		return res.json({ orders });
	} catch (err) {
		return next(err);
	}
});

/** GET orders/seller => { orders: [ {id, date, buyerId, transactionId, products }, ... ] }
 *
 * where products are: [{ productId, name, seller, quantity, total}, ...]
 *
 * Returns a list of all orders, with details of each product envolved, that the user was the seller.
 *
 * Authorization required: logged in user.
 **/

router.get("/orders/seller", async function (req, res, next) {
	try {
		const orders = await Order.getOrdersForSeller(res.locals.user.id);
		return res.json({ orders });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
