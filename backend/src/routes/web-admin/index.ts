import { Router } from 'express'
import { webAdminAuth } from '../../middleware/webAdminAuth'
import { superAdminOnly } from '../../middleware/superAdmin'
import authRouter from './auth'
import statsRouter from './stats'
import usersRouter from './users'
import adminsRouter from './admins'
import collabsRouter from './collabs'

const router = Router()

// Auth is public (no webAdminAuth required)
router.use('/auth', authRouter)

// All other routes require a valid web-admin JWT
router.use(webAdminAuth)
router.use('/stats', statsRouter)
router.use('/users', usersRouter)
router.use('/collabs', collabsRouter)

// Admin management requires super admin
router.use('/admins', superAdminOnly, adminsRouter)

export default router
