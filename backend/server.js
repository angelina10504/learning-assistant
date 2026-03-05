require('dotenv').config()

const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')

connectDB()

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Temporary debug log - logs every incoming request
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`)
    console.log('Body:', req.body)
    next()
})

app.use('/api/auth', require('./routes/authRoutes'))

app.get('/', (req, res) => res.json({ message: 'Backend running!' }))

app.listen(process.env.PORT || 5000, () => {
    console.log(`✅ Server running on port ${process.env.PORT || 5000}`)
})