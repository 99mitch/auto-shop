import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../../middleware/auth'
import { adminMiddleware, getAdminIds } from '../../middleware/admin'
import ordersRouter from './orders'
import productsRouter from './products'
import statsRouter from './stats'
import settingsRouter from './settings'
import collaboratorsRouter from './collaborators'
import categoriesRouter from './categories'
import preordersRouter from './preorders'

const router = Router()

router.use(authMiddleware, adminMiddleware)

router.get('/me', (req: AuthRequest, res) => {
  res.json({
    telegramId: req.telegramId,
    userId: req.userId,
    isAdmin: getAdminIds().includes(req.telegramId!),
  })
})

router.use('/orders', ordersRouter)
router.use('/products', productsRouter)
router.use('/stats', statsRouter)
router.use('/settings', settingsRouter)
router.use('/collaborators', collaboratorsRouter)
router.use('/categories', categoriesRouter)
router.use('/preorders', preordersRouter)

export default router
