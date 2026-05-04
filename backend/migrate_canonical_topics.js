/**
 * One-time migration: seed canonicalTopics on each class from the first
 * study plan ever created for that class.
 * Run: node migrate_canonical_topics.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const Class = require('./models/Class')
const StudyPlan = require('./models/StudyPlan')

async function migrate() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-assistant')
    console.log('Connected to MongoDB')

    const classes = await Class.find({})
    let updated = 0

    for (const cls of classes) {
        // Skip if already has canonical topics
        if (cls.canonicalTopics && cls.canonicalTopics.length > 0) {
            console.log(`⏭  ${cls.name} — already has ${cls.canonicalTopics.length} canonical topics`)
            continue
        }

        // Find the first study plan created for this class
        const firstPlan = await StudyPlan.findOne({ classId: cls._id }).sort({ generatedAt: 1, createdAt: 1 })
        if (!firstPlan || !firstPlan.topics || firstPlan.topics.length === 0) {
            console.log(`⚠️  ${cls.name} — no study plans found, skipping`)
            continue
        }

        cls.canonicalTopics = firstPlan.topics.map((t, i) => ({
            name: t.name,
            order: t.order || i + 1,
            estimatedMinutes: t.estimatedMinutes || 30,
            difficulty: t.difficulty || 'intermediate',
            subtopics: t.subtopics || [],
            pageRange: t.pageRange || []
        }))
        await cls.save()
        console.log(`✅  ${cls.name} — seeded ${cls.canonicalTopics.length} topics: ${cls.canonicalTopics.map(t => t.name).join(', ')}`)
        updated++
    }

    console.log(`\nDone. Updated ${updated} classes.`)
    await mongoose.disconnect()
}

migrate().catch(err => { console.error(err); process.exit(1) })
