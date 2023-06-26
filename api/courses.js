const { Router } = require('express')

const {
    CourseSchema,
    getCoursesPage,
    getCourseById,
    deleteCourseById,
    getStudentIdArrayByCourseId,
    getStudentInfoByCourseId,
    getAssignmentIdArrayByCourseId,
    verifyInstructorById,
    insertNewCourse,
    updateCourseById,
    updateStudentEnrollment
} = require ('../models/course')
const { validateInstructorId } = require ('../models/user')
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { requireAuthentication } = require("../lib/auth")

const router = Router()

router.get('/', async (req, res, next) => {
    try {
        /*
         * Fetch page info, generate HATEOAS links for surrounding pages and then
         * send response.
         */
        const coursePage = await getCoursesPage(parseInt(req.query.page) || 1, req.query.subject || "", req.query.number || "", req.query.term || "")
        coursePage.links = {}
        if (coursePage.page < coursePage.totalPages) {
            coursePage.links.nextPage = `/courses?page=${coursePage.page + 1}`
            coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}`
        }
        if (coursePage.page > 1) {
            coursePage.links.prevPage = `/courses?page=${coursePage.page - 1}`
            coursePage.links.firstPage = '/courses?page=1'
        }
        res.status(200).send(coursePage)
    } catch (err) {
        next(err)
    }
})

router.post('/', requireAuthentication, async (req, res, next) => {
    if (req.auth.role == "admin") {
        if (validateAgainstSchema(req.body, CourseSchema)) {
            if (validateInstructorId(req.body.instructorId)) {
                try {
                    const id = await insertNewCourse(req.body)
                    res.status(201).send({
                        id: id
                    })
                } catch (err) {
                    next(err)
                }
            } else {
                res.status(400).send({
                    err: "Request body `instructorId` is not valid."
                })
            }
        } else {
            res.status(400).send({
                err: "Request body is not a valid course object."
            })
        }
    } else {
        res.status(403).send({ err: "Must be an admin to create a course" })
    }
})

router.get('/:id', async (req, res, next) => {
    try {
        const course = await getCourseById(req.params.id)
        if (course) {
            res.status(200).send(course)
        } else {
            next()
        }
    } catch (err) {
        next(err)
    }
})

router.patch('/:id', requireAuthentication, async (req, res, next) => {
    if (req.auth.role == "admin" || (req.auth.role == "instructor" && await verifyInstructorById(courseId, req.auth.user))) {
        try {
            req.body = extractValidFields(req.body, CourseSchema)
            if (Object.keys(req.body).length === 0) {
                res.status(400).send({ err: "Request body does not contain any fields related to course object." })
            }
            const updated = await updateCourseById(req.params.id, req.body)
            console.log("got here!!!", updated)
            if (updated) {
                res.status(200).send()
            } else {
                next()
            }
        } catch (err) {
            next(err)
        }
    } else {
        res.status(403).send({ err: "Must be an admin or course instructor to update course details." })
    }
})

router.delete('/:id', requireAuthentication, async (req, res, next) => {
    if (req.auth.role == "admin") {
        try {
            const deleted = await deleteCourseById(req.params.id)
            if (deleted) {
                res.status(204).send()
            } else {
                next()
            }
        } catch (err) {
            next(err)
        }
    } else {
        res.status(403).send({ err: "Must be an admin to delete a course" })
    }
})

router.get('/:id/students', requireAuthentication , async (req, res, next) => {
    try {
        const studentIds = await getStudentIdArrayByCourseId(req.params.id)
        if (studentIds) {
            if (req.auth.role == "admin" || (req.auth.role == "instructor" && await verifyInstructorById(req.params.id, req.auth.user))) {
                res.status(200).send({ students: studentIds })
            } else {
                res.status(403).send({ err: "Must be an admin or course instructor to access student ids" })
            }
        } else {
            next()
        }
    } catch (err) {
        next(err)
    }
})


router.post('/:id/students', requireAuthentication, async (req, res, next) => {
    try {
      const courseId = req.params.id;
      const { add, remove } = req.body;
  
      if (!add || !Array.isArray(add) || !remove || !Array.isArray(remove)) {
        res.status(400).send({ error: 'Invalid request body. Expected an object with "add" and "remove" arrays.' });
        return;
      }
  
      if (req.auth.role === 'admin' || (req.auth.role == 'instructor' && await verifyInstructorById(courseId, req.auth.user))) {
        const updatedCourse = await updateStudentEnrollment(courseId, add, remove);
  
        if (updatedCourse) {
          res.status(200).send({ message: 'Student enrollment updated successfully.' });
        } else {
          res.status(404).send({ error: 'Course not found.' });
        }
      } else {
        res.status(403).send({ error: 'Must be an admin or course instructor to update student enrollment.' });
      }
    } catch (err) {
      next(err);
    }
  });
  
  

router.get('/:id/roster', requireAuthentication , async (req, res, next) => {
    try {
        const students = await getStudentInfoByCourseId(req.params.id)
        if (students) {
            if (req.auth.role == "admin" || (req.auth.role == "instructor" && await verifyInstructorById(req.params.id, req.auth.user))) {
                var csv = "id,name,email\n"
                students.map(function(student) {
                    csv += `${student._id},\"${student.name}\",${student.email}\n`;
                })
                res.setHeader("Content-disposition", "attachment; filename=rosters.csv")
                res.set("Content-Type", "text/csv")
                res.status(200).send(csv)
            } else {
                res.status(403).send({ err: "Must be an admin or course instructor to access student ids" })
            }
        } else {
            next()
        }
    } catch (err) {
        next(err)
    }
})

router.get('/:id/assignments', async (req, res, next) => {
    try {
        const assignmentIds = await getAssignmentIdArrayByCourseId(req.params.id)
        if (assignmentIds) {
            res.status(200).send({ assignments: assignmentIds })
        } else {
            next()
        }
    } catch (err) {
        next(err)
    }
})

module.exports = router