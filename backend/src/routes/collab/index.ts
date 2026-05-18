import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import { requireCollab } from '../../middleware/requireCollab'
import productsRouter from './products'
import statsRouter from './stats'
import walletsRouter from './wallets'

const router = Router()

router.use(authMiddleware, requireCollab)

router.use('/products', productsRouter)
router.use('/stats', statsRouter)
router.use('/wallets', walletsRouter)

export default router
