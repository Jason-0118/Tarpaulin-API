/*
 * Submission schema and data accessor methods
 */
const { ObjectId, GridFSBucket } = require('mongodb')
const fs = require("node:fs")
const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')
const {  getAssignmentById } = require("./assignment");
/*
 * Schema describing required/optional fields of a submission object.
 */
const SubmissionSchema = {
    assignmentId: { required: true },
    studentId: { required: true },
    timestamp: { required: true },
    grade: { required: false }
}
exports.SubmissionSchema = SubmissionSchema

//basic insert(not file), use for test
exports.SubmissionInsert = async function (submission) {
    insertsubmission = extractValidFields(submission, SubmissionSchema)
    console.log("1:",insertsubmission);
    const db = getDbReference()
    const collection = db.collection('submissions')
    const result = await collection.insertOne(insertsubmission)
    return result.insertedId
}

//save submission file
exports.saveSubmissionFile = async function (file){
    return new Promise(function (resolve, reject) {
        const db = getDbReference()
        const bucket = new GridFSBucket(db, { bucketName: "submissions" })
        
        const metadata = {
            assignmentId: file.assignmentId,
            studentId: file.studentId,
            timestamp: file.timestamp,
            grade: file.grade,
            contentType: file.contentType
        }

        const uploadStream = bucket.openUploadStream(
            file.filename,
            { metadata: metadata }
        )
        fs.createReadStream(file.path).pipe(uploadStream)
            .on("error", function (err) {
                reject(err)
            })
            .on("finish", function (result) {
                console.log("== write success, result:", result)
                resolve(result._id)
            })
    })
}

//check student in course
exports.checkStudentInCourse = async function (assignmentId, studentId) {
    const assignment = await getAssignmentById(assignmentId);
    const db = getDbReference()
    const collection = db.collection('courses')
    const result = 0;
    if (!ObjectId.isValid(assignment.courseId)) {
        return null
    } else {
        results = await collection.find({
            _id: new ObjectId(assignment.courseId)
        }).toArray()
    }
    for (let index = 0; index < results[0].studentIds.length; index++) {
        if (results[0].studentIds[index] == studentId){
            console.log('find');
            return true
        }
    }
    console.log('not find');
    return false
}

//check teacher is the cause's instructor
exports.checkTeacherInCourse = async function (assignmentId, instructorId) {
    const assignment = await getAssignmentById(assignmentId);
    const db = getDbReference()
    const collection = db.collection('courses')
    const result = 0;
    if (!ObjectId.isValid(assignment.courseId)) {
        return null
    } else {
        results = await collection.find({
            _id: new ObjectId(assignment.courseId)
        }).toArray()
    }
    if (results[0].instructorId == instructorId){
        console.log('find');
        return true
    }

    console.log('not find');
    return false
}

//get basic submission(not file), use for test
exports.getSubmissionInfo = async function (id) {
    console.log("id-",id);
    console.log("is vaild", ObjectId.isValid(id));
    const db = getDbReference()
    const collection = db.collection("submissions")

    if (ObjectId.isValid(id)) {
        const results = await collection.aggregate([
            {$match: {_id: new ObjectId(id)}}
        ]).toArray()
        if (results.length !== 0) {
            return results[0]
        } else {
            console.log("null");
            next()
        }
    } else {
        console.log("is not valuse");
        next()
    }
}

//get all submission file info
exports.getAllSubmission = async function (assignmentId, page) {
    const assignment = await getAssignmentById(assignmentId);
    const db = getDbReference()
    const bucket = new GridFSBucket(db, { bucketName: "submissions" })

    page = Math.max(1, page)
    const pageSize = 10
    const offset = (page - 1) * pageSize

    const results = await bucket.find({"metadata.assignmentId":assignmentId})
        .sort({ _id: 1 })
        .skip(offset)
        .limit(pageSize)
        .toArray()
    console.log(results);
    return results
}

//get a file information
exports.getFileInfoById = async function (id) {
    const db = getDbReference()
    const bucket = new GridFSBucket(db, { bucketName: "submissions" })
    if (!ObjectId.isValid(id)) {
        console.log("error");
        return null
    } else {
        const results = await bucket.find({ _id: new ObjectId(id) })
            .toArray()
        console.log("== results:", results)
        return results[0]
    }
}

//download file
exports.getDownloadStreamByFilename = function (filename) {
    const db = getDbReference()
    const bucket = new GridFSBucket(db, { bucketName: 'submissions' })
    return bucket.openDownloadStreamByName(filename)
  }