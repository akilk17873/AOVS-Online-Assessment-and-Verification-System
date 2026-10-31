require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.MOCK_COLLEGE_PORT || 3000;
const TEST_STUDENT_ID = process.env.TEST_STUDENT_ID || 'TEST001';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Test@123';
const TEST_INSTRUCTOR_ID = process.env.TEST_INSTRUCTOR_ID || 'INST001';
const TEST_INSTRUCTOR_PASSWORD = process.env.TEST_INSTRUCTOR_PASSWORD || 'Instructor@123';
const TEST_ADMIN_ID = process.env.TEST_ADMIN_ID || 'admin';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin@123';

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

// ============================================================
// IN-MEMORY SUBMISSIONS REPOSITORY (SCRUM-8: Review Dashboard)
// Supports fallback & fast retrieval with response telemetry
// ============================================================
const inMemorySubmissions = [
    {
        submissionId: 'SUB-CS301-101',
        examId: 'CS301-2026',
        examTitle: 'Data Structures & Algorithms Certification Examination',
        studentId: 'TEST001',
        studentName: 'Akil Kumar',
        department: 'School of Computing & Information Technology',
        answers: {
            'CS301-Q1': 'A Hash Table achieves expected O(1) time complexity for insertions and lookups because a deterministic hash function maps keys directly into array bucket indices. In contrast, an Array requires O(n) sequential scan for unsorted elements or O(log n) when maintained sorted. Hash collisions are handled via chaining or open addressing.',
            'CS301-Q2': 'An adjacency list is far more space-efficient for sparse graphs: its memory footprint is O(V + E) versus O(V^2) for an adjacency matrix. It also facilitates faster vertex neighbor iterations proportional to vertex degree.',
            'CS301-Q3': 'QuickSort suffers O(n^2) worst-case time complexity when the chosen pivot is continually the minimum or maximum element, yielding asymmetric subproblems of sizes 0 and n - 1. Mitigation strategies include median-of-three pivot selection, randomized pivots, or introsort.',
            'CS301-Q4': 'A Red-Black Tree enforces maximum tree height of 2 * log2(n + 1) using color rules and rotations, avoiding the degradation of unbalanced BSTs into linked lists.',
            'CS301-Q5': 'Dynamic programming relies on optimal substructure and overlapping subproblems to cache solutions and avoid combinatorial explosion.'
        },
        timeSpentSeconds: 940,
        formattedTimeSpent: '15m 40s',
        responseTimes: {
            totalExamTimeSeconds: 940,
            averageTimePerQuestionSeconds: 188,
            perQuestion: {
                'q-1': { questionId: 'q-1', questionNumber: 1, totalTimeSeconds: 175, formattedTime: '02m 55s', interactions: 8 },
                'CS301-Q1': { questionId: 'CS301-Q1', questionNumber: 1, totalTimeSeconds: 175, formattedTime: '02m 55s', interactions: 8 },
                'CS301-Q2': { questionId: 'CS301-Q2', questionNumber: 2, totalTimeSeconds: 190, formattedTime: '03m 10s', interactions: 6 },
                'CS301-Q3': { questionId: 'CS301-Q3', questionNumber: 3, totalTimeSeconds: 215, formattedTime: '03m 35s', interactions: 10 },
                'CS301-Q4': { questionId: 'CS301-Q4', questionNumber: 4, totalTimeSeconds: 180, formattedTime: '03m 00s', interactions: 7 },
                'CS301-Q5': { questionId: 'CS301-Q5', questionNumber: 5, totalTimeSeconds: 180, formattedTime: '03m 00s', interactions: 5 }
            }
        },
        status: 'Pending Review',
        marks: {},
        totalScore: null,
        maxScore: 25,
        instructorFeedback: '',
        submittedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        submissionId: 'SUB-CS301-102',
        examId: 'CS301-2026',
        examTitle: 'Data Structures & Algorithms Certification Examination',
        studentId: 'STU102',
        studentName: 'Priya Sharma',
        department: 'School of Computing & Information Technology',
        answers: {
            'CS301-Q1': 'Hash tables compute direct index locations with hashing algorithms, enabling O(1) operations. Array searches require O(n) iteration across all indexes.',
            'CS301-Q2': 'Adjacency matrices allocate V x V memory regardless of actual connections, while adjacency lists store only existent edges, optimizing memory for sparse graphs.',
            'CS301-Q3': 'QuickSort worst-case O(n^2) occurs on pre-sorted arrays without randomized pivoting.',
            'CS301-Q4': 'Self-balancing trees prevent deep tree chains, keeping search paths logarithmic.',
            'CS301-Q5': 'Memoization preserves computed overlapping sub-results to avoid recomputation.'
        },
        timeSpentSeconds: 1120,
        formattedTimeSpent: '18m 40s',
        responseTimes: {
            totalExamTimeSeconds: 1120,
            averageTimePerQuestionSeconds: 224,
            perQuestion: {
                'CS301-Q1': { questionId: 'CS301-Q1', questionNumber: 1, totalTimeSeconds: 210, formattedTime: '03m 30s', interactions: 5 },
                'CS301-Q2': { questionId: 'CS301-Q2', questionNumber: 2, totalTimeSeconds: 240, formattedTime: '04m 00s', interactions: 7 },
                'CS301-Q3': { questionId: 'CS301-Q3', questionNumber: 3, totalTimeSeconds: 230, formattedTime: '03m 50s', interactions: 8 },
                'CS301-Q4': { questionId: 'CS301-Q4', questionNumber: 4, totalTimeSeconds: 220, formattedTime: '03m 40s', interactions: 6 },
                'CS301-Q5': { questionId: 'CS301-Q5', questionNumber: 5, totalTimeSeconds: 220, formattedTime: '03m 40s', interactions: 4 }
            }
        },
        status: 'Reviewed',
        marks: { 'CS301-Q1': 5, 'CS301-Q2': 5, 'CS301-Q3': 4, 'CS301-Q4': 5, 'CS301-Q5': 4 },
        totalScore: 23,
        maxScore: 25,
        instructorFeedback: 'Outstanding analytical explanations and thorough complexity justifications.',
        submittedAt: new Date(Date.now() - 7200000).toISOString()
    }
];

// Convenient redirects for unified platform routing
app.get(['/exam', '/assessment', '/assessments'], (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(`/Exam/index.html${qs}`);
});
app.get(['/login', '/portal', '/student-login'], (req, res) => {
    res.redirect('/Student%20Login/Creating%20Login_UI/index.html');
});
app.get(['/instructor', '/instructor/login', '/admin', '/admin/login'], (req, res) => {
    res.redirect('/Instructor/login.html');
});
app.get(['/instructor/dashboard', '/dashboard', '/review-dashboard', '/admin/dashboard'], (req, res) => {
    res.redirect('/Instructor/dashboard.html');
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
            } catch (dbError) {
                console.warn('[AOVS Database] MongoDB query error on /api/exam/active, falling back to repository:', dbError.message);
            }
        }

        // 2. Fallback to server-side repository when MONGODB_URI is not set or DB is unavailable
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
                console.warn('[AOVS Database] MongoDB error listing exams, falling back to repository:', dbErr.message);
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
                if (dbExam) {
                    return res.status(200).json({
                        success: true,
                        source: 'mongodb',
                        exam: sanitizeExamForStudent(dbExam)
                    });
                }
            } catch (dbErr) {
                console.warn('[AOVS Database] MongoDB error getting exam, falling back to repository:', dbErr.message);
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

// POST /api/exams/:id/submit — Submit student responses (SCRUM-11: Response Time Tracking)
app.post('/api/exams/:id/submit', async (req, res) => {
    try {
        const { studentId, answers, timeSpentSeconds, responseTimes } = req.body;
        const examId = req.params.id;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required for submission.'
            });
        }

        const exam = (isDatabaseConfigured() ? await getExamFromDb(examId) : null) || mockExams[examId] || mockExams['CS301-2026'];
        const submissionId = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

        // SCRUM-11: Response time calculations & telemetry
        const totalDuration = typeof timeSpentSeconds === 'number' ? timeSpentSeconds : 0;
        const minutes = Math.floor(totalDuration / 60);
        const seconds = totalDuration % 60;
        const formattedTimeSpent = `${minutes}m ${String(seconds).padStart(2, '0')}s`;
        const qCount = (exam && exam.questions ? exam.questions.length : 0) || Object.keys(answers || {}).length || 1;
        const avgResponseTimeSeconds = Math.round(totalDuration / qCount);

        const submissionRecord = {
            submissionId,
            examId,
            studentId,
            answers: answers || {},
            timeSpentSeconds: totalDuration,
            responseTimes: responseTimes || {
                totalExamTimeSeconds: totalDuration,
                averageTimePerQuestionSeconds: avgResponseTimeSeconds,
                perQuestion: {}
            },
            submittedAt: new Date().toISOString()
        };

        // Save to in-memory store for instant review dashboard visibility
        inMemorySubmissions.unshift({
            ...submissionRecord,
            studentName: studentId === TEST_STUDENT_ID ? 'Akil Kumar' : `Student ${studentId}`,
            status: 'Pending Review',
            examTitle: exam ? exam.title : 'Examination',
            maxScore: exam && exam.totalMarks ? exam.totalMarks : 25,
            totalScore: null,
            marks: {},
            instructorFeedback: ''
        });

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
                timeSpentSeconds: totalDuration,
                formattedTimeSpent,
                averageResponseTimeSeconds: avgResponseTimeSeconds,
                responseTimes: submissionRecord.responseTimes,
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

        // Role Separation Check (SCRUM-8): Reject instructor/admin credentials on student portal
        if ((studentId === TEST_INSTRUCTOR_ID && password === TEST_INSTRUCTOR_PASSWORD) ||
            (studentId === TEST_ADMIN_ID && password === TEST_ADMIN_PASSWORD)) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Instructor credentials cannot access student portal. Please sign in via the Instructor Portal."
            });
        }

        if (studentId === TEST_STUDENT_ID && password === TEST_PASSWORD) {
            return res.status(200).json({
                success: true,
                message: "Authentication successful",
                student: {
                    studentId: TEST_STUDENT_ID,
                    name: "Akil Kumar"
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

// ============================================================
// INSTRUCTOR & ADMIN AUTHENTICATION (SCRUM-8)
// Dedicated role-based authentication endpoint
// ============================================================
app.post(['/api/instructor/login', '/api/admin/login'], (req, res) => {
    try {
        const id = (req.body.instructorId || req.body.username || req.body.email || req.body.id || '').trim();
        const password = req.body.password || '';

        if (!id || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing instructor ID or password"
            });
        }

        // Role-Based Separation: Student credentials cannot log into instructor portal
        if (id === TEST_STUDENT_ID && password === TEST_PASSWORD) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Student credentials cannot access instructor review portal"
            });
        }

        // Validate Instructor credentials
        if (id === TEST_INSTRUCTOR_ID && password === TEST_INSTRUCTOR_PASSWORD) {
            return res.status(200).json({
                success: true,
                message: "Instructor authentication successful",
                role: "instructor",
                token: `inst-session-${Date.now()}`,
                user: {
                    id: TEST_INSTRUCTOR_ID,
                    name: "Prof. Darshan K",
                    email: "darshan.k@aovs.edu",
                    role: "instructor",
                    department: "School of Computing & Information Technology",
                    title: "Lead Assessment Evaluator",
                    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                }
            });
        }

        // Validate Administrator credentials
        if (id.toLowerCase() === TEST_ADMIN_ID.toLowerCase() && password === TEST_ADMIN_PASSWORD) {
            return res.status(200).json({
                success: true,
                message: "Administrator authentication successful",
                role: "admin",
                token: `admin-session-${Date.now()}`,
                user: {
                    id: TEST_ADMIN_ID,
                    name: "System Administrator",
                    email: "admin@aovs.edu",
                    role: "admin",
                    department: "Academic Affairs & Examination Board",
                    title: "System Administrator",
                    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid instructor ID or password"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error during instructor authentication"
        });
    }
});

// ============================================================
// INSTRUCTOR REVIEW DASHBOARD APIS (SCRUM-8)
// Endpoints for retrieving submissions, grading, telemetry metrics
// ============================================================

// GET /api/instructor/submissions — List all student submissions with telemetry summaries
app.get('/api/instructor/submissions', async (req, res) => {
    try {
        let submissions = [...inMemorySubmissions];

        if (isDatabaseConfigured()) {
            try {
                const db = await getDatabase();
                if (db) {
                    const dbSubmissions = await db.collection('submissions').find({}).sort({ submittedAt: -1 }).toArray();
                    if (dbSubmissions && dbSubmissions.length > 0) {
                        // Merge with in-memory store, avoiding duplicates by submissionId
                        const existingIds = new Set(submissions.map(s => s.submissionId));
                        dbSubmissions.forEach(sub => {
                            if (!existingIds.has(sub.submissionId)) {
                                submissions.push({
                                    ...sub,
                                    studentName: sub.studentName || (sub.studentId === TEST_STUDENT_ID ? 'Akil Kumar' : `Student ${sub.studentId}`),
                                    status: sub.status || 'Pending Review',
                                    maxScore: sub.maxScore || 25
                                });
                            }
                        });
                    }
                }
            } catch (dbErr) {
                console.warn('[AOVS Database] MongoDB read error in instructor submissions:', dbErr.message);
            }
        }

        const formatted = submissions.map(sub => {
            const timeSec = sub.timeSpentSeconds || 0;
            const minutes = Math.floor(timeSec / 60);
            const seconds = timeSec % 60;
            const formattedTime = `${minutes}m ${String(seconds).padStart(2, '0')}s`;

            const answeredCount = Object.keys(sub.answers || {}).length;
            const avgRespSec = (sub.responseTimes && sub.responseTimes.averageTimePerQuestionSeconds)
                ? sub.responseTimes.averageTimePerQuestionSeconds
                : (answeredCount > 0 ? Math.round(timeSec / answeredCount) : 0);

            return {
                submissionId: sub.submissionId,
                examId: sub.examId || 'CS301-2026',
                examTitle: sub.examTitle || 'Data Structures & Algorithms Certification Examination',
                studentId: sub.studentId,
                studentName: sub.studentName || (sub.studentId === TEST_STUDENT_ID ? 'Akil Kumar' : `Student ${sub.studentId}`),
                department: sub.department || 'School of Computing & Information Technology',
                answeredCount: answeredCount,
                questionsCount: (sub.responseTimes && sub.responseTimes.perQuestion ? Object.keys(sub.responseTimes.perQuestion).length : 5) || 5,
                timeSpentSeconds: timeSec,
                formattedTimeSpent: sub.formattedTimeSpent || formattedTime,
                averageResponseTimeSeconds: avgRespSec,
                formattedAvgResponseTime: `${String(Math.floor(avgRespSec / 60)).padStart(2, '0')}m ${String(avgRespSec % 60).padStart(2, '0')}s`,
                status: sub.status || 'Pending Review',
                totalScore: sub.totalScore !== undefined ? sub.totalScore : null,
                maxScore: sub.maxScore || 25,
                submittedAt: sub.submittedAt
            };
        });

        res.status(200).json({
            success: true,
            count: formatted.length,
            submissions: formatted
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve student submissions."
        });
    }
});

// GET /api/instructor/submissions/:id — Detailed single submission with questions & answer keys
app.get('/api/instructor/submissions/:id', async (req, res) => {
    try {
        const submissionId = req.params.id;
        let submission = inMemorySubmissions.find(s => s.submissionId === submissionId);

        if (!submission && isDatabaseConfigured()) {
            try {
                const db = await getDatabase();
                if (db) {
                    submission = await db.collection('submissions').findOne({ submissionId });
                }
            } catch (dbErr) {
                console.warn('[AOVS Database] MongoDB error finding submission:', dbErr.message);
            }
        }

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: `Submission with ID '${submissionId}' was not found.`
            });
        }

        // Retrieve master questions to display side-by-side with student answers
        const examId = submission.examId || 'CS301-2026';
        let exam = null;
        if (isDatabaseConfigured()) {
            try {
                exam = await getExamFromDb(examId);
            } catch (e) {}
        }
        if (!exam) {
            exam = mockExams[examId] || mockExams['CS301-2026'];
        }

        const questionsWithAnswers = (exam.questions || []).map((q, idx) => {
            const qNum = q.questionNumber || idx + 1;
            const studentAnswer = (submission.answers || {})[q.id] ||
                (submission.answers || {})[`CS301-Q${qNum}`] ||
                (submission.answers || {})[`q-${qNum}`] ||
                '(No response recorded)';
            const qTelemetry = (submission.responseTimes && submission.responseTimes.perQuestion && (
                submission.responseTimes.perQuestion[q.id] ||
                submission.responseTimes.perQuestion[`q-${qNum}`] ||
                submission.responseTimes.perQuestion[`CS301-Q${qNum}`]
            )) || {
                questionId: q.id,
                questionNumber: qNum,
                totalTimeSeconds: 175,
                formattedTime: '02m 55s',
                interactions: 8
            };
            const marksAwarded = (submission.marks || {})[q.id] !== undefined
                ? (submission.marks || {})[q.id]
                : (submission.marks || {})[`CS301-Q${qNum}`];

            return {
                id: q.id,
                questionNumber: q.questionNumber,
                title: q.title,
                type: q.type,
                maxMarks: q.marks,
                negativeMarks: q.negativeMarks || 0,
                studentAnswer: studentAnswer,
                sampleAnswer: q.sampleAnswer || null,
                evaluationRubric: q.evaluationRubric || null,
                responseTelemetry: qTelemetry ? {
                    totalTimeSeconds: qTelemetry.totalTimeSeconds,
                    formattedTime: qTelemetry.formattedTime,
                    interactions: qTelemetry.interactions
                } : null,
                awardedMarks: marksAwarded !== undefined ? marksAwarded : null
            };
        });

        res.status(200).json({
            success: true,
            submission: {
                submissionId: submission.submissionId,
                examId: examId,
                examTitle: exam.title,
                studentId: submission.studentId,
                studentName: submission.studentName || (submission.studentId === TEST_STUDENT_ID ? 'Akil Kumar' : `Student ${submission.studentId}`),
                status: submission.status || 'Pending Review',
                timeSpentSeconds: submission.timeSpentSeconds,
                formattedTimeSpent: submission.formattedTimeSpent,
                responseTimes: submission.responseTimes,
                totalScore: submission.totalScore,
                maxScore: exam.totalMarks || submission.maxScore || 25,
                marks: submission.marks || {},
                instructorFeedback: submission.instructorFeedback || '',
                submittedAt: submission.submittedAt,
                questions: questionsWithAnswers
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load submission details."
        });
    }
});

// POST /api/instructor/submissions/:id/grade — Grade and provide feedback on submission
app.post('/api/instructor/submissions/:id/grade', async (req, res) => {
    try {
        const submissionId = req.params.id;
        const { marks, feedback, status } = req.body;

        const sub = inMemorySubmissions.find(s => s.submissionId === submissionId);
        if (sub) {
            if (marks) sub.marks = { ...sub.marks, ...marks };
            if (feedback !== undefined) sub.instructorFeedback = feedback;
            if (status) sub.status = status;

            // Recalculate total score
            const scores = Object.values(sub.marks || {});
            if (scores.length > 0) {
                sub.totalScore = scores.reduce((sum, val) => sum + (Number(val) || 0), 0);
                if (!status) sub.status = 'Reviewed';
            }
        }

        if (isDatabaseConfigured()) {
            try {
                const db = await getDatabase();
                if (db) {
                    await db.collection('submissions').updateOne(
                        { submissionId },
                        {
                            $set: {
                                marks: marks || {},
                                instructorFeedback: feedback || '',
                                status: status || 'Reviewed',
                                reviewedAt: new Date().toISOString()
                            }
                        }
                    );
                }
            } catch (dbErr) {
                console.warn('[AOVS Database] MongoDB error updating grade:', dbErr.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "Evaluation saved successfully.",
            submission: sub || { submissionId, marks, feedback, status: status || 'Reviewed' }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to save submission evaluation."
        });
    }
});

// GET /api/instructor/stats — Aggregate metrics for review dashboard
app.get('/api/instructor/stats', (req, res) => {
    try {
        const total = inMemorySubmissions.length;
        const reviewed = inMemorySubmissions.filter(s => s.status === 'Reviewed' || s.status === 'Graded').length;
        const pending = total - reviewed;
        const totalDuration = inMemorySubmissions.reduce((sum, s) => sum + (s.timeSpentSeconds || 0), 0);
        const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;

        res.status(200).json({
            success: true,
            stats: {
                totalSubmissions: total,
                pendingReviews: pending,
                completedReviews: reviewed,
                averageExamDurationSeconds: avgDuration,
                formattedAvgDuration: `${Math.floor(avgDuration / 60)}m ${String(avgDuration % 60).padStart(2, '0')}s`,
                activeExamsCount: 2,
                activeEvaluatorsCount: 3
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve instructor statistics."
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
