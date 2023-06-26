const { Router } = require('express')

const router = Router()

router.use('/users', require('./users'))
router.use('/courses', require('./courses'))
router.use('/assignments', require('./assignments'))
router.use('/assignments', require('./submissions'))

module.exports = router