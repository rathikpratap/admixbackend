const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {


    try {
        const token = req.headers.authorization.split(' ')[1];
        const decode = jwt.verify(token, "webBatch")
        req.userData = decode

        console.log("Auth===>>", req.userData);
        //return res.json(decode);
        if (req.userData.signupRole === 'Admin' || req.userData.signupRole === 'Sales Team' || req.userData.signupRole === 'Editor' || req.userData.signupRole === 'Script Writer' || req.userData.signupRole === 'VO Artist') {
            console.log("Auth Role===>>", req.userData.signupRole);
            next();
        } else {
            throw new Error();
        }
    } catch (error) {
        res.json({ success: false, message: "Unauthorized Access!!" })
    }
}