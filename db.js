/**
 * AOVS (Online Assessment and Verification System)
 * MongoDB Atlas Database Service (SCRUM-31)
 *
 * Implements connection management, collection models,
 * dynamic exam question queries, and server-side security filtering.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// Cached singleton connection
let cachedClient = null;
let cachedDb = null;

/**
 * Mask sensitive credentials in MongoDB connection string for safe diagnostics
 * Example: mongodb+srv://admin:pass123@cluster.mongodb.net -> mongodb+srv://admin:***@cluster.mongodb.net
 */
function maskMongoUri(uri) {
    if (!uri || typeof uri !== 'string') return '[not configured]';
    return uri.replace(/\/\/(.*?):(.*?)@/, '//$1:***@');
}

/**
 * Check whether MONGODB_URI environment variable is defined
 */
function isDatabaseConfigured() {
    return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
}

/**
 * Get or establish a singleton connection to MongoDB Atlas
 * @param {string} [customUri] Optional URI for testing
 * @returns {Promise<MongoClient>}
 */
async function getMongoClient(customUri = null) {
    const uri = customUri || process.env.MONGODB_URI;
    if (!uri) {
        return null;
    }

    if (cachedClient) {
        return cachedClient;
    }

    try {
        const client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            maxPoolSize: 10
        });

        await client.connect();
        cachedClient = client;
        const dbName = process.env.MONGODB_DB_NAME || 'aovs';
        cachedDb = client.db(dbName);

        console.log(`[AOVS Database] Connected to MongoDB Atlas (DB: ${dbName})`);
        return cachedClient;
    } catch (error) {
        console.error('[AOVS Database] Connection error:', error.message);
        throw error;
    }
}

/**
 * Get MongoDB database instance
 * @param {string} [customDbName]
 * @returns {Promise<import('mongodb').Db>}
 */
async function getDatabase(customDbName = null) {
    if (cachedDb && !customDbName) {
        return cachedDb;
    }
    const client = await getMongoClient();
    if (!client) {
        return null;
    }
    const dbName = customDbName || process.env.MONGODB_DB_NAME || 'aovs';
    return client.db(dbName);
}

/**
 * Gracefully close database connection (useful for tests or shutdown)
 */
async function closeDatabaseConnection() {
    if (cachedClient) {
        try {
            await cachedClient.close();
        } catch (e) {
            // Ignore close error
        }
        cachedClient = null;
        cachedDb = null;
    }
}

/**
 * Default Master Exam & Question Dataset for Atlas Seeding
 */
const SEED_EXAMS = {
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
        isActive: true,
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
                sampleAnswer: 'A Hash table computes an index using hash(key) % capacity. Collisions occur when different keys hash to the same bucket. Separate chaining maintains a linked list at each bucket (O(1) average, O(n) worst-case). Open addressing probes for empty slots.',
                rubric: '2 marks for internal architecture and collision explanation, 3 marks for collision resolution strategies and complexity analysis.'
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
                sampleAnswer: 'BST can degenerate to O(n) skewed list. AVL maintains balance factor in {-1, 0, 1}. Single rotations fix LL/RR imbalances; double rotations fix LR/RL imbalances. This ensures tree height <= 1.44 log2(n), guaranteeing O(log n) operations.',
                rubric: '2 marks for BST vs AVL comparison, 2 marks for rotation mechanics, 1 mark for mathematical logarithmic height guarantee.'
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
                codeSnippet: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)',
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
        isActive: false,
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
                codeSnippet: 'def search_node(root, target):\n    if root is None or root.val == target:\n        return root\n    if target < root.val:\n        return search_node(root.left, target)\n    return search_node(root.right, target)',
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
                codeSnippet: 'int fibonacci(int n) {\n    if (n <= 1) return n;\n    int dp[n + 1];\n    dp[0] = 0;\n    dp[1] = 1;\n    for (int i = 2; i <= n; i++) {\n        dp[i] = dp[i - 1] + dp[i - 2];\n    }\n    return dp[n];\n}',
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
 * Seed initial sample examinations and questions into MongoDB Atlas
 * Safe & Repeatable: Uses updateOne with upsert to prevent duplicate documents on repeated runs.
 * @param {import('mongodb').Db} db
 */
async function seedInitialExams(db) {
    if (!db) {
        throw new Error('Database instance is required for seeding.');
    }

    const examsCollection = db.collection('exams');
    const questionsCollection = db.collection('questions');
    const answersCollection = db.collection('answers');

    // Create unique indices for data integrity
    await examsCollection.createIndex({ id: 1 }, { unique: true });
    await questionsCollection.createIndex({ id: 1, examId: 1 }, { unique: true });
    await questionsCollection.createIndex({ examId: 1, questionNumber: 1 });
    await answersCollection.createIndex({ studentId: 1, examId: 1, questionId: 1 }, { unique: true });

    const results = {
        examsUpserted: 0,
        questionsUpserted: 0
    };

    for (const examKey of Object.keys(SEED_EXAMS)) {
        const sourceExam = SEED_EXAMS[examKey];

        // 1. Upsert Exam metadata document
        const examDoc = {
            id: sourceExam.id,
            title: sourceExam.title,
            courseCode: sourceExam.courseCode,
            courseName: sourceExam.courseName,
            department: sourceExam.department,
            academicTerm: sourceExam.academicTerm,
            durationMinutes: sourceExam.durationMinutes,
            totalMarks: sourceExam.totalMarks,
            passingMarks: sourceExam.passingMarks,
            proctorMode: sourceExam.proctorMode,
            isActive: sourceExam.isActive ?? false,
            instructions: sourceExam.instructions,
            sections: sourceExam.sections,
            updatedAt: new Date()
        };

        await examsCollection.updateOne(
            { id: sourceExam.id },
            { $set: examDoc, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
        );
        results.examsUpserted++;

        // 2. Upsert individual question documents
        for (const q of sourceExam.questions) {
            const questionDoc = {
                id: q.id,
                examId: sourceExam.id,
                questionNumber: q.questionNumber,
                sectionId: q.sectionId,
                sectionName: q.sectionName,
                type: q.type,
                marks: q.marks,
                negativeMarks: q.negativeMarks ?? 0,
                title: q.title,
                codeSnippet: q.codeSnippet ?? null,
                codeLanguage: q.codeLanguage ?? null,
                options: q.options ?? null,
                // Sensitive fields stored in database
                sampleAnswer: q.sampleAnswer ?? null,
                rubric: q.rubric ?? null,
                correctOption: q.correctOption ?? null,
                correctOptions: q.correctOptions ?? null,
                explanation: q.explanation ?? null,
                updatedAt: new Date()
            };

            await questionsCollection.updateOne(
                { id: q.id, examId: sourceExam.id },
                { $set: questionDoc, $setOnInsert: { createdAt: new Date() } },
                { upsert: true }
            );
            results.questionsUpserted++;
        }
    }

    return results;
}

/**
 * Retrieve active exam and its ordered questions from MongoDB
 * @param {string} [examId] Specific exam ID or null for active exam
 * @param {import('mongodb').Db} [customDb] Optional custom DB instance
 * @returns {Promise<Object|null>} Raw exam object with questions
 */
async function getExamFromDb(examId = null, customDb = null) {
    const db = customDb || await getDatabase();
    if (!db) {
        return null;
    }

    const examsCollection = db.collection('exams');
    const questionsCollection = db.collection('questions');

    // 1. Locate target exam
    let exam = null;
    if (examId) {
        exam = await examsCollection.findOne({ id: examId });
    } else {
        // Find default active exam or first exam
        exam = await examsCollection.findOne({ isActive: true });
        if (!exam) {
            exam = await examsCollection.findOne({});
        }
    }

    if (!exam) {
        return null;
    }

    // 2. Query questions ordered by questionNumber ascending
    const questions = await questionsCollection
        .find({ examId: exam.id })
        .sort({ questionNumber: 1 })
        .toArray();

    // Attach ordered questions
    exam.questions = questions;
    return exam;
}

/**
 * List all available exams with question counts from MongoDB
 * @param {import('mongodb').Db} [customDb]
 * @returns {Promise<Array<Object>>}
 */
async function getAllExamsFromDb(customDb = null) {
    const db = customDb || await getDatabase();
    if (!db) {
        return [];
    }

    const examsCollection = db.collection('exams');
    const questionsCollection = db.collection('questions');

    const exams = await examsCollection.find({}).toArray();
    const result = [];

    for (const exam of exams) {
        const count = await questionsCollection.countDocuments({ examId: exam.id });
        result.push({
            id: exam.id,
            title: exam.title,
            courseCode: exam.courseCode,
            durationMinutes: exam.durationMinutes,
            totalMarks: exam.totalMarks,
            questionsCount: count
        });
    }

    return result;
}

/**
 * Sanitizes an exam object for students:
 * Strictly strips MongoDB _id, confidential answer keys, sample answers, and evaluation rubrics.
 * @param {Object} exam
 * @returns {Object} Sanitized exam object
 */
function sanitizeExamForStudent(exam) {
    if (!exam) return null;

    const questions = Array.isArray(exam.questions) ? exam.questions : [];

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
        instructions: exam.instructions || [],
        sections: exam.sections || [],
        totalQuestions: questions.length,
        questions: questions.map(q => ({
            id: q.id,
            questionNumber: q.questionNumber,
            sectionId: q.sectionId,
            sectionName: q.sectionName,
            type: q.type,
            marks: q.marks,
            negativeMarks: q.negativeMarks ?? 0,
            title: q.title,
            codeSnippet: q.codeSnippet ?? null,
            codeLanguage: q.codeLanguage ?? null,
            options: q.options ?? null
        }))
    };
}

module.exports = {
    getMongoClient,
    getDatabase,
    closeDatabaseConnection,
    isDatabaseConfigured,
    maskMongoUri,
    seedInitialExams,
    getExamFromDb,
    getAllExamsFromDb,
    sanitizeExamForStudent,
    SEED_EXAMS
};
