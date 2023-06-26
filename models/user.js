/*
 * User schema and data accessor methods
 */

const { ObjectId } = require("mongodb");

const { getDbReference } = require("../lib/mongo");
const { extractValidFields } = require("../lib/validation");

const bcrypt = require('bcryptjs');
/*
 * Schema describing required/optional fields of a user object.
 */
const UserSchema = {
    name: { required: true },
    email: { required: true, unique: true },
    password: { required: true },
    role: { required: true },
};
exports.UserSchema = UserSchema;

exports.validateUser = async function (email, password) {

    const db = getDbReference();
    const collection = db.collection("users");
    const users = await collection.find({ email: email }).toArray();
    if (users.length != 0 && password == users[0].password) {
        return users[0];
    }
    return null;
};

exports.getUserById = async function (id) {
    const db = getDbReference();
    const collection = db.collection("users");
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        const projection = { password: 0 };
        const results = await collection
            .find({
                _id: new ObjectId(id),
            })
            .project(projection)
            .toArray();
        return results[0];
    }
};

exports.validateInstructorId = async function (id) {
    const db = getDbReference();
    const collection = db.collection("users");
    if (!ObjectId.isValid(id)) {
        return false;
    } else {
        const users = await collection
            .find({ _id: new ObjectId(id) })
            .toArray();
        return users.length != 0 && users[0].role == "instructor";
    }
};

exports.bulkInsertNewUsers = async function (users) {
    const usersToInsert = users.map(function (user) {
        user._id = new ObjectId(user._id);
        const hash = bcrypt.hashSync(user.password, 8)
        user.password = hash
        if (user.courseIds) {
            user.courseIds = user.courseIds.map(function (course) {
                return (course = new ObjectId(course));
            });
        }
        return user;
    });
    const db = getDbReference();
    const collection = db.collection("users");
    const result = await collection.insertMany(usersToInsert);
    return result.insertedIds;
};

exports.getAllUsers = async function () {
    const db = getDbReference();
    const collection = db.collection("users");

    const projection = { password: 0 };
    const results = await collection.find({}).project(projection).toArray();

    return results;
};

exports.insertNewUser = async function (user) {
    //const userToInsert = extractValidFields(user, UserSchema);
    var userToInsert = extractValidFields(user, UserSchema)
    const db = getDbReference();
    const collection = db.collection("users");
    const hash = bcrypt.hashSync(userToInsert.password, 8)
    userToInsert.password = hash
    const result = await collection.insertOne(userToInsert);
    return result.insertedId;
};

exports.checkExist = async function (user) {
    const userToCheck = extractValidFields(user, UserSchema);
    const db = getDbReference();
    const collection = db.collection("users");
    const result = await collection.findOne({ email: userToCheck.email });
    return result;
};

exports.getCourseByInsId = async function (id) {
    const db = getDbReference();
    const collection = db.collection("courses");
    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        const results = await collection
            .find({ instructorId: new ObjectId(id) })
            .toArray();
        var arrayForTeachers = [];
        results.forEach(function (teachers) {
            arrayForTeachers.push(teachers._id);
        });
        return arrayForTeachers;
    }
};

exports.getCourseByStuId = async function (id) {
    const db = getDbReference();
    const collection = db.collection("courses");

    if (!ObjectId.isValid(id)) {
        return null;
    } else {
        const results = await collection
            .find({ studentIds: { $in: [new ObjectId(id)] } })
            .toArray();
        var arrayForCourses = [];
        results.forEach(function (courses) {
            arrayForCourses.push(courses._id);
        });
        return arrayForCourses;
    }
};
