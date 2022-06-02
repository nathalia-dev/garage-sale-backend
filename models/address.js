"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError, BadRequestError } = require("../expressError");

class Address {
	/** Create a address (from data), update db, return new address data.
	 * Check if it is the first user's address. If it is, it will add as default address,
	 *
	 * data should be { address, zipcode, state, userId, isDefault, city }
	 *
	 * Returns { id, address, zipcode, state, userId, isDefault, city }
	 **/
	static async create({ address, zipcode, state, userId, isDefault, city }) {
		const isUserFirstAddress = !(await Address.hasOneAddress(userId));

		if (isUserFirstAddress) {
			isDefault = true;
		}
		const result = await db.query(
			`INSERT INTO address (address,
                                  zipcode,
                                  state,
                                  user_id,
                                  is_default,
                                  city)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, address, zipcode, state, user_id AS "userId", is_default AS "isDefault", city`,
			[address, zipcode, state, userId, isDefault, city]
		);

		const newAddress = result.rows[0];

		if (newAddress.isDefault) {
			this.changeDefaultAddress(newAddress.id, newAddress.userId);
		}

		return newAddress;
	}

	/** Given a addressId, return data about address.
	 *
	 * Returns {  id, address, zipcode, state, userId, isDefault, city }
	 *
	 * Throws NotFoundError if not found.
	 **/

	static async get(address_id) {
		const addressRes = await db.query(
			`SELECT id,
                address,
                zipcode,
                state,
                user_id AS "userId",
                is_default AS "isDefault",
                city
        FROM address
        WHERE id = $1 `,
			[address_id]
		);

		const address = addressRes.rows[0];

		if (!address) throw new NotFoundError(`No Address: ${address_id}`);

		return address;
	}

	/** Find all address that a specific user has.
	 *
	 * Returns [{ id, address, city, state, zipcode, userId, isDefault }, ...]
	 *
	 **/

	static async findAll(userId) {
		const addresses = await db.query(
			`SELECT 							 id,
											   	 user_id AS "userId",
		  									   	 address,
												 city,
												 state,
												 zipcode,
												 is_default AS "isDefault"
 										  FROM address
										  WHERE user_id = $1
										  ORDER By is_default DESC`,
			[userId]
		);

		return addresses.rows;
	}
	/** Verify if the user is creating his/her first address.
	 *
	 * It returns a boolean.
	 */

	static async hasOneAddress(userId) {
		const res = await db.query(`SELECT id FROM address WHERE user_id = $1`, [userId]);
		const addresses = res.rows;

		if (addresses.length > 0) {
			return true;
		}

		return false;
	}

	/** Verify if there is another default address already saved for that user on database.
	 * It returns a boolean.
	 */

	static async hasAnotherDefaultAddress(addressId) {
		const resUserId = await db.query(`SELECT user_id as "userId" FROM address WHERE id = $1`, [addressId]);
		const userId = resUserId.rows[0].userId;
		const res = await db.query(
			`SELECT id
										  FROM address
										  WHERE user_id = $1 AND is_default = $2 AND id != $3`,
			[userId, true, addressId]
		);
		const addresses = res.rows;
		if (addresses.length > 0) {
			return true;
		}

		return false;
	}

	/** Change de default address for that user.
	 *
	 * Returns undefined.
	 */

	static async changeDefaultAddress(newDefaultAddressId, newDefaultAddressUserId) {
		const oldAddresses = await db.query(
			`SELECT id
											 FROM address
											 WHERE id <> $1 AND is_default = $2 AND user_id = $3`,
			[newDefaultAddressId, true, newDefaultAddressUserId]
		);
		const res = oldAddresses.rows;

		if (res.length !== 0) {
			res.map((address) => {
				this.update(address.id, { isDefault: false });
			});
		}
	}

	/** Update address with `data`.
	 *
	 * This is a "partial update" --- it's fine if data doesn't contain
	 * all the fields; this only changes provided ones.
	 *
	 * Data can include:
	 *   { address, city, state, zipcode, isDefault }
	 *
	 * Returns { id, address, city, state, zipcode, userId, isDefault }
	 *
	 * Throws NotFoundError if not found.
	 *
	 */

	static async update(addressId, data) {
		//it is necessary to check "hasAnotherDefaultAddress" in the update method, as the app change automatically the "isDefault" prop , if the user
		//is choosing another address to be the default. It happens because the app just allow to exist one defaultAddress.

		if (!data.isDefault) {
			const hasAnotherDefaultAddress = await Address.hasAnotherDefaultAddress(addressId);
			if (!hasAnotherDefaultAddress) {
				throw new BadRequestError(`You need a default address. First, choose or add another default address and then change this one.`);
			}
		}

		const { setCols, values } = sqlForPartialUpdate(data, {
			isDefault: "is_default",
		});
		const idVarIdx = "$" + (values.length + 1);

		const querySql = `UPDATE address 
                              SET ${setCols} 
                              WHERE id = ${idVarIdx} 
                              RETURNING id,
                                        address,
                                        city,
                                        state,
                                        zipcode,
                                        user_id AS "userId",
                                        is_default AS "isDefault";`;

		const result = await db.query(querySql, [...values, addressId]);
		const address = result.rows[0];

		if (data.isDefault) {
			this.changeDefaultAddress(address.id, address.userId);
		}

		if (!address) throw new NotFoundError(`No address: ${addressId}`);

		return address;
	}

	/** Delete given address from database; returns undefined.
	 *
	 * Throws NotFoundError if address not found.
	 **/

	static async remove(addressId) {
		const address = await Address.get(addressId);

		if (address.isDefault) {
			throw new BadRequestError(`You need a default address. First, choose or add another default address and then delete this one.`);
		}

		const result = await db.query(
			`DELETE
			   FROM address
			   WHERE id = $1
			   RETURNING id`,
			[addressId]
		);
		const removedAddress = result.rows[0];

		if (!removedAddress) throw new NotFoundError(`No address: ${addressId}`);
	}
}

module.exports = Address;
