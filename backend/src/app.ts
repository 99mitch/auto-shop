import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import productsRouter from './routes/products'
import categoriesRouter from './routes/categories'
import ordersRouter from './routes/orders'
import profileRouter from './routes/profile'
import adminRouter from './routes/admin/index'
import webhookRouter from './routes/webhook'
import deliverRouter from './routes/deliver'

export const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
}))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/profile', profileRouter)
app.use('/api/admin', adminRouter)
app.use('/api/deliver', deliverRouter)
app.use('/webhook', webhookRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))
