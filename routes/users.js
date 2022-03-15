"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureCorrectUser } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();

/** GET / => { users: [ { id, firstName, lastName, email, photo }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: none.
 **/

router.get("/users", async function (req, res, next) {
	try {
		const users = await User.findAll();
		return res.json({ users });
	} catch (err) {
		return next(err);
	}
});

/** GET /[user_id] => { user }
 *
 * Returns { id, firstName, lastName, email, photo, adresses }
 *
 * where adresses are [id, id...]
 *
 * Authorization required: none.
 **/

router.get("/users/:user_id", async function (req, res, next) {
	try {
		const user = await User.get(req.params.user_id);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[user_id] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, photo }
 *
 * Returns { username, firstName, lastName, photo, email }
 *
 * Authorization required: same-user-as-:id
 **/

router.patch("/users/:user_id", ensureCorrectUser, async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, userUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const user = await User.update(req.params.user_id, req.body);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
