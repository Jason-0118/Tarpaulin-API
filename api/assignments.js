const { Router } = require("express");
const {
    insertNewAssignment,
    getAssignmentById,
    getAssigmentsByCourseId,
    AssignmentSchema,
    validateCourseId,
    validateAssignmentId,
    updateAssignmentById,
    removeAssignmentsById,
    getCourseIdByAssignmentId,
} = require("../models/assignment");
const { getDbReference } = require("../lib/mongo");
const { ObjectId } = require("mongodb");
const { requireAuthentication } = require("../lib/auth");
const {
    validateAgainstSchema,
    extractValidFields,
} = require("../lib/validation");
const { verifyInstructorById } = require("../models/course");

const router = Router();
/*
 * POST /assignments - Route to create a new assignments.
 * -------------need to check if is admin or instructor auth
 */
router.post("/", requireAuthentication, async (req, res, next) => {
    if (
        req.auth.role == "admin" ||
        (req.auth.role == "instructor" &&
            (await verifyInstructorById(req.body.courseId, req.auth.userId)))
    ) {
        if (validateAgainstSchema(req.body, AssignmentSchema)) {
            if (await validateCourseId(req.body.courseId)) {
                try {
                    const assignment = {
                        courseId: req.body.courseId,
                        title: req.body.title,
                        points: req.body.points,
                        due: req.body.due,
                        submissions: req.body.submissions,
                    };
                    const assignment_id = await insertNewAssignment(assignment);
                    res.status(201).send({
                        assignment_id: assignment_id,
                    });
                } catch (err) {
                    next(err);
                }
            } else {
                res.status(404).send({
                    err: `Specified CourseId ${req.body.courseId} not found`,
                });
            }
        } else {
            res.status(400).send({
                err: "Request body is not a valid course object.",
            });
        }
    } else {
        res.status(403).send({
            err: "Must be an admin/instructor to create a assignment",
        });
    }
});

/*
 * GET /assignments/{assignment_id} - Route to get an assignment.
 */
router.get("/:assignment_id", async (req, res, next) => {
    const assignment_id = req.params.assignment_id;
    if (await validateAssignmentId(assignment_id)) {
        try {
            const assignment = await getAssignmentById(assignment_id);
            if (assignment) {
                res.status(200).send(assignment);
            } else {
                next();
            }
        } catch (err) {
            next(err);
        }
    } else {
        res.status(404).send({
            err: `Specified Assignment ${assignment_id} not found`,
        });
    }
});

/*
 * PATCH /assignments/{assignment_id} - Route to update an assignment.
 */
router.patch(
    "/:assignment_id",
    requireAuthentication,
    async (req, res, next) => {
        //get courseId
        const courseId = await getCourseIdByAssignmentId(
            req.params.assignment_id
        );
        if (
            req.auth.role == "admin" ||
            (req.auth.role == "instructor" &&
                (await verifyInstructorById(courseId, req.auth.userId)))
        ) {
            const assignment_id = req.params.assignment_id;
            if (await validateAssignmentId(assignment_id)) {
                try {
                    const assignment = extractValidFields(
                        req.body,
                        AssignmentSchema
                    );
                    if (Object.keys(assignment).length === 0) {
                        res.status(400).send({
                            err: "The request body was either not present or did not contain any fields related to Assignment objects",
                        });
                    } else {
                        const update_assignment = await updateAssignmentById(
                            assignment_id,
                            assignment
                        );
                        console.log(
                            "----------------->update assignment:",
                            update_assignment
                        );
                        if (update_assignment) {
                            res.status(200).send({
                                msg: "update success",
                            });
                        } else {
                            next();
                        }
                    }
                } catch (err) {
                    next(err);
                }
            } else {
                res.status(404).send({
                    err: `Specified Assignment ${assignment_id} not found`,
                });
            }
        } else {
            res.status(403).send({
                err: "The request was not made by an authenticated User satisfying the authorization criteria described above",
            });
        }
    }
);

/*
 * DELETE /assignments/{course_id} - Route to delete an assignments via assignment_id.
 */
router.delete(
    "/:assignment_id",
    requireAuthentication,
    async (req, res, next) => {
        const courseId = await getCourseIdByAssignmentId(
            req.params.assignment_id
        );
        if (
            req.auth.role == "admin" ||
            (req.auth.role == "instructor" &&
                (await verifyInstructorById(courseId, req.auth.userId)))
        ) {
            const assignment_id = req.params.assignment_id;
            if (await validateAssignmentId(assignment_id)) {
                try {
                    const delete_assignment = await removeAssignmentsById(
                        assignment_id
                    );
                    if (delete_assignment) {
                        console.log(" --delete success!");
                        res.status(200).send({
                            msg: "delete success",
                        });
                    } else {
                        next();
                    }
                } catch (err) {
                    next(err);
                }
            } else {
                res.status(404).send({
                    err: `Specified Assignment ${assignment_id} not found`,
                });
            }
        } else {
            res.status(403).send({
                err: "The request was not made by an authenticated User satisfying the authorization criteria described above",
            });
        }
    }
);

/*
 * GET /assignments/{course_id} - Route to get all assignments via course_id.
 */
router.get("/:course_id", async (req, res, next) => {
    try {
        const course_id = req.params.course_id;
        const pageNum = parseInt(req.query.page) || 1;
        console.log("------>api-page query:", pageNum);
        const result = await getAssigmentsByCourseId(course_id, pageNum);
        if (result) {
            res.status(200).send({
                assignments: result.assignments,
                pageNumber: result.pageNumber,
                totalPage: result.totalPage,
                pageSize: result.pageSize,
                totalCount: result.totalCount,
                link: result.links,
            });
        } else {
            next();
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
