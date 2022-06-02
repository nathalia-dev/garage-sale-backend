"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the user field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
	try {
		const authHeader = req.headers && req.headers.authorization;
		if (authHeader) {
			const token = authHeader.replace(/^[Bb]earer /, "").trim();
			res.locals.user = jwt.verify(token, SECRET_KEY);
		}
		return next();
	} catch (err) {
		return next();
	}
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
	try {
		if (!res.locals.user) throw new UnauthorizedError();
		return next();
	} catch (err) {
		return next(err);
	}
}

/** Middleware to use when user must provide a valid token & be an user matching, which
 *  means that the userId on the token must match with the userId provided as a route param
 * or at the body.userId.
 *
 *  If not, raises Unauthorized.
 */

function ensureCorrectUser(req, res, next) {
	try {
		const user = res.locals.user;
		if (!(user && (user.id === req.params.user_id || user.id === String(req.body.userId)))) {
			throw new UnauthorizedError();
		}
		return next();
	} catch (err) {
		return next(err);
	}
}

/** Middleware to verify if the userId on the token is the same userId referenced in the database as the owner of specific data .
 * ex: is the user.id in the token the same as the userId at that specific address? or at that specific product?
 *
 *  If not, raises Unauthorized.
 */

function ensureCorrectUserWithApiCall(model, paramName) {
	return async (req, res, next) => {
		try {
			//first, check if there is any token passed through the request.
			const user = res.locals.user;
			if (!user) throw new UnauthorizedError();
			//second, check if the login user is the same user listed at that specific data
			const apiRes = await model.get(req.params[paramName]);

			if (!(String(apiRes.userId) === user.id)) {
				throw new UnauthorizedError();
			}
			return next();
		} catch (err) {
			return next(err);
		}
	};
}

module.exports = {
	authenticateJWT,
	ensureLoggedIn,
	ensureCorrectUser,
	ensureCorrectUserWithApiCall,
};
