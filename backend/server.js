require('dotenv').config()

const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')

connectDB()

const app = express()

// CORS configuration for Vite frontend (port 5173, 5174) and development
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5000',
        'http://localhost:3000'
    ],
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Temporary debug log - logs every incoming request
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`)
    console.log('Body:', req.body)
    next()
})

app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/classes', require('./routes/classRoutes'))
app.use('/api/sessions', require('./routes/sessionRoutes'))

app.get('/', (req, res) => res.json({ message: 'Backend running!' }))

app.listen(process.env.PORT || 5000, () => {
    console.log(`✅ Server running on port ${process.env.PORT || 5000}`)
})