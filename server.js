require('dotenv').config()

const express = require('express')
const morgan = require('morgan')

const api = require('./api')
const { rateLimit, connectToRedisClient } = require('./lib/redis')
const { connectToDb } = require('./lib/mongo')
const { getDownloadStreamByFilename } = require('./models/submission')
const app = express()
const port = process.env.PORT || 8000

/*
 * Morgan is a popular logger.
 */
app.use(morgan('dev'))

app.use(express.json())

app.use(rateLimit)

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api)

//download file
app.get("/media/file/:filename", function (req, res, next) {
    console.log(req.params.filename);
    getDownloadStreamByFilename(req.params.filename)
        .on("error", function (err) {
            if (err.code === "ENOENT") {
                next()
            } else {
                next(err)
            }
        })
        .on("file", function (file) {
            res.status(200).type(file.metadata.contentType)
        })
        .pipe(res)
})

app.use('*', function (req, res, next) {
    res.status(404).json({
        error: "Requested resource " + req.originalUrl + " does not exist"
    })
})

/*
 * This route will catch any errors thrown from our API endpoints and return
 * a response with a 500 status to the client.
 */
app.use('*', function (err, req, res, next) {
    console.error("== Error:", err)
    res.status(500).send({
        err: "Server error.  Please try again later."
    })
})



connectToDb(async function () {
    await connectToRedisClient()
    app.listen(port, function () {
        console.log("== Server is running on port", port)
    })
})
