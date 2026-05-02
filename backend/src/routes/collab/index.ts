import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import { requireCollab } from '../../middleware/requireCollab'
import productsRouter from './products'
import statsRouter from './stats'

const router = Router()

router.use(authMiddleware, requireCollab)

router.use('/products', productsRouter)
router.use('/stats', statsRouter)

export default router
