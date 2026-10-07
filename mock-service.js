require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.MOCK_COLLEGE_PORT || 3000;
const TEST_STUDENT_ID = process.env.TEST_STUDENT_ID || 'TEST001';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test@123';

const path = require('path');

// Serve static repository files so frontend can be accessed directly
app.use(express.static(path.join(__dirname, '.')));

// ============================================================
// DATABASE INTEGRATION (SCRUM-31: MongoDB Atlas)
// ============================================================
const {
    getMongoClient,
    getDatabase,
    isDatabaseConfigured,
    getExamFromDb,
    getAllExamsFromDb,
    maskMongoUri
} = require('./db');

if (isDatabaseConfigured()) {
    console.log(`[AOVS Database] MONGODB_URI detected: ${maskMongoUri(process.env.MONGODB_URI)}`);
    getMongoClient()
        .then(() => console.log('[AOVS Database] MongoDB Atlas connection verified successfully.'))
        .catch(err => console.warn('[AOVS Database] MongoDB Atlas connection warning at startup:', err.message));
} else {
    console.log('[AOVS Database] MONGODB_URI not configured. Running with server-side repository.');
}

// ============================================================
// QUESTION & EXAM DATA MODELS (Server-Side Master Repository)
// Confidential examination data (sample answers, keys, rubrics)
// are strictly stored server-side and never exposed to students.
// ============================================================
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
            'This examination consists of written-answer questions and analytical problems.',
            'Type your answers thoroughly into the provided text area for each question.',
            'Ensure your explanations include time complexity analysis, data structure trade-offs, and design rationale where applicable.',
            'You can navigate between questions using the Next/Previous buttons or the Question Palette.',
            'Your written responses are preserved in session as you type and navigate.',
            'Ensure you submit your examination before the countdown timer expires.'
        ],
        sections: [
            { id: 'sec-1', name: 'Section 1: Data Structures & System Design', count: 2 },
            { id: 'sec-2', name: 'Section 2: Algorithmic Complexity & Optimization', count: 2 },
            { id: 'sec-3', name: 'Section 3: Computational Theory', count: 1 }
        ],
        questions: [
            {
                id: 'q-1',
                questionNumber: 1,
                sectionId: 'sec-1',
                sectionName: 'Section 1: Data Structures & System Design',
                type: 'written',
                marks: 5,
                negativeMarks: 0,
                title: 'Explain the internal architecture and working principle of a Hash Table. Discuss how hash collisions occur, and thoroughly explain at least two common collision resolution strategies: Separate Chaining and Open Addressing (Linear Probing or Double Hashing). Include average and worst-case time complexities for search, insert, and delete operations.',
                codeSnippet: null,
                codeLanguage: null,
                // Server-only confidential evaluation fields (NEVER sent to client)
                sampleAnswer: 'A Hash Table maps keys to values using a hash function compute an index into an array of buckets. Collisions occur when two distinct keys produce the same hash index. Resolution techniques include Separate Chaining (linked lists at each bucket) and Open Addressing (probing for vacant slots). Average complexity: O(1); Worst-case: O(n).',
                rubric: '3 marks for collision resolution explanations, 2 marks for complexity analysis.'
            },
            {
                id: 'q-2',
                questionNumber: 2,
                sectionId: 'sec-1',
                sectionName: 'Section 1: Data Structures & System Design',
                type: 'written',
                marks: 5,
                negativeMarks: 0,
                title: 'Compare a standard Binary Search Tree (BST) with a self-balancing AVL Tree. Explain the balance factor invariant, and detail how rotation mechanisms (Single LL/RR rotations and Double LR/RL rotations) restore balance after an insertion. Why does this guarantee O(log n) worst-case search height?',
                codeSnippet: null,
                codeLanguage: null,
                sampleAnswer: 'AVL trees enforce that for every node, the height difference between left and right subtrees is at most 1. Violations are fixed using 4 rotation types: LL, RR, LR, RL. This limits height to ~1.44 log2(n), guaranteeing O(log n) operations.',
                rubric: '2 marks for balance factor definition, 2 marks for rotation mechanics, 1 mark for asymptotic height proof.'
            },
            {
                id: 'q-3',
                questionNumber: 3,
                sectionId: 'sec-2',
                sectionName: 'Section 2: Algorithmic Complexity & Optimization',
                type: 'written',
                marks: 5,
                negativeMarks: 0,
                title: 'Analyze the time and space complexity of the recursive Fibonacci function shown in the code snippet. Explain why it exhibits exponential O(2^n) time complexity, and describe how memoization (top-down) or tabulation (bottom-up dynamic programming) reduces the time complexity to O(n) and auxiliary space to O(1).',
                codeSnippet: `def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)`,
                codeLanguage: 'python',
                sampleAnswer: 'The naive recursion branches into two subproblems at each step, forming a recursion tree with O(2^n) nodes. Dynamic programming caches subproblems: bottom-up iteration using two variables achieves O(n) time and O(1) space.',
                rubric: '2 marks for recursion tree complexity analysis, 3 marks for dynamic programming optimization.'
            },
            {
                id: 'q-4',
                questionNumber: 4,
                sectionId: 'sec-2',
                sectionName: 'Section 2: Algorithmic Complexity & Optimization',
                type: 'written',
                marks: 5,
                negativeMarks: 0,
                title: 'Explain why Dijkstra\'s shortest path algorithm fails in graphs containing negative-weight edges. How does the Bellman-Ford algorithm successfully accommodate negative edge weights, and how can it be used to detect the presence of negative-weight cycles in a directed graph?',
                codeSnippet: null,
                codeLanguage: null,
                sampleAnswer: 'Dijkstra greedily marks vertices as finalized assuming edge weights are non-negative. If negative edges exist, a shorter path to a finalized vertex might be discovered later. Bellman-Ford relaxes all |E| edges |V|-1 times; an additional relaxation that further reduces distance indicates a negative cycle.',
                rubric: '2.5 marks for Dijkstra limitation, 2.5 marks for Bellman-Ford relaxation and cycle detection.'
            },
            {
                id: 'q-5',
                questionNumber: 5,
                sectionId: 'sec-3',
                sectionName: 'Section 3: Computational Theory',
                type: 'written',
                marks: 5,
                negativeMarks: 0,
                title: 'Define the computational complexity classes P, NP, and NP-Complete. Explain the concept of polynomial-time reducibility and describe the fundamental significance of the Cook-Levin theorem in theoretical computer science.',
                codeSnippet: null,
                codeLanguage: null,
                sampleAnswer: 'P: solvable in polynomial time. NP: verifiable in polynomial time. NP-Complete: in NP and every problem in NP is polynomial-time reducible to it. Cook-Levin proved SAT is NP-Complete, establishing the foundation of NP-completeness theory.',
                rubric: '2 marks for class definitions, 2 marks for reducibility, 1 mark for Cook-Levin significance.'
            }
        ]
    },
    'CS301-MCQ': {
        id: 'CS301-MCQ',
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
                title: 'Which of the following operations have an average time complexity of O(1) when using a well-designed Hash Table with separate chaining? (Select all that apply)',
                codeSnippet: null,
                options: [
                    { id: 'A', text: 'Search / Key Lookup' },
                    { id: 'B', text: 'Key Insertion' },
                    { id: 'C', text: 'Finding the maximum key in sorted order' },
                    { id: 'D', text: 'Key Deletion' }
                ],
                correctOptions: ['A', 'B', 'D'],
                explanation: 'Search, insert, and delete are all O(1) average in a hash table. Finding the maximum requires searching all buckets (O(n)).'
            },
            {
                id: 'q-3',
                questionNumber: 3,
                sectionId: 'sec-1',
                sectionName: 'Section 1: Linear & Non-Linear Structures',
                type: 'single_choice',
                marks: 2,
                negativeMarks: 0.5,
                title: 'Consider the Python function below. What algorithm or pattern does it represent?',
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

/**
 * Sanitizes an exam object for students:
 * Strictly strips confidential answer keys, sample answers, and evaluation rubrics.
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
            options: q.options || null
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

// ============================================================
// EXAM API ENDPOINTS (SCRUM-31: MongoDB Atlas Integration)
// ============================================================

// GET /api/exam/active — Returns active exam with sanitized questions
app.get('/api/exam/active', async (req, res) => {
    try {
        const { simulate, examId, type } = req.query;

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

        const targetId = examId || (type === 'mcq' ? 'CS301-MCQ' : 'CS301-2026');

        // 1. If MongoDB Atlas is configured, retrieve from database
        if (isDatabaseConfigured()) {
            try {
                const dbExam = await getExamFromDb(targetId);
                if (dbExam) {
                    return res.status(200).json({
                        success: true,
                        source: 'mongodb',
                        exam: sanitizeExamForStudent(dbExam)
                    });
                }
                return res.status(404).json({
                    success: false,
                    message: `Examination '${targetId}' was not found in MongoDB.`
                });
            } catch (dbError) {
                console.error('[AOVS Database] Query error on /api/exam/active:', dbError.message);
                return res.status(500).json({
                    success: false,
                    message: 'Database error retrieving active examination.'
                });
            }
        }

        // 2. Fallback to server-side repository when MONGODB_URI is not set
        const activeExam = mockExams[targetId] || mockExams['CS301-2026'];
        if (!activeExam) {
            return res.status(404).json({
                success: false,
                message: 'No active exam found.'
            });
        }

        res.status(200).json({
            success: true,
            source: 'in-memory',
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
app.get('/api/exams', async (req, res) => {
    try {
        if (isDatabaseConfigured()) {
            try {
                const list = await getAllExamsFromDb();
                return res.status(200).json({ success: true, source: 'mongodb', exams: list });
            } catch (dbErr) {
                console.error('[AOVS Database] Error listing exams from DB:', dbErr.message);
                return res.status(500).json({ success: false, message: 'Database error retrieving exams.' });
            }
        }

        const list = Object.values(mockExams).map(exam => ({
            id: exam.id,
            title: exam.title,
            courseCode: exam.courseCode,
            durationMinutes: exam.durationMinutes,
            totalMarks: exam.totalMarks,
            questionsCount: exam.questions ? exam.questions.length : 0
        }));
        res.status(200).json({ success: true, source: 'in-memory', exams: list });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving exams' });
    }
});

// GET /api/exams/:id — Specific exam details
app.get('/api/exams/:id', async (req, res) => {
    try {
        const examId = req.params.id;
        if (isDatabaseConfigured()) {
            try {
                const dbExam = await getExamFromDb(examId);
                if (!dbExam) {
                    return res.status(404).json({
                        success: false,
                        message: `Exam with ID '${examId}' was not found in MongoDB.`
                    });
                }
                return res.status(200).json({
                    success: true,
                    source: 'mongodb',
                    exam: sanitizeExamForStudent(dbExam)
                });
            } catch (dbErr) {
                console.error('[AOVS Database] Error getting exam from DB:', dbErr.message);
                return res.status(500).json({ success: false, message: 'Database error retrieving exam.' });
            }
        }

        const exam = mockExams[examId];
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: `Exam with ID '${examId}' was not found.`
            });
        }
        res.status(200).json({
            success: true,
            source: 'in-memory',
            exam: sanitizeExamForStudent(exam)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error retrieving exam' });
    }
});

// POST /api/exams/:id/submit — Submit student responses
app.post('/api/exams/:id/submit', async (req, res) => {
    try {
        const { studentId, answers, timeSpentSeconds } = req.body;
        const examId = req.params.id;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required for submission.'
            });
        }

        const exam = (isDatabaseConfigured() ? await getExamFromDb(examId) : null) || mockExams[examId] || mockExams['CS301-2026'];
        const submissionId = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
        const submissionRecord = {
            submissionId,
            examId,
            studentId,
            answers: answers || {},
            timeSpentSeconds: timeSpentSeconds || 0,
            submittedAt: new Date().toISOString()
        };

        if (isDatabaseConfigured()) {
            try {
                const db = await getDatabase();
                if (db) {
                    await db.collection('submissions').insertOne(submissionRecord);
                }
            } catch (dbErr) {
                console.warn('[AOVS Database] Could not persist submission to MongoDB:', dbErr.message);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Exam submitted successfully.',
            receipt: {
                submissionId,
                examTitle: exam ? exam.title : 'Examination',
                studentId,
                questionsCount: exam && exam.questions ? exam.questions.length : 0,
                answeredCount: Object.keys(answers || {}).length,
                submittedAt: new Date().toLocaleTimeString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting your responses.'
        });
    }
});

// POST /api/exam/answers — Submit a single written answer (SCRUM-10)
app.post('/api/exam/answers', async (req, res) => {
    try {
        const { studentId, examId, questionId, answerText } = req.body;

        if (!studentId || !examId || !questionId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: studentId, examId, and questionId are required.'
            });
        }

        // Validate exam exists
        const dbExam = isDatabaseConfigured() ? await getExamFromDb(examId) : mockExams[examId];
        if (!dbExam) {
            return res.status(404).json({ success: false, message: 'Invalid exam ID.' });
        }

        // Validate question belongs to exam
        const question = dbExam.questions.find(q => q.id === questionId);
        if (!question) {
            return res.status(400).json({ success: false, message: 'Question does not belong to the specified exam.' });
        }

        const answerRecord = {
            studentId,
            examId,
            questionId,
            answerText: answerText || '',
            updatedAt: new Date().toISOString()
        };

        if (isDatabaseConfigured()) {
            try {
                const db = await getDatabase();
                if (db) {
                    await db.collection('answers').updateOne(
                        { studentId, examId, questionId },
                        {
                            $set: answerRecord,
                            $setOnInsert: { createdAt: new Date().toISOString() }
                        },
                        { upsert: true }
                    );
                }
            } catch (dbErr) {
                console.error('[AOVS Database] Failed to persist written answer:', dbErr.message);
                return res.status(500).json({ success: false, message: 'Database error saving answer.' });
            }
        } else {
            // Mock memory persistence
            if (!global.mockAnswers) global.mockAnswers = {};
            global.mockAnswers[`${studentId}_${examId}_${questionId}`] = answerRecord;
        }

        res.status(200).json({
            success: true,
            message: 'Answer saved successfully.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error while submitting answer.' });
    }
});

// GET /api/exam/:examId/answers — Retrieve a student's saved written answers
app.get('/api/exam/:examId/answers', async (req, res) => {
    try {
        const examId = req.params.examId;
        const studentId = req.query.studentId;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student ID is required.' });
        }

        let answersList = [];

        if (isDatabaseConfigured()) {
            try {
                const db = await getDatabase();
                if (db) {
                    answersList = await db.collection('answers').find({ examId, studentId }).toArray();
                }
            } catch (dbErr) {
                console.error('[AOVS Database] Failed to retrieve written answers:', dbErr.message);
                return res.status(500).json({ success: false, message: 'Database error retrieving answers.' });
            }
        } else {
            if (global.mockAnswers) {
                answersList = Object.values(global.mockAnswers).filter(a => a.examId === examId && a.studentId === studentId);
            }
        }

        const answersMap = {};
        answersList.forEach(ans => {
            answersMap[ans.questionId] = ans.answerText;
        });

        res.status(200).json({ success: true, answers: answersMap });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error retrieving answers.' });
    }
});

// ============================================================
// STUDENT LOGIN ENDPOINT (Existing - preserved intact)
// ============================================================
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

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`AOVS Mock Assessment & College Login Service running on port ${PORT}`);
});

// Support port 5500 mirror for Playwright tests and local live-server compatibility
try {
    const mirrorServer = app.listen(5500, '0.0.0.0', () => {
        console.log(`AOVS Static & Test Mirror active on port 5500`);
    });
    mirrorServer.on('error', (err) => {
        // Port 5500 already bound, ignore gracefully
    });
} catch (e) {}

module.exports = server;
