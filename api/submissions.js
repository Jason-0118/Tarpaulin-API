const { Router } = require('express')
const { ObjectId, GridFSBucket } = require('mongodb')
var mime = require('mime-types')
const { requireAuthentication } = require('../lib/auth')
const {
    saveSubmissionFile,
    getFileInfoById,
    checkStudentInCourse,
    checkTeacherInCourse,
    getAllSubmission,
    getDownloadStreamByFilename
} = require('../models/submission')
const crypto = require("node:crypto")
const multer = require("multer")
const router = Router()


const upload = multer({
    storage: multer.diskStorage({
    dest:'./temp',
    filename: (req, file, callback) => {
        const filename = crypto.pseudoRandomBytes(16).toString("hex")
        const extension = mime.extension(file.mimetype)
        callback(null, `${filename}.${extension}`)
    }
}),
fileFilter: (req, file, callback) => {
    callback(null, !!mime.extension(file.mimetype))
}
})

router.post('/:id/submission',requireAuthentication, upload.single("file") , async function (req, res, next) {
if (ObjectId.isValid(req.params.id)){
    console.log(req.file);
    const result =await checkStudentInCourse(req.params.id, req.body.studentId)
    if ((req.auth.role == "student") && result && (req.auth.user == req.body.studentId)) {
        if (req.file){
            try{
                const submission = {
                    assignmentId: req.params.id,
                    studentId: req.body.studentId,
                    timestamp: req.body.timestamp,
                    grade: req.body.grade,
                    contentType: req.file.mimetype,
                    filename: req.file.filename,
                    path: req.file.path
                }
                const id = await saveSubmissionFile(submission)

                res.status(200).send({
                    fileId: id
                })
            } catch(e){
                next(e)
            }
        } else {
            res.status(400).send({
                err: "Invalid file."
            })
        }
    } else {
        res.status(403).send({
            err: "Unauthorized to asscess the specified resource."
        })
    }
} else {
    res.status(404).send({
        err: "Specified Assignment 'id' not found."
    })
}

})


router.get('/:id/submission/:submissionId', async function (req, res, next){
    try {
        const subId = req.params.submissionId
        const theSub = await getFileInfoById(subId)
        res.status(200).send(theSub)
    } catch(e){
        next(e)
    }
})

router.get('/:id/submission',requireAuthentication, async function (req, res, next) {
if (ObjectId.isValid(req.params.id)){
    const result =await checkTeacherInCourse(req.params.id, req.auth.user)
    if (result || req.auth.role == "admin") {
        try{
            const studentId = req.params.id
            const page = parseInt(req.query.page) || 1
            const submissionInfo = await getAllSubmission(req.params.id,page)
            res.status(200).send(submissionInfo)
        } catch(e) {
            next(e)
        }
    } else {
        res.status(403).send({
            err: "Unauthorized to asscess the specified resource."
        })
    }  
} else {
    res.status(404).send({
        err: "Specified Assignment 'id' not found."
    })
}
})

module.exports = router