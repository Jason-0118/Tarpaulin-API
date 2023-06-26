/*
 * Assignment schema and data accessor methods
 */

const { ObjectId } = require("mongodb");

const { getDbReference } = require("../lib/mongo");
const { extractValidFields } = require("../lib/validation");

/*
 * Schema describing required/optional fields of a assignment object.
 */
const AssignmentSchema = {
    courseId: { required: true },
    title: { required: true },
    points: { required: true },
    due: { required: true },
};
exports.AssignmentSchema = AssignmentSchema;

exports.insertNewAssignment = async function (assignment) {
    assignment = extractValidFields(assignment, AssignmentSchema);
    const db = getDbReference();
    const collection = db.collection("assignments");
    if (!ObjectId.isValid(assignment.courseId)) {
        return null;
    } else {
        assignment = {
            ...assignment,
            courseId: new ObjectId(assignment.courseId),
        };
        const assignment_id = await collection.insertOne(assignment);
        console.log(
            "---->assignment model - assignment_id",
            assignment_id.insertedId
        );
        return assignment_id.insertedId;
    }
};

exports.getAssignmentById = async function (assignment_id) {
    const db = getDbReference();
    const collection = db.collection("assignments");
    if (!ObjectId.isValid(assignment_id)) {
        return null;
    } else {
        const assignment = await collection
            .find({
                _id: new ObjectId(assignment_id),
            })
            .project({ submissions: 0 })
            .toArray();
        return assignment[0];
    }
};

exports.getAssigmentsByCourseId = async function (course_id, pageNum) {
    const db = getDbReference();
    const collection = db.collection("assignments");
    if (!ObjectId.isValid(course_id)) {
        return null;
    } else {
        assignments = await collection
            .find({
                courseId: new ObjectId(course_id),
            })
            .sort({ _id: 1 })
            .toArray();

        //read page number based on optional query string params 'page'
        let page = parseInt(pageNum);
        const numPerPage = 10;
        const lastPage = Math.ceil(assignments.length / numPerPage);
        page = page > lastPage ? lastPage : page;
        page = page < 1 ? 1 : page;

        // calculate starting and ending indices
        const start = (page - 1) * numPerPage;
        const end = start + numPerPage;
        console.log("--------------<", assignments);
        const pageAssignments = assignments.slice(start, end);

        // generate links
        const links = {};
        if (page < lastPage) {
            links.nextPage = `/assignments/${course_id}?page=${page + 1}`;
            links.lastPage = `/assignments/${course_id}?page=${lastPage}`;
        }
        if (page > 1) {
            links.prevPage = `/assignments/${course_id}?page=${page - 1}`;
            links.firstPage = `/assignments/${course_id}?page=1`;
        }

        const result = {
            assignments: pageAssignments,
            pageNumber: page,
            totalPage: lastPage,
            pageSize: numPerPage,
            totalCount: assignments.length,
            links: links,
        };
        return result;
    }
};

exports.validateCourseId = async function (courseId) {
    const db = getDbReference();
    const collection = db.collection("courses");
    if (!ObjectId.isValid(courseId)) {
        return false;
    } else {
        const course = await collection
            .find({ _id: new ObjectId(courseId) })
            .toArray();
        return course.length != 0;
    }
};

exports.validateAssignmentId = async function (assignmentId) {
    const db = getDbReference();
    const collection = db.collection("assignments");
    if (!ObjectId.isValid(assignmentId)) {
        return false;
    } else {
        const assignment = await collection
            .find({ _id: new ObjectId(assignmentId) })
            .toArray();
        return assignment.length != 0;
    }
};

exports.updateAssignmentById = async function (
    assignmentId,
    updatedAssignment
) {
    const db = getDbReference();
    const collection = db.collection("assignments");
    const updated = await collection.updateOne(
        { _id: new ObjectId(assignmentId) },
        { $set: updatedAssignment }
    );
    return updated.matchedCount == 1;
};

exports.removeAssignmentsById = async function (assignmentId) {
    const db = getDbReference();
    const collection = db.collection("assignments");
    const deleted = await collection.deleteOne({
        _id: new ObjectId(assignmentId),
    });
    return deleted.deletedCount == 1;
};

exports.bulkInsertNewAssignments = async function (assignments) {
    const assignmentsToInsert = assignments.map(function (assignment) {
        assignment._id = new ObjectId(assignment._id);
        assignment.courseId = new ObjectId(assignment.courseId);
        return assignment;
    });
    const db = getDbReference();
    const collection = db.collection("assignments");
    const result = await collection.insertMany(assignmentsToInsert);
    return result.insertedIds;
};

exports.getCourseIdByAssignmentId = async function (assignmentId) {
    const db = getDbReference();
    const collection = db.collection("assignments");
    if (!ObjectId.isValid(assignmentId)) {
        return null;
    }
    const assignment = await collection
        .find({
            _id: new ObjectId(assignmentId),
        })
        .toArray();
    console.log("-------getCourseIdByAssignmentId:", assignment[0].courseId);
    return assignment[0].courseId;
};
