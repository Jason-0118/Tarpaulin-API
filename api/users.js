const { Router } = require("express");

const router = Router();

const {
    UserSchema,
    insertNewUser,
    getUserById,
    validateUser,
    getAllUsers,
    checkExist,
    getCourseByInsId,
    getCourseByStuId,
} = require("../models/user");

const {
    CourseSchema,
    getStudentIdArrayByCourseId,
    getStudentInfoByCourseId,
} = require("../models/course");

const {
    requireAuthentication,
    generateAuthToken,
    checkAdm,
    checkIns,
    checkStu,
} = require("../lib/auth");
const {
    validateAgainstSchema,
    NullValidateAgainstSchema,
} = require("../lib/validation");

router.post("/", requireAuthentication, async function (req, res, next) {
    if (NullValidateAgainstSchema(req.body, UserSchema)) {
        exist = await checkExist(req.body);
        if (exist) {
            res.status(401).send({
                error: "Email has to be unique!!!",
            });
        } else {
            if (req.body.role == "admin" || req.body.role == "instructor") {
                const check = await checkAdm(req.auth.user);
                if (!check) {
                    res.status(403).send({
                        error: "Not Admin user!!!",
                    });
                } else {
                    try {
                        const id = await insertNewUser(req.body);
                        res.status(201).send({ _id: id });
                    } catch (e) {
                        next(e);
                    }
                }
            } else {
                try {
                    const id = await insertNewUser(req.body);
                    res.status(201).send({ _id: id });
                } catch (e) {
                    next(e);
                }
            }
        }
    } else {
        res.status(400).send({
            error: "Request body does not contain a valid User.",
        });
    }
});

router.post("/login", async function (req, res, next) {
    if (req.body && req.body.email && req.body.password) {
        try {
            const authenticatedUser = await validateUser(
                req.body.email,
                req.body.password
            );
            if (authenticatedUser) {
                const token = generateAuthToken(
                    authenticatedUser._id.toString(),
                    authenticatedUser.role
                );
                res.status(200).send({
                    token: token,
                });
            } else {
                res.status(401).send({
                    error: "Invalid authentication credentials",
                });
            }
        } catch (e) {
            res.status(500).send({
                error: e.message,
            });
        }
    } else {
        res.status(400).send({
            error: "Request body requires `email` and `password`.",
        });
    }
});

router.get("/", async (req, res, next) => {
    try {
        const users = await getAllUsers();
        res.status(200).send(users);
    } catch (err) {
        next(err);
    }
});

module.exports = router;

// router.get('/:id', requireAuthentication, async (req, res, next) => {
//     try {
//         const user = await getUserById(req.params.id)

//         if (user) {
//             res.status(200).send(user)
//         } else {
//             next()
//         }
//     } catch (err) {
//         next(err)
//     }
// })

router.get("/:id", requireAuthentication, async (req, res, next) => {
    const tmp = await getUserById(req.params.id);
    if (!tmp) {
        next();
        return;
    }

    try {
        const requestingUserId = req.auth.user; // Assuming the authenticated user ID is available in req.user.id
        const requestedUserId = req.params.id;
        if (requestingUserId !== requestedUserId) {
            res.status(403).send({
                error: "Access denied. You are not authorized to view this user.",
            });
            return;
        } else {
            const user = await getUserById(req.params.id);
            if (!user) {
                next();
                return;
            }
            if (user.role == "instructor") {
                user.teaches = await getCourseByInsId(requestedUserId);
            } else if (user.role == "student") {
                user.courses = await getCourseByStuId(requestedUserId);
            }
            res.status(200).send(user);
        }
    } catch (err) {
        next(err);
    }
});
