const jwt = require("jsonwebtoken")
const { ObjectId } = require('mongodb')

const secretKey = "SuperSecret"
exports.secretKey = secretKey
const { getDbReference } = require('./mongo')

exports.generateAuthToken = function (userId, role) {
    console.log("userId ===", userId)
    const payload = {
        sub: userId,
        role: role
    }
    return jwt.sign(payload, secretKey, { expiresIn: "24h" })
}

// exports.requireAuthentication = function (req, res, next) {
//     if (req.auth) {
//         next()
//     } else {
//         console.error("== Error verifying token:", req.authErr)
//         res.status(401).send({
//             error: "Invalid authentication token"
//         })
//     }
// }

exports.requireAuthentication = function (req, res, next) {
    console.log("== requireAuthentication()")
    const authHeader = req.get("Authorization") || ""
    const authHeaderParts = authHeader.split(" ")
    const token = authHeaderParts[0] === "Bearer" ?
        authHeaderParts[1] : null
    console.log("  -- token:", token)
    req.auth = {
        user: null, // Initialize with a default value for req.auth.user
        role: null, // Initialize with a default value for req.auth.role
      };
    try {
      if (!token){
        req.admin = false
        next()
      } else {
        const payload = jwt.verify(token, secretKey)
        console.log("  -- payload:", payload)
        req.auth.user = payload.sub
        req.auth.role = payload.role
        next()
      }
    } catch (err) {
        console.error("== Error verifying token:", err)
        res.status(403).send({
            error: "Invalid authentication token"
        })
    }
}

exports.checkAdm = async function (userId) {
    const db = getDbReference();
    const collection = db.collection('users');
    
    const users = await collection.find({ _id: new ObjectId(userId) }).toArray()
    return users.length != 0 && users[0].role == "admin"
  };
  

