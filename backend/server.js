require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()

// Initialize database pool
const pool = require('./src/db')
app.locals.pool = pool

app.use(cors({ origin: ['https://courtia.vercel.app', 'http://localhost:5173'], credentials: true }))
app.use(express.json())

const authRouter = require('./src/routes/auth')
const clientsRouter = require('./src/routes/clients')
const contratsRouter = require('./src/routes/contrats')
const dashboardRouter = require('./src/routes/dashboard')
const tachesRouter = require('./src/routes/taches')
const arkRouter = require('./src/routes/ark')

app.use('/api/auth', authRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/contrats', contratsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/taches', tachesRouter)
app.use('/api/ark', arkRouter)

app.get('/', (req, res) => res.json({ status: 'ok', service: 'courtia-backend' }))

app.use((err, req, res, next) => { 
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur', details: err.message })
})

const PORT = process.env.PORT || 10000
app.listen(PORT, () => console.log('COURTIA backend port ' + PORT))
