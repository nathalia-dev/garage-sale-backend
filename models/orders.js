"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { NotFoundError, BadRequestError } = require("../expressError");
const Product = require("../models/products");
const Cart = require("../models/cart")

class Order {

	/** Create a Order (from data), update db (orders and product orders table), update the product quantity (products table) and return orderId.
	 *
	 * data should be { cartId, userId, productId, quantity, date }
	 *
	 * Returns { orderId }
	 **/

	static async create(cart) {
		//transaction id number generator
		const transactionId = uuidv4();
		let subtotal = 0;
		let userId;

		//sum of all products price
		for (let item of cart) {
			userId = Number(item.userId);
			const res = await Product.get(Number(item.productId));
			const productPrice = Number(res.price);

			subtotal += productPrice * Number(item.quantity);
		}

		//tax and shipment not implemented yet, so total is the same as subtotal
		const total = subtotal;

		//post order at orders table. Tax and shipment_price come as 0, by default.
		const resultOrder = await db.query(
			`INSERT INTO orders (buyer_id,
                                   transaction_id,
                                   subtotal,
                                   total)
                VALUES ($1, $2, $3, $4)
                RETURNING id`,
			[userId, transactionId, subtotal, total]
		);

		const orderId = resultOrder.rows[0].id;

		//if post at orders table failed.
		if (!orderId) {
			return `Unable to perform the checkout`;
		}

		//post into product_orders: need to iterate over each cartItem
		for (let item of cart) {
			const product = await Product.get(item.productId);
			const productPrice = product.price;

			const product_total = productPrice * Number(item.quantity);
			const resultProductOrder = await db.query(
				`INSERT INTO product_orders (order_id,
                                     product_id,
                                     quantity,
                                     total)
                  VALUES ($1, $2, $3, $4)
                  RETURNING id`,
				[orderId, item.productId, item.quantity, product_total]
			);

			//if the post at product_order table failed, we need to delete what we've done at orders table.
			if (resultProductOrder.rows.length === 0) {
				const deleteOrder = await db.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
				return `Unable to perform the checkout`;
			}
			//update product quantity.
			const newQuantity = product.quantity - Number(item.quantity);
			const updateQtyRes = await Product.update(product.id, { quantity: newQuantity });

			//if the quantity's update failed, we need to delete what we've done at orders and product_orders table.
			if (!updateQtyRes) {
				const deleteOrder = await db.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
				const deleteProductOrder = await db.query(`DELETE FROM product_orders WHERE order_id = $1`, [orderId]);
				return `Unable to perform the checkout`;
			}
			//cleaning the user's cart
			await Cart.remove(item.id)
		}

		return `Order ${orderId} sucessfuly created.`;
	}

	/** Find all orders that the user was the buyer.
	 *
	 * Returns [{ id, date, buyerId, transactionId, total, products }, ...]
	 * 
	 * where products is: [{producId, name, seller, quantity, total}, ...]
	 **/

	static async getOrdersForBuyer(userId) {
        //to find orders by buyer, we need to check the orders table.
		const resOrders = await db.query(`SELECT id,
                                                 date,
                                                 buyer_id as "buyerId",
                                                 transaction_id as "transactionId",
                                                 total
                                          FROM orders
                                          WHERE buyer_id = $1`,
			[userId]
		);
		const orders = resOrders.rows;

		if (orders.length === 0) throw new NotFoundError(`No orders found for buyer: ${userId}`);

        //for each order, get all the products envolved.
		for (let order of orders) {
			order.products = await this.getAllProductsFromOrder(order.id);
		}

		return orders;
	}

	/** Find all orders that the user was the seller.
	 *
	 * Returns [{ id, date, buyerId, transactionId, products }, ...]
	 * 
	 * where products is: : [{ producId, name, seller, quantity, total }, ...]
	 **/

	static async getOrdersForSeller(userId) {

        //to find orders by seller, we need to check the product_orders table and thought the produtId get the user(seller). 
		const resOrders = await db.query(`SELECT order_id AS "orderId"
                                          FROM product_orders
                                          INNER JOIN products ON product_orders.product_id = products.id
                                          WHERE products.user_id = $1`, [userId]);

		const resOrdersId = resOrders.rows;

        //if no ordersId were found for that user, return a message.
        if (resOrdersId.length === 0) throw new NotFoundError(`No orders found for seller: ${userId}`)

        //transforming the db result to an array without repeated ordersId.
        const sellerOrdersId = new Set(resOrdersId.map(item => item.orderId))

        //iterate over each orderId to get the order infos and also about each product envolved. 
        //save everything into the variable below to return it as a result
        const ordersForSeller = []

        for (let orderId of sellerOrdersId) {
            //getting the order info.
            const res = await db.query(`SELECT id,
                                               date,
                                               buyer_id as "buyerId",
                                               transaction_id as "transactionId"
                                        FROM orders
                                        WHERE id = $1`,[orderId]);
            
            const sellerOrder = res.rows[0];

            //getting the products envolved into that order.
            sellerOrder.products = await this.getAllProductsFromOrder(orderId);
            ordersForSeller.push(sellerOrder)
        }

        return ordersForSeller
	}


	/** Given a orderId, return data about the products envolved into that order.
	 *
	 * Returns { productId, name, seller, quantity, total }
	 *	
	 * Throws NotFoundError if not found.
	 **/


    static async getAllProductsFromOrder(orderId) {
		const resProductOrders = await db.query(`SELECT product_id AS "productId",
                                                         products.product_name as "name",
                                                         products.user_id AS "seller",
                                                         product_orders.quantity,
                                                         total
                                                   FROM product_orders
                                                   INNER JOIN products ON product_orders.product_id = products.id
                                                   WHERE order_id = $1`,
			[orderId]
		);

		const productOrders = resProductOrders.rows;

		if (productOrders.length === 0) throw new NotFoundError(`No order: ${orderId}`);

		return productOrders;
	}
}

module.exports = Order;
