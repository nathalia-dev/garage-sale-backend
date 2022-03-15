"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError } = require("../expressError");

class Address {
	/** Create a address (from data), update db, return new address data.
	 *
	 * data should be { address, zipcode, state, userId, isDefault, city }
	 *
	 * Returns { id, address, zipcode, state, userId, isDefault, city }
	 **/
	static async create({ address, zipcode, state, userId, isDefault, city }) {
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
	 * Returns {  id, uaddress, zipcode, state, userId, isDefault, city }
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
			`SELECT id,
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

	/** Verify if there is another default address already saved on the db.
	 *
	 * If there is, its turn into is_default = false.
	 *
	 * So the only default address will be the new one.
	 */

	static async changeDefaultAddress(newDefaultAddressId,  newDefaultAddressUserId) {
		const oldAddresses = await db.query(`SELECT id
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

	/** Update address data with `data`.
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
		const result = await db.query(
			`DELETE
			   FROM address
			   WHERE id = $1
			   RETURNING id`,
			[addressId]
		);
		const address = result.rows[0];

		if (!address) throw new NotFoundError(`No address: ${addressId}`);
	}
}

module.exports = Address;
