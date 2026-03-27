const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
    let token

    if (req.headers.authorization?.startsWith('Bearer')) {
        try {
            // Extract token from header
            token = req.headers.authorization.split(' ')[1]

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            // Attach user to request
            req.user = await User.findById(decoded.id).select('-password')

            return next()
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' })
        }
    }

    res.status(401).json({ message: 'Not authorized, no token' })
}

module.exports = { protect }