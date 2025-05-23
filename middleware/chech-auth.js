const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decode = jwt.verify(token, "webBatch");
        req.userData = decode;
        // Check if the user's roles include at least one allowed role
        const allowedRole = [
            'Admin', 'Manager', 'Sales Team', 'Editor','Bundle Handler', 'Script Writer', 'VO Artist', 'Graphic Designer'
        ];
        if (req.userData.signupRole && req.userData.signupRole.some(role => allowedRole.includes(role))) {
            // Role is authorized
            next();
        } else {
            throw new Error(); // Unauthorized role
        }
    } catch (error) {
        res.json({ success: false, message: "Unauthorized Access!!" });
    }
};
