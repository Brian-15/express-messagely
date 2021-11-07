const express = require('express');
const router = express.Router();
const User = require('../models/user');
const ExpressError = require('../expressError');
const { updateLoginTimestamp } = require('../models/user');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/

router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) throw new ExpressError('username and password required', 400);

        if (await User.authenticate(username, password)) {
            await updateLoginTimestamp(username);
            return res.json({token: jwt.sign({username}, SECRET_KEY)});
        }

        throw new ExpressError('invalid login credentials', 400);
    }

    catch (err) {
        return next(err);
    }
});


/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */

router.post('/register', async (req, res, next) => {
    try {
        const { username, password, first_name, last_name, phone } = req.body;

        if (!(username && password && first_name && last_name && phone)) {
            throw new ExpressError('username, password, first_name, last_name, and phone required', 400);
        }

        await User.register({username, password, first_name, last_name, phone});

        return res.status(201).json({token: jwt.sign({username}, SECRET_KEY)});
    }

    catch (err) {
        return next(err);
    }
});

module.exports = router;