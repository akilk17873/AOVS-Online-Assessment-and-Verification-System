require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.MOCK_COLLEGE_PORT || 3000;
const TEST_STUDENT_ID = process.env.TEST_STUDENT_ID || 'TEST001';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test@123';

app.post('/api/college/login', (req, res) => {
    try {
        const { studentId, password } = req.body;

        if (!studentId || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing student ID or password"
            });
        }

        if (studentId === TEST_STUDENT_ID && password === TEST_PASSWORD) {
            return res.status(200).json({
                success: true,
                message: "Authentication successful",
                student: {
                    studentId: TEST_STUDENT_ID
                }
            });
        } else {
            return res.status(401).json({
                success: false,
                message: "Invalid student ID or password"
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Handle malformed JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: "Malformed request"
        });
    }
    next();
});

const server = app.listen(PORT, () => {
    console.log(`Mock College Login Service running on port ${PORT}`);
});

module.exports = server;
