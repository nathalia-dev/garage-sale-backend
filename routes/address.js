"use strict";

/** Routes for address. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureCorrectUser, ensureCorrectUserWithApiCall } = require("../middleware/auth");
const { BadRequestError, UnauthorizedError } = require("../expressError");
const Address = require("../models/address");
const addressNewSchema = require("../schemas/addressNew.json");
const addressUpdateSchema = require("../schemas/addressUpdate.json");

const router = express.Router();

/** POST /address/{ address }  => { address }
 *
 * Adds a new address.
 *
 * This returns the newly created address:
 *  {address: { id, address, city, state, zipcode, userId, isDefault  }
 *
 * Authorization required: The address must belong to the same user as the logged in user
 **/

router.post("/address", ensureCorrectUser, async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, addressNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const address = await Address.create(req.body);
		return res.status(201).json({ address });
	} catch (err) {
		return next(err);
	}
});

/** GET /users/:user_id/address
 *
 * Find all the addresses for that specific user.
 *
 * This returns: 
 *  { address: { id, address, city, state, zipcode, userId, isDefault }, ... }
 *
 * Authorization required: The address must belong to the same user as the logged in user
 *
 **/

router.get("/users/:user_id/address", ensureCorrectUser, async function (req, res, next) {
	try {
		//the ensureCorrectUser check the param :user_id and also the body.userId. To avoid that someone pass the userId through the body to break security,
		//i did that.
		if(req.body.userId) {
			throw new UnauthorizedError()
		}
		const addresses = await Address.findAll(req.params.user_id);
		return res.json({ addresses });
	} catch (err) {
		return next(err);
	}
});


/** PATCH /address/[address_id] { address } => { address }
 *
 * Data can include:
 *   { address, city, state, zipcode, isDefault}
 *
 * Returns { id, address, city, state, zipcode, userId, isDefault }
 *
 * Authorization required: The address must belong to the same user as the logged in user
 **/

router.patch("/address/:address_id", ensureCorrectUserWithApiCall(Address, "address_id"), async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, addressUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const updatedAddress = await Address.update(req.params.address_id, req.body);
		return res.json({ updatedAddress });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /address/[address_id]  =>  { deleted: id }
 *
 * Authorization required: The address must belong to the same user as the logged in user
 */

router.delete("/address/:address_id", ensureCorrectUserWithApiCall(Address, "address_id"), async function (req, res, next) {
	try {
		await Address.remove(req.params.address_id);
		return res.json({ deleted: +req.params.address_id });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;





/** I GUESS I DONT NEED THIS */

/** GET /address/[address_id] => { address: { id, address, city, state, zipcode, userId, isDefault } }
 *
 * Returns the specific address
 *
 * Authorization required: none
 **/

// router.get("/address/:address_id", async function (req, res, next) {
// 	try {
// 		const address = await Address.get(req.params.address_id);
// 		return res.json({ address });
// 	} catch (err) {
// 		return next(err);
// 	}
// });