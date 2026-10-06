require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const path = require('path');

// Serve static repository files so frontend can be accessed directly
app.use(express.static(path.join(__dirname, '.')));

const PORT = process.env.MOCK_COLLEGE_PORT || 3000;
const TEST_STUDENT_ID = process.env.TEST_STUDENT_ID || 'TEST001';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test@123';

// ==========================================
// EXAM DATA STORE (Server-side ground truth)
// Note: correctOption/correctOptions and explanations
// are strictly server-side and never exposed to the student.
// ==========================================
const mockExams = {
    'CS301-2026': {
        id: 'CS301-2026',
        title: 'Data Structures & Algorithms Certification Examination',
        courseCode: 'CS-301',
        courseName: 'Data Structures and Algorithm Analysis',
        department: 'School of Computing & Information Technology',
        academicTerm: 'Fall 2026 Final Assessment',
        durationMinutes: 45,
        totalMarks: 25,
        passingMarks: 12,
        proctorMode: 'AI Automated + Live Proctor',
        instructions: [
            'This examination consists of 10 questions divided into three conceptual sections.',
            'Pay attention to the question type indicator: Single Choice (radio) vs Multiple Choice (checkbox).',
            'Single-choice questions allow selecting only one option.',
            'Multiple-choice questions may have one or more valid options. Select all that apply.',
            'You can flag questions using "Mark for Review" to revisit them at any time.',
            'Navigate between questions using the Next/Previous buttons or the numbered Question Palette.',
            'Ensure you submit your examination before the countdown timer expires.'
        ],
        sections: [
            { id: 'sec-1', name: 'Section 1: Linear & Non-Linear Structures', count: 4 },
            { id: 'sec-2', name: 'Section 2: Complexity & Sorting Paradigms', count: 3 },
            { id: 'sec-3', name: 'Section 3: Graph Algorithms & Optimization', count: 3 }
        ],
        questions: [
            {
                id: 'q-1',
                questionNumber: 1,
                sectionId: 'sec-1',
                sectionName: 'Section 1: Linear & Non-Linear Structures',
                type: 'single_choice',
                marks: 2,
                negativeMarks: 0.5,
                title: 'Which of the following data structures is strictly based on the Last-In, First-Out (LIFO) access principle?',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'Queue' },
                    { id: 'B', text: 'Stack' },
                    { id: 'C', text: 'Min-Heap' },
                    { id: 'D', text: 'Singly Linked List' }
                ],
                // Server-only data (stripped when sending to student)
                correctOption: 'B',
                explanation: 'A stack strictly enforces LIFO order where the last item pushed is the first to be popped.'
            },
            {
                id: 'q-2',
                questionNumber: 2,
                sectionId: 'sec-1',
                sectionName: 'Section 1: Linear & Non-Linear Structures',
                type: 'multiple_choice',
                marks: 3,
                negativeMarks: 0.5,
                title: 'Which of the following operations typically execute in O(1) average time complexity on a well-designed Hash Map? (Select all that apply)',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'Inserting a new key-value pair' },
                    { id: 'B', text: 'Looking up a value associated with an existing key' },
                    { id: 'C', text: 'Finding the minimum or maximum key in the entire map' },
                    { id: 'D', text: 'Deleting an entry by its key' }
                ],
                correctOptions: ['A', 'B', 'D'],
                explanation: 'Hash maps provide O(1) average time for insertion, lookup, and deletion. Finding the global minimum/maximum requires O(n) scan without additional auxiliary ordering.'
            },
            {
                id: 'q-3',
                questionNumber: 3,
                sectionId: 'sec-1',
                sectionName: 'Section 1: Linear & Non-Linear Structures',
                type: 'single_choice',
                marks: 2,
                negativeMarks: 0.5,
                title: 'Consider the recursive algorithm below. Which fundamental tree operation does this function implement?',
                codeSnippet: `def search_node(root, target):\n    if root is None or root.val == target:\n        return root\n    if target < root.val:\n        return search_node(root.left, target)\n    return search_node(root.right, target)`,
                codeLanguage: 'python',
                options: [
                    { id: 'A', text: 'Breadth-First Search (BFS) level-order traversal' },
                    { id: 'B', text: 'Key lookup in a Binary Search Tree (BST)' },
                    { id: 'C', text: 'Topological sort of a Directed Acyclic Graph' },
                    { id: 'D', text: 'Finding lowest common ancestor in a general tree' }
                ],
                correctOption: 'B',
                explanation: 'This compares target to root.val and branches left if smaller or right if larger, which is standard BST key lookup.'
            },
            {
                id: 'q-4',
                questionNumber: 4,
                sectionId: 'sec-1',
                sectionName: 'Section 1: Linear & Non-Linear Structures',
                type: 'multiple_choice',
                marks: 3,
                negativeMarks: 0.5,
                title: 'Which of the following tree structures are guaranteed self-balancing binary search trees with worst-case O(log n) search height? (Select all that apply)',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'AVL Tree' },
                    { id: 'B', text: 'Red-Black Tree' },
                    { id: 'C', text: 'Standard Unbalanced Binary Search Tree' },
                    { id: 'D', text: 'Splay Tree' }
                ],
                correctOptions: ['A', 'B'],
                explanation: 'AVL trees and Red-Black trees strictly guarantee O(log n) worst-case height. Splay trees guarantee amortized O(log n), but a single operation can be O(n).'
            },
            {
                id: 'q-5',
                questionNumber: 5,
                sectionId: 'sec-2',
                sectionName: 'Section 2: Complexity & Sorting Paradigms',
                type: 'single_choice',
                marks: 2,
                negativeMarks: 0.5,
                title: 'Under which of the following graph conditions is standard Dijkstra\'s shortest path algorithm guaranteed to fail or produce incorrect distances?',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'Directed Acyclic Graphs (DAGs)' },
                    { id: 'B', text: 'Graphs with multiple disconnected components' },
                    { id: 'C', text: 'Graphs containing negative-weight edges' },
                    { id: 'D', text: 'Dense graphs with thousands of vertices and unit weights' }
                ],
                correctOption: 'C',
                explanation: 'Dijkstra assumes that adding an edge never decreases path cost; negative edges violate this greedy premise.'
            },
            {
                id: 'q-6',
                questionNumber: 6,
                sectionId: 'sec-2',
                sectionName: 'Section 2: Complexity & Sorting Paradigms',
                type: 'single_choice',
                marks: 2,
                negativeMarks: 0.5,
                title: 'Which fundamental algorithmic design paradigm does Merge Sort utilize to achieve guaranteed O(n log n) sorting?',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'Greedy choice heuristic' },
                    { id: 'B', text: 'Divide and Conquer' },
                    { id: 'C', text: 'Dynamic Programming with memoization table' },
                    { id: 'D', text: 'Backtracking with branch-and-bound pruning' }
                ],
                correctOption: 'B',
                explanation: 'Merge sort divides the array into halves, recursively sorts each half, and merges the two sorted halves.'
            },
            {
                id: 'q-7',
                questionNumber: 7,
                sectionId: 'sec-2',
                sectionName: 'Section 2: Complexity & Sorting Paradigms',
                type: 'multiple_choice',
                marks: 3,
                negativeMarks: 0.5,
                title: 'Which of the following problems belong to complexity class P (solvable in deterministic polynomial time)? (Select all that apply)',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'Minimum Spanning Tree (MST) computation via Kruskal\'s or Prim\'s algorithm' },
                    { id: 'B', text: 'Traveling Salesperson Problem (TSP) exact optimal tour' },
                    { id: 'C', text: 'Topological sorting of a directed acyclic graph' },
                    { id: 'D', text: 'Single-source shortest path in an unweighted graph via BFS' }
                ],
                correctOptions: ['A', 'C', 'D'],
                explanation: 'MST (O(E log V)), Topological Sort (O(V+E)), and BFS (O(V+E)) are all polynomial time. Exact TSP optimization is NP-hard.'
            },
            {
                id: 'q-8',
                questionNumber: 8,
                sectionId: 'sec-3',
                sectionName: 'Section 3: Graph Algorithms & Optimization',
                type: 'single_choice',
                marks: 3,
                negativeMarks: 0.5,
                title: 'Examine the C implementation below for calculating the nth Fibonacci number. What is its auxiliary space complexity?',
                codeSnippet: `int fibonacci(int n) {\n    if (n <= 1) return n;\n    int dp[n + 1];\n    dp[0] = 0;\n    dp[1] = 1;\n    for (int i = 2; i <= n; i++) {\n        dp[i] = dp[i - 1] + dp[i - 2];\n    }\n    return dp[n];\n}`,
                codeLanguage: 'c',
                options: [
                    { id: 'A', text: 'O(1) constant space' },
                    { id: 'B', text: 'O(n) linear space' },
                    { id: 'C', text: 'O(2^n) exponential space' },
                    { id: 'D', text: 'O(n log n) logarithmic space' }
                ],
                correctOption: 'B',
                explanation: 'The function allocates an array dp[n + 1] of size proportional to n, resulting in O(n) auxiliary space complexity.'
            },
            {
                id: 'q-9',
                questionNumber: 9,
                sectionId: 'sec-3',
                sectionName: 'Section 3: Graph Algorithms & Optimization',
                type: 'multiple_choice',
                marks: 3,
                negativeMarks: 0.5,
                title: 'Which of the following conditions are necessary and sufficient for an undirected, connected graph to contain an Eulerian Circuit? (Select all that apply)',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'All vertices with non-zero degree belong to a single connected component' },
                    { id: 'B', text: 'Every vertex in the graph must have an even degree' },
                    { id: 'C', text: 'The graph must be a bipartite graph' },
                    { id: 'D', text: 'Exactly two vertices have an odd degree' }
                ],
                correctOptions: ['A', 'B'],
                explanation: 'Euler\'s theorem dictates that a connected undirected graph has an Eulerian circuit if and only if every vertex has an even degree.'
            },
            {
                id: 'q-10',
                questionNumber: 10,
                sectionId: 'sec-3',
                sectionName: 'Section 3: Graph Algorithms & Optimization',
                type: 'single_choice',
                marks: 2,
                negativeMarks: 0.5,
                title: 'What is the worst-case asymptotic time complexity of searching for an element in an AVL tree containing n nodes?',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'O(1)' },
                    { id: 'B', text: 'O(log n)' },
                    { id: 'C', text: 'O(n)' },
                    { id: 'D', text: 'O(n log n)' }
                ],
                correctOption: 'B',
                explanation: 'Because an AVL tree strictly enforces a balance factor of -1, 0, or +1, its maximum height is bound by ~1.44 log2(n), giving O(log n) worst-case search time.'
            }
        ]
    }
};

// Store for student exam submissions
const examSubmissions = [];

/**
 * Sanitizes an exam object for the student, guaranteeing
 * that correct answers and sensitive evaluation fields are never exposed.
 */
function sanitizeExamForStudent(exam) {
    return {
        id: exam.id,
        title: exam.title,
        courseCode: exam.courseCode,
        courseName: exam.courseName,
        department: exam.department,
        academicTerm: exam.academicTerm,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        proctorMode: exam.proctorMode,
        instructions: exam.instructions,
        sections: exam.sections,
        totalQuestions: exam.questions.length,
        questions: exam.questions.map(q => ({
            id: q.id,
            questionNumber: q.questionNumber,
            sectionId: q.sectionId,
            sectionName: q.sectionName,
            type: q.type,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            title: q.title,
            codeSnippet: q.codeSnippet,
            codeLanguage: q.codeLanguage,
            options: q.options
        }))
    };
}

// Convenient redirects for student routing
app.get('/exam', (req, res) => {
    res.redirect('/Exam/index.html');
});
app.get('/login', (req, res) => {
    res.redirect('/Student%20Login/Creating%20Login_UI/index.html');
});

// ==========================================
// EXAM API ENDPOINTS
// ==========================================

// GET /api/exam/active — Returns active exam with sanitized questions
app.get('/api/exam/active', (req, res) => {
    try {
        const { simulate } = req.query;

        // Support test simulation of error states
        if (simulate === 'error') {
            return res.status(500).json({
                success: false,
                message: 'Internal server error while fetching assessment.'
            });
        }

        // Support test simulation of empty states
        if (simulate === 'empty') {
            return res.status(200).json({
                success: true,
                exam: {
                    id: 'EMPTY-EXAM',
                    title: 'Empty Assessment Preview',
                    courseCode: 'N/A',
                    questions: []
                }
            });
        }

        const activeExam = mockExams['CS301-2026'];
        if (!activeExam) {
            return res.status(404).json({
                success: false,
                message: 'No active exam found.'
            });
        }

        res.status(200).json({
            success: true,
            exam: sanitizeExamForStudent(activeExam)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error retrieving active exam'
        });
    }
});

// GET /api/exams — List all available exams
app.get('/api/exams', (req, res) => {
    const list = Object.values(mockExams).map(exam => ({
        id: exam.id,
        title: exam.title,
        courseCode: exam.courseCode,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        questionsCount: exam.questions.length
    }));
    res.status(200).json({ success: true, exams: list });
});

// GET /api/exams/:id — Specific exam details
app.get('/api/exams/:id', (req, res) => {
    const exam = mockExams[req.params.id];
    if (!exam) {
        return res.status(404).json({
            success: false,
            message: `Exam with ID '${req.params.id}' was not found.`
        });
    }
    res.status(200).json({
        success: true,
        exam: sanitizeExamForStudent(exam)
    });
});

// POST /api/exams/:id/submit — Submit student responses
app.post('/api/exams/:id/submit', (req, res) => {
    try {
        const { studentId, answers, timeSpentSeconds } = req.body;
        const examId = req.params.id;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required for submission.'
            });
        }

        const exam = mockExams[examId];
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: `Exam ${examId} not found.`
            });
        }

        const submissionId = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
        const submissionRecord = {
            submissionId,
            examId,
            studentId,
            answers: answers || {},
            timeSpentSeconds: timeSpentSeconds || 0,
            submittedAt: new Date().toISOString()
        };

        examSubmissions.push(submissionRecord);

        res.status(200).json({
            success: true,
            message: 'Exam submitted successfully.',
            receipt: {
                submissionId,
                examTitle: exam.title,
                studentId,
                questionsCount: exam.questions.length,
                answeredCount: Object.keys(answers || {}).length,
                submittedAt: submissionRecord.submittedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting your responses.'
        });
    }
});

// ==========================================
// STUDENT LOGIN ENDPOINT (Existing)
// ==========================================
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
                    studentId: TEST_STUDENT_ID,
                    name: "Akil Kumar",
                    college: "AOVS Institute of Technology",
                    activeExamId: "CS301-2026"
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

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`AOVS Mock Assessment & College Login Service running on port ${PORT}`);
});

// Support port 5500 mirror for Playwright tests and local live-server compatibility
try {
    const mirrorServer = app.listen(5500, '0.0.0.0', () => {
        console.log(`AOVS Static & Test Mirror active on port 5500`);
    });
    mirrorServer.on('error', (err) => {
        // Port 5500 already bound (e.g. by Live Server), ignore gracefully
    });
} catch (e) {}

module.exports = server;

