const redis = require("redis")
const jwt = require("jsonwebtoken")

const { secretKey } = require('./auth')

const redisHost = process.env.REDIS_HOST || "localhost"
const redisPort = process.env.REDIS_PORT || "6379"
const redisClient = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
})

const rateLimitWindowMillis = 60000

exports.rateLimit = async function (req, res, next) {
    const authHeader = req.get("Authorization") || ""
    const authHeaderParts = authHeader.split(" ")
    const token = authHeaderParts[0] === "Bearer" ?
        authHeaderParts[1] : null
    try {
        const payload = jwt.verify(token, secretKey)
        req.auth = {
            "userId": payload.sub,
            "role": payload.role
        }
    } catch (err) {
        req.authErr = err
    }

    let rateLimitMaxRequests = 10
    if (req.auth) {
        rateLimitMaxRequests = 30
    }
    const rateLimitRefreshRate = rateLimitMaxRequests / rateLimitWindowMillis

    console.log("rateLimitMaxRequests ===", rateLimitMaxRequests)

    let tokenBucket
    try {
        tokenBucket = await redisClient.hGetAll(req.ip)
    } catch (e) {
        next()
        return
    }
  
    tokenBucket = {
        tokens: parseFloat(tokenBucket.tokens) || rateLimitMaxRequests,
        last: parseInt(tokenBucket.last) || Date.now()
    }
  
    const timestamp = Date.now()
    const ellapsedMillis = timestamp - tokenBucket.last
    tokenBucket.tokens += ellapsedMillis * rateLimitRefreshRate
    tokenBucket.tokens = Math.min(tokenBucket.tokens, rateLimitMaxRequests)
    tokenBucket.last = timestamp

    console.log(tokenBucket)
  
    if (tokenBucket.tokens >= 1) {
        tokenBucket.tokens -= 1
        await redisClient.hSet(req.ip, [
            [ "tokens", tokenBucket.tokens ],
            [ "last", tokenBucket.last ]
        ])
        next()
    } else {
        await redisClient.hSet(req.ip, [
            [ "tokens", tokenBucket.tokens ],
            [ "last", tokenBucket.last ]
        ])
        res.status(429).send({
            error: "Too many requests per minute"
        })
    }
}

exports.connectToRedisClient = async function () {
    return redisClient.connect()
}