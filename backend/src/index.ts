import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import leadRoutes from './routes/leads'
import accountRoutes from './routes/accounts'
import contactRoutes from './routes/contacts'
import opportunityRoutes from './routes/opportunities'
import activityRoutes from './routes/activities'
import contractRoutes from './routes/contracts'
import orderRoutes from './routes/orders'
import dashboardRoutes from './routes/dashboard'
import reportRoutes from './routes/reports'
import searchRoutes from './routes/search'
import { registerCronJobs } from './jobs/notifications'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/opportunities', opportunityRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/search', searchRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur interne' })
})

app.listen(PORT, () => {
  console.log(`🚀 CRM API démarrée sur http://localhost:${PORT}`)
  registerCronJobs()
})

export default app
