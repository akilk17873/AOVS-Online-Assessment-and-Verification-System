#!/usr/bin/env node
/**
 * AOVS (Online Assessment and Verification System)
 * MongoDB Atlas Seeding Script (SCRUM-31)
 *
 * Populates MongoDB Atlas with initial examination metadata and questions.
 * Safe & Repeatable: Uses upsert (updateOne with $set) to prevent duplicates.
 *
 * Usage:
 *   node scripts/seed-exams.js
 *   npm run seed
 */

require('dotenv').config();
const { getDatabase, closeDatabaseConnection, seedInitialExams, maskMongoUri } = require('../db');

async function runSeed() {
    console.log('====================================================');
    console.log(' AOVS — MongoDB Atlas Examination Seeder (SCRUM-31)');
    console.log('====================================================\n');

    const uri = process.env.MONGODB_URI;
    if (!uri || uri.trim().length === 0) {
        console.error('❌ ERROR: MONGODB_URI is not defined in your environment (.env).\n');
        console.error('To seed questions into MongoDB Atlas:');
        console.error('1. Copy .env.example to .env:');
        console.error('   cp .env.example .env');
        console.error('2. Open .env and set your MongoDB Atlas connection string:');
        console.error('   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aovs?retryWrites=true&w=majority\n');
        process.exit(1);
    }

    console.log(`📡 Connecting to MongoDB Atlas: ${maskMongoUri(uri)}`);
    console.log(`📦 Database: ${process.env.MONGODB_DB_NAME || 'aovs'}\n`);

    try {
        const db = await getDatabase();
        if (!db) {
            throw new Error('Could not establish database connection.');
        }

        console.log('⏳ Seeding collections: "exams" and "questions"...');
        const results = await seedInitialExams(db);

        console.log('\n✅ Seeding completed successfully!');
        console.log(`   • Examinations upserted: ${results.examsUpserted}`);
        console.log(`   • Questions upserted:    ${results.questionsUpserted}`);
        console.log('\nCollections populated:');
        console.log('   - exams: Stores exam metadata, instructions, and timing.');
        console.log('   - questions: Stores individual written and MCQ questions.\n');
        console.log('The active exam (CS301-2026) is ready to be fetched by the frontend interface.');
    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await closeDatabaseConnection();
    }
}

if (require.main === module) {
    runSeed();
}

module.exports = runSeed;
