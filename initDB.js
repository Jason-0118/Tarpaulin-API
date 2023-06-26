require('dotenv').config()

const { connectToDb, getDbReference, closeDbConnection } = require('./lib/mongo')
const { bulkInsertNewCourses } = require('./models/course')
const { bulkInsertNewUsers } = require('./models/user')
const { bulkInsertNewAssignments } = require('./models/assignment')

const courseData = require('./data/courses.json')
const userData = require('./data/users.json')
const assignmentData = require('./data/assignments.json')

const mongoCreateUser = process.env.MONGO_CREATE_USER
const mongoCreatePassword = process.env.MONGO_CREATE_PASSWORD

connectToDb(async function () {
    /*
     * Insert initial user data into the database
     */
    const userIds = await bulkInsertNewUsers(userData)
    console.log("== Inserted users with IDs:", userIds)

    /*
     * Insert initial course data into the database
     */
    const courseIds = await bulkInsertNewCourses(courseData)
    console.log("== Inserted courses with IDs:", courseIds)

    /*
     * Insert initial assignment data into the database
     */
    const assignmentIds = await bulkInsertNewAssignments(assignmentData)
    console.log("== Inserted assignments with IDs:", assignmentIds)

    /*
     * Create a new, lower-privileged database user if the correct environment
     * variables were specified.
     */
    if (mongoCreateUser && mongoCreatePassword) {
        const db = getDbReference()
        const result = await db.addUser(mongoCreateUser, mongoCreatePassword, {
            roles: "readWrite"
        })
        console.log("== New user created:", result)
    }

    closeDbConnection(function () {
        console.log("== DB connection closed")
    })
})