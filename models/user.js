"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError, BadRequestError, UnauthorizedError } = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */

class User {
	/** authenticate user with email, password.
	 *
	 * Returns { id, first_name, last_name, email, photo }
	 *
	 * Throws UnauthorizedError is user not found or wrong password.
	 **/

	static async authenticate(email, password) {
		// try to find the user first
		const result = await db.query(
			`SELECT id,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  photo
           FROM users
           WHERE email = $1`,
			[email]
		);

		const user = result.rows[0];

		if (user) {
			// compare hashed password to a new hash from password
			const isValid = await bcrypt.compare(password, user.password);
			if (isValid === true) {
				delete user.password;
				return user;
			}
		}

		throw new UnauthorizedError("Invalid email/password");
	}

	/** Register user with data.
	 *
	 * Returns { id, firstName, lastName, email, photo }
	 *
	 * Throws BadRequestError on duplicates.
	 **/

	static async register({ password, firstName, lastName, email, photo }) {
		const duplicateCheck = await db.query(
			`SELECT email
           FROM users
           WHERE email = $1`,
			[email]
		);

		if (duplicateCheck.rows[0]) {
			throw new BadRequestError(`Duplicate email: ${email}`);
		}

		const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

		const result = await db.query(
			`INSERT INTO users
           (password,
            first_name,
            last_name,
            email,
            photo)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, first_name AS "firstName", last_name AS "lastName", email, photo`,
			[hashedPassword, firstName, lastName, email, photo]
		);

		const user = result.rows[0];

		return user;
	}

	/** Find all users.
	 *
	 * Returns [{ id, first_name, last_name, email, photo }, ...]
	 **/

	static async findAll() {
		const result = await db.query(
			`SELECT id,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    email,
                    photo
             FROM users
             ORDER BY first_name`
		);

		return result.rows;
	}

	/** Given a id, return data about user.
	 *
	 * Returns { id, first_name, last_name, email, photo, addresses }
	 *
	 * where addresses is [id, address, city, state, zipcode, userId, isDefault]
	 *
	 *(it is returning only the user's default address)
	 *
	 * Throws NotFoundError if user not found.
	 **/

	static async get(id) {
		const userRes = await db.query(
			`SELECT id, first_name AS "firstName",last_name AS "lastName", email, photo
			FROM users
			WHERE id = $1`,
			[id]
		);
		const user = userRes.rows[0];

		const address = await db.query(
			`SELECT id, address, city, state, zipcode, user_id AS "userId", is_default AS "isDefault"
											FROM address
											WHERE user_id = $1 AND is_default = $2`,
			[id, true]
		);
		user.address = address.rows[0];

		if (!user) throw new NotFoundError(`No user: ${id}`);

		return user;
	}

	/** Update user data with `data`.
	 *
	 * This is a "partial update" --- it's fine if data doesn't contain
	 * all the fields; this only changes provided ones.
	 *
	 * Data can include:
	 *   { firstName, lastName, password, photo }
	 *
	 * Returns { id, firstName, lastName, email, photo }
	 *
	 * Throws NotFoundError if not found.
	 *
	 */

	static async update(id, data) {
		if (data.password) {
			data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
		}

		const { setCols, values } = sqlForPartialUpdate(data, {
			firstName: "first_name",
			lastName: "last_name",
		});
		const idVarIdx = "$" + (values.length + 1);

		const querySql = `UPDATE users 
                        SET ${setCols} 
                        WHERE id = ${idVarIdx} 
                        RETURNING id,
                                  first_name AS "firstName",
                                  last_name AS "lastName",
                                  email,
                                  photo;`;
		const result = await db.query(querySql, [...values, id]);
		const user = result.rows[0];

		if (!user) throw new NotFoundError(`No user: ${id}`);

		delete user.password;
		return user;
	}
}

module.exports = User;
