/*
 * Course schema and data accessor methods
 */

const { ObjectId } = require('mongodb')

const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

const { validateStudentId } = require('../models/user') 

/*
 * Schema describing required/optional fields of a course object.
 */
const CourseSchema = {
    subject: { required: true },
    number: { required: true },
    title: { required: true },
    term: { required: true },
    instructorId: { required: true }
}
exports.CourseSchema = CourseSchema

exports.getCoursesPage = async function (page, subject, number, term) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const count = await collection.countDocuments()

    /*
     * Compute last page number and make sure page is within allowed bounds.
     * Compute offset into collection.
     */
    const pageSize = 10
    const lastPage = Math.ceil(count / pageSize)
    page = page > lastPage ? lastPage : page
    page = page < 1 ? 1 : page
    const offset = (page - 1) * pageSize

    const fields = {}
    if (subject.length != 0) {
        fields.subject = subject
    }
    if (number.length != 0) {
        fields.number = number
    }
    if (term.length != 0) {
        fields.term = term
    }

    const results = await collection.find(fields)
        .project({ studentIds: 0 })
        .sort({ subject: 1, number: 1 })
        .skip(offset)
        .limit(pageSize)
        .toArray()

    return {
        courses: results,
        page: page,
        totalPages: lastPage,
        pageSize: pageSize,
        count: count
    }
}

exports.insertNewCourse = async function (course) {
    course = extractValidFields(course, CourseSchema)
    const db = getDbReference()
    const collection = db.collection('courses')
    course = {
        ...course,
        instructorId: new ObjectId(course.instructorId)
    }
    const result = await collection.insertOne(course)
    return result.insertedId
}

exports.updateCourseById = async function (id, updates) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const result = await collection.updateOne(
        { _id: new ObjectId(id) },
	    { $set: updates }
    )
    return result.matchedCount == 1
}

exports.getCourseById = async function (id) {
    const db = getDbReference()
    const collection = db.collection('courses')
    if (!ObjectId.isValid(id)) {
        return null
    } else {
        const results = await collection.find({
            _id: new ObjectId(id)
        }).project({ studentIds: 0 }).toArray()
        return results[0]
    }
}

async function getStudentIdArrayByCourseId (id) {
    const db = getDbReference()
    const collection = db.collection('courses')
    if (!ObjectId.isValid(id)) {
        return null
    } else {
        const results = await collection.find({
            _id: new ObjectId(id)
        }).project({ _id: 0, studentIds: 1 }).toArray()
        return results[0].studentIds
    }
}
exports.getStudentIdArrayByCourseId = getStudentIdArrayByCourseId

exports.getStudentInfoByCourseId = async function (id) {
    if (!ObjectId.isValid(id)) {
        return null
    }
    const studentIds = await getStudentIdArrayByCourseId(id)
    const db = getDbReference()
    const collection = db.collection('users')
    const results = await collection.find({_id: {$in: studentIds }})
        .project({ password: 0, role: 0, courseIds: 0 })
        .toArray()
    return results
}

exports.getAssignmentIdArrayByCourseId = async function (id) {
    const db = getDbReference()
    const collection = db.collection('assignments')
    if (!ObjectId.isValid(id)) {
        return null
    } else {
        const results = await collection.find({
            courseId: new ObjectId(id)
        }).toArray()
        var assignmentIds = []
        results.map(function(assignment) {
            assignmentIds.push(assignment._id)
        })
        return assignmentIds
    }
}

exports.verifyInstructorById = async function (courseId, instructorId) {
    const db = getDbReference()
    const collection = db.collection('courses')
    const results = await collection.find({
        _id: new ObjectId(courseId),
        instructorId: new ObjectId(instructorId)
    }).toArray()
    if (results[0]) {
        return true
    } else {
        return false
    }
}

exports.deleteCourseById = async function (id) {
    const db = getDbReference()
    const courseCollection = db.collection('courses')
    if (!ObjectId.isValid(id)) {
        return null
    } else {
        const result = await courseCollection.deleteOne({
            _id: new ObjectId(id)
        })
        if (result.deletedCount == 1) {
            const userCollection = db.collection('users')
            await userCollection.updateMany({}, { $pull: { courseIds: new ObjectId(id) } })
            const assignmentsCollection = db.collection('assignments')
            await assignmentsCollection.deleteMany({
                courseId: new ObjectId(id)
            })
            return true
        } else {
            return false
        }
    }
}

exports.bulkInsertNewCourses = async function (courses) {
    const coursesToInsert = courses.map(function (course) {
        course._id = new ObjectId(course._id)
        course.instructorId = new ObjectId(course.instructorId)
        course.studentIds = course.studentIds.map(function (student) {
            return new ObjectId(student)
        })
        return course
    })
    const db = getDbReference()
    const collection = db.collection('courses')
    const result = await collection.insertMany(coursesToInsert)
    return result.insertedIds
}

exports.updateStudentEnrollment = async function (courseId, add, remove) {
    const db = getDbReference();
    const courseCollection = db.collection('courses');
    const userCollection = db.collection('users');
  
    const filter = { _id: new ObjectId(courseId) };
  
    const course = await courseCollection.findOne(filter);
    if (!course) {
      return null;
    }

    add.forEach(function (studentId) {
        courseCollection.updateOne(
            { _id: new ObjectId(courseId) },
            { $addToSet: { studentIds: new ObjectId(studentId) } }
        )
        userCollection.updateMany(
            { _id: new ObjectId(studentId), role: "student" },
            { $addToSet: { courseIds: new ObjectId(courseId) } }
        )
    })
    remove.forEach(function (studentId) {
        courseCollection.updateOne(
            { _id: new ObjectId(courseId) },
            { $pull: { studentIds: new ObjectId(studentId) } }
        )
        userCollection.updateMany(
            { _id: new ObjectId(studentId), role: "student" },
            { $pull: { courseIds: new ObjectId(courseId) } }
        )
    })
  
    return true
  };
  