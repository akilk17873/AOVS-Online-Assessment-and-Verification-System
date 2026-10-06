/**
 * AOVS (Online Assessment and Verification System)
 * Exam Question Layout Controller
 * Implements SCRUM-25: Complete Exam Interface & Interaction Model
 */

(function () {
    'use strict';

    // State Variables
    let examData = null;
    let questions = [];
    let currentIndex = 0;
    let answers = {};           // { [qId]: 'A' | ['A', 'B'] }
    let markedForReview = {};   // { [qId]: boolean }
    let visited = {};           // { [qId]: boolean }
    let activeFilter = 'all';   // 'all' | 'answered' | 'unanswered' | 'marked'
    let timerInterval = null;
    let timeRemainingSeconds = 45 * 60;
    let totalExamDurationSeconds = 45 * 60;
    let studentInfo = {
        studentId: 'TEST001',
        name: 'Akil Kumar'
    };

    // DOM Elements Cache
    const elements = {
        // States
        loadingState: document.getElementById('loadingState'),
        errorState: document.getElementById('errorState'),
        errorMessage: document.getElementById('errorMessage'),
        emptyState: document.getElementById('emptyState'),
        examWorkspace: document.getElementById('examWorkspace'),

        // Header Metadata
        examTitle: document.getElementById('examTitle'),
        courseCode: document.getElementById('courseCode'),
        academicTerm: document.getElementById('academicTerm'),
        totalMarksBadge: document.getElementById('totalMarksBadge'),
        timerWidget: document.getElementById('timerWidget'),
        timerDisplay: document.getElementById('timerDisplay'),
        studentAvatar: document.getElementById('studentAvatar'),
        studentName: document.getElementById('studentName'),
        studentId: document.getElementById('studentId'),

        // Question Workspace
        questionNumberBadge: document.getElementById('questionNumberBadge'),
        questionSectionBadge: document.getElementById('questionSectionBadge'),
        questionTypeBadge: document.getElementById('questionTypeBadge'),
        questionMarksValue: document.getElementById('questionMarksValue'),
        questionNegativeMarksPill: document.getElementById('questionNegativeMarksPill'),
        questionNegativeValue: document.getElementById('questionNegativeValue'),
        progressBarFill: document.getElementById('progressBarFill'),
        questionHeading: document.getElementById('questionHeading'),
        codeSnippetContainer: document.getElementById('codeSnippetContainer'),
        codeLangLabel: document.getElementById('codeLangLabel'),
        codeSnippetContent: document.getElementById('codeSnippetContent'),
        copyCodeBtn: document.getElementById('copyCodeBtn'),
        optionsContainer: document.getElementById('optionsContainer'),
        selectionNotice: document.getElementById('selectionNotice'),
        selectionNoticeText: document.getElementById('selectionNoticeText'),

        // Actions
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        nextBtnText: document.getElementById('nextBtnText'),
        nextBtnIcon: document.getElementById('nextBtnIcon'),
        clearBtn: document.getElementById('clearBtn'),
        markReviewBtn: document.getElementById('markReviewBtn'),
        markReviewText: document.getElementById('markReviewText'),
        markReviewIcon: document.getElementById('markReviewIcon'),

        // Question Palette
        paletteSidebar: document.getElementById('paletteSidebar'),
        paletteTotalSummary: document.getElementById('paletteTotalSummary'),
        statAnsweredCount: document.getElementById('statAnsweredCount'),
        statUnansweredCount: document.getElementById('statUnansweredCount'),
        statMarkedCount: document.getElementById('statMarkedCount'),
        statNotVisitedCount: document.getElementById('statNotVisitedCount'),
        questionPaletteGrid: document.getElementById('questionPaletteGrid'),
        filterChips: document.querySelectorAll('.filter-chip'),
        submitExamBtn: document.getElementById('submitExamBtn'),

        // Mobile Drawer
        mobilePaletteToggle: document.getElementById('mobilePaletteToggle'),
        mobilePaletteBadge: document.getElementById('mobilePaletteBadge'),
        drawerCloseBtn: document.getElementById('drawerCloseBtn'),
        drawerBackdrop: document.getElementById('drawerBackdrop'),

        // Modals
        fullscreenToggleBtn: document.getElementById('fullscreenToggleBtn'),
        instructionsBtn: document.getElementById('instructionsBtn'),
        instructionsModal: document.getElementById('instructionsModal'),
        instructionsList: document.getElementById('instructionsList'),
        closeInstructionsBtn: document.getElementById('closeInstructionsBtn'),
        confirmInstructionsBtn: document.getElementById('confirmInstructionsBtn'),

        submitConfirmModal: document.getElementById('submitConfirmModal'),
        closeSubmitModalBtn: document.getElementById('closeSubmitModalBtn'),
        cancelSubmitBtn: document.getElementById('cancelSubmitBtn'),
        finalConfirmSubmitBtn: document.getElementById('finalConfirmSubmitBtn'),
        modalTotalQuestions: document.getElementById('modalTotalQuestions'),
        modalAnsweredQuestions: document.getElementById('modalAnsweredQuestions'),
        modalUnansweredQuestions: document.getElementById('modalUnansweredQuestions'),
        modalMarkedQuestions: document.getElementById('modalMarkedQuestions'),
        unansweredAlert: document.getElementById('unansweredAlert'),

        receiptModal: document.getElementById('receiptModal'),
        receiptSubmissionId: document.getElementById('receiptSubmissionId'),
        receiptStudentId: document.getElementById('receiptStudentId'),
        receiptTotalQ: document.getElementById('receiptTotalQ'),
        receiptAnsweredQ: document.getElementById('receiptAnsweredQ'),
        receiptTimestamp: document.getElementById('receiptTimestamp'),

        retryLoadBtn: document.getElementById('retryLoadBtn'),
        refreshEmptyBtn: document.getElementById('refreshEmptyBtn')
    };

    /**
     * Determines API base URL dynamically to support both
     * direct express hosting (port 3000) and live-server testing (port 5500)
     */
    function getApiBaseUrl() {
        const port = window.location.port;
        if (port === '3000' || port === '') {
            return '';
        }
        return 'http://localhost:3000';
    }

    /**
     * Initialize application
     */
    function init() {
        loadStudentSession();
        bindEvents();
        fetchExamData();
    }

    /**
     * Load authenticated student info from sessionStorage if available
     */
    function loadStudentSession() {
        try {
            const stored = sessionStorage.getItem('aovs_student');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.studentId) studentInfo.studentId = parsed.studentId;
                if (parsed.name) studentInfo.name = parsed.name;
            }
        } catch (e) {
            console.warn('Could not read session storage', e);
        }

        if (elements.studentName) elements.studentName.textContent = studentInfo.name;
        if (elements.studentId) elements.studentId.textContent = studentInfo.studentId;
        if (elements.studentAvatar) {
            const initials = studentInfo.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
            elements.studentAvatar.textContent = initials || 'ST';
        }
    }

    /**
     * Fetch active exam and questions from API
     */
    async function fetchExamData() {
        showLoadingState();

        const urlParams = new URLSearchParams(window.location.search);
        const simulate = urlParams.get('simulate') || '';
        const examId = urlParams.get('examId') || '';

        let endpoint = `${getApiBaseUrl()}/api/exam/active`;
        if (examId) {
            endpoint = `${getApiBaseUrl()}/api/exams/${encodeURIComponent(examId)}`;
        }
        if (simulate) {
            endpoint += `?simulate=${encodeURIComponent(simulate)}`;
        }

        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status} (${response.statusText})`);
            }

            const data = await response.json();
            if (!data.success || !data.exam) {
                throw new Error(data.message || 'Invalid assessment response format.');
            }

            examData = data.exam;
            questions = examData.questions || [];

            if (questions.length === 0) {
                showEmptyState();
                return;
            }

            // Restore cached responses if session matches
            restoreCachedState();

            // Set total duration
            if (examData.durationMinutes) {
                totalExamDurationSeconds = examData.durationMinutes * 60;
                if (!timeRemainingSeconds || timeRemainingSeconds > totalExamDurationSeconds) {
                    timeRemainingSeconds = totalExamDurationSeconds;
                }
            }

            // Mark question 0 as visited
            visited[questions[0].id] = true;

            renderExamHeader();
            renderInstructions();
            renderQuestionPalette();
            renderCurrentQuestion();
            startCountdownTimer();

            showWorkspaceState();
        } catch (error) {
            console.error('Failed to load exam data:', error);
            showErrorState(error.message);
        }
    }

    /**
     * Render exam header details
     */
    function renderExamHeader() {
        if (elements.examTitle) elements.examTitle.textContent = examData.title || 'Assessment';
        if (elements.courseCode) elements.courseCode.textContent = examData.courseCode || 'N/A';
        if (elements.academicTerm) elements.academicTerm.textContent = examData.academicTerm || 'Examination';
        if (elements.totalMarksBadge) elements.totalMarksBadge.textContent = `${examData.totalMarks || 0} Marks`;
        if (elements.paletteTotalSummary) elements.paletteTotalSummary.textContent = `${questions.length} Total Questions`;
    }

    /**
     * Render instructions modal content
     */
    function renderInstructions() {
        if (!elements.instructionsList || !examData.instructions) return;
        elements.instructionsList.innerHTML = '';
        examData.instructions.forEach(instruction => {
            const li = document.createElement('li');
            li.textContent = instruction;
            elements.instructionsList.appendChild(li);
        });
    }

    /**
     * Render current question in main workspace
     */
    function renderCurrentQuestion() {
        if (questions.length === 0 || currentIndex < 0 || currentIndex >= questions.length) return;

        const q = questions[currentIndex];
        visited[q.id] = true;

        // 1. Question Number & Progress
        if (elements.questionNumberBadge) {
            elements.questionNumberBadge.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
        }
        if (elements.progressBarFill) {
            const pct = Math.round(((currentIndex + 1) / questions.length) * 100);
            elements.progressBarFill.style.width = `${pct}%`;
        }

        // 2. Section & Type Badges
        if (elements.questionSectionBadge) {
            elements.questionSectionBadge.textContent = q.sectionName || `Section ${q.sectionId || 1}`;
        }
        if (elements.questionTypeBadge) {
            if (q.type === 'multiple_choice') {
                elements.questionTypeBadge.textContent = 'Multiple Choice (Select all that apply)';
                elements.questionTypeBadge.style.color = 'var(--accent-cyan)';
                elements.questionTypeBadge.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                elements.questionTypeBadge.style.backgroundColor = 'rgba(6, 182, 212, 0.12)';
            } else {
                elements.questionTypeBadge.textContent = 'Single Choice (Radio)';
                elements.questionTypeBadge.style.color = 'var(--accent-purple)';
                elements.questionTypeBadge.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                elements.questionTypeBadge.style.backgroundColor = 'rgba(139, 92, 246, 0.12)';
            }
        }

        // 3. Marks & Negative Marks
        if (elements.questionMarksValue) {
            elements.questionMarksValue.textContent = `+${Number(q.marks || 1).toFixed(2)} Marks`;
        }
        if (elements.questionNegativeMarksPill) {
            if (q.negativeMarks) {
                elements.questionNegativeMarksPill.classList.remove('hidden');
                if (elements.questionNegativeValue) {
                    elements.questionNegativeValue.textContent = `-${Number(q.negativeMarks).toFixed(2)}`;
                }
            } else {
                elements.questionNegativeMarksPill.classList.add('hidden');
            }
        }

        // 4. Question Heading Text
        if (elements.questionHeading) {
            elements.questionHeading.textContent = q.title || '';
        }

        // 5. Code Snippet (if available)
        if (q.codeSnippet && q.codeSnippet.trim() !== '') {
            elements.codeSnippetContainer.classList.remove('hidden');
            if (elements.codeSnippetContent) elements.codeSnippetContent.textContent = q.codeSnippet;
            if (elements.codeLangLabel) elements.codeLangLabel.textContent = (q.codeLanguage || 'Code Snippet').toUpperCase();
        } else {
            elements.codeSnippetContainer.classList.add('hidden');
        }

        // 6. Options rendering (Radio or Checkbox)
        renderOptions(q);

        // 7. Navigation Buttons State
        updateNavigationButtons();

        // 8. Mark for Review Button State
        updateMarkReviewButton(q.id);

        // 9. Update Palette visual states & counts
        updatePaletteItemStates();
        updateStatsCounters();

        // 10. Persist State
        persistCurrentState();
    }

    /**
     * Render options for question (single_choice: radio, multiple_choice: checkbox)
     */
    function renderOptions(question) {
        if (!elements.optionsContainer) return;
        elements.optionsContainer.innerHTML = '';

        const isMultiple = question.type === 'multiple_choice';
        elements.optionsContainer.setAttribute('role', isMultiple ? 'group' : 'radiogroup');

        const currentAnswer = answers[question.id];

        question.options.forEach((opt, index) => {
            const letter = opt.id || String.fromCharCode(65 + index);
            const isSelected = isMultiple
                ? Array.isArray(currentAnswer) && currentAnswer.includes(letter)
                : currentAnswer === letter;

            const card = document.createElement('div');
            card.className = `option-card ${isSelected ? 'selected' : ''}`;
            card.setAttribute('data-option-id', letter);
            card.setAttribute('role', isMultiple ? 'checkbox' : 'radio');
            card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            card.setAttribute('tabindex', '0');

            // Native input for form semantics and accessibility
            const input = document.createElement('input');
            input.type = isMultiple ? 'checkbox' : 'radio';
            input.name = `question_${question.id}_option`;
            input.value = letter;
            input.id = `opt_${question.id}_${letter}`;
            input.checked = isSelected;
            input.setAttribute('aria-label', `Option ${letter}: ${opt.text}`);

            // Option Letter Badge (A, B, C, D)
            const badge = document.createElement('div');
            badge.className = 'option-letter-badge';
            badge.textContent = letter;

            // Custom Indicator
            const indicator = document.createElement('div');
            indicator.className = `option-indicator ${isMultiple ? 'indicator-checkbox' : 'indicator-radio'}`;
            if (isMultiple) {
                indicator.innerHTML = '<i class="fa-solid fa-check indicator-check"></i>';
            } else {
                indicator.innerHTML = '<span class="indicator-inner"></span>';
            }

            // Option Text Content
            const text = document.createElement('div');
            text.className = 'option-text';
            text.textContent = opt.text;

            card.appendChild(input);
            card.appendChild(badge);
            card.appendChild(indicator);
            card.appendChild(text);

            // Selection Handler
            card.addEventListener('click', (e) => {
                e.preventDefault();
                handleOptionSelect(question, letter);
            });

            // Keyboard navigation
            card.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleOptionSelect(question, letter);
                }
            });

            elements.optionsContainer.appendChild(card);
        });

        updateSelectionNotice(question);
    }

    /**
     * Handle option selection based on question type
     */
    function handleOptionSelect(question, optionId) {
        const isMultiple = question.type === 'multiple_choice';

        if (isMultiple) {
            let current = Array.isArray(answers[question.id]) ? [...answers[question.id]] : [];
            const idx = current.indexOf(optionId);
            if (idx > -1) {
                current.splice(idx, 1);
            } else {
                current.push(optionId);
            }
            current.sort();

            if (current.length > 0) {
                answers[question.id] = current;
            } else {
                delete answers[question.id];
            }
        } else {
            // Single choice (radio): selecting sets answer
            answers[question.id] = optionId;
        }

        // Re-render options to update classes and aria attributes
        renderOptions(question);

        // Update palette item state & summary counters
        updatePaletteItemStates();
        updateStatsCounters();
        persistCurrentState();
    }

    /**
     * Clear selected response for the current question
     */
    function clearCurrentResponse() {
        const q = questions[currentIndex];
        if (!q) return;

        delete answers[q.id];
        renderOptions(q);
        updatePaletteItemStates();
        updateStatsCounters();
        persistCurrentState();
    }

    /**
     * Toggle "Mark for Review" status
     */
    function toggleMarkForReview() {
        const q = questions[currentIndex];
        if (!q) return;

        markedForReview[q.id] = !markedForReview[q.id];
        updateMarkReviewButton(q.id);
        updatePaletteItemStates();
        updateStatsCounters();
        persistCurrentState();
    }

    /**
     * Update "Mark for Review" button styling
     */
    function updateMarkReviewButton(questionId) {
        const isMarked = !!markedForReview[questionId];
        if (elements.markReviewBtn) {
            if (isMarked) {
                elements.markReviewBtn.classList.add('active');
                if (elements.markReviewText) elements.markReviewText.textContent = 'Marked for Review';
                if (elements.markReviewIcon) elements.markReviewIcon.className = 'fa-solid fa-bookmark';
            } else {
                elements.markReviewBtn.classList.remove('active');
                if (elements.markReviewText) elements.markReviewText.textContent = 'Mark for Review';
                if (elements.markReviewIcon) elements.markReviewIcon.className = 'fa-regular fa-bookmark';
            }
        }
    }

    /**
     * Update Next/Previous buttons
     */
    function updateNavigationButtons() {
        if (!elements.prevBtn || !elements.nextBtn) return;

        // Previous button is disabled on first question
        elements.prevBtn.disabled = (currentIndex === 0);

        // Next button changes to "Review & Submit" on last question
        const isLastQuestion = (currentIndex === questions.length - 1);
        if (isLastQuestion) {
            elements.nextBtnText.textContent = 'Review & Submit';
            elements.nextBtnIcon.className = 'fa-solid fa-check-double';
            elements.nextBtn.classList.add('btn-submit-mode');
        } else {
            elements.nextBtnText.textContent = 'Save & Next';
            elements.nextBtnIcon.className = 'fa-solid fa-chevron-right';
            elements.nextBtn.classList.remove('btn-submit-mode');
        }
    }

    /**
     * Update visual selection summary notice under options
     */
    function updateSelectionNotice(question) {
        if (!elements.selectionNotice) return;
        const currentAnswer = answers[question.id];

        if (currentAnswer && (typeof currentAnswer === 'string' || currentAnswer.length > 0)) {
            elements.selectionNotice.classList.add('show');
            if (Array.isArray(currentAnswer)) {
                elements.selectionNoticeText.textContent = `${currentAnswer.length} option(s) selected: [${currentAnswer.join(', ')}]`;
            } else {
                elements.selectionNoticeText.textContent = `Selected: Option ${currentAnswer}`;
            }
        } else {
            elements.selectionNotice.classList.remove('show');
        }
    }

    /**
     * Navigate to specific question index
     */
    function goToQuestion(index) {
        if (index < 0 || index >= questions.length) return;
        currentIndex = index;
        renderCurrentQuestion();

        // Close mobile drawer if open
        closeMobileDrawer();
    }

    /**
     * Navigate to previous question
     */
    function goToPrevQuestion() {
        if (currentIndex > 0) {
            goToQuestion(currentIndex - 1);
        }
    }

    /**
     * Navigate to next question or open submit modal if on last question
     */
    function goToNextQuestion() {
        if (currentIndex < questions.length - 1) {
            goToQuestion(currentIndex + 1);
        } else {
            openSubmitModal();
        }
    }

    /**
     * Build the numbered Question Palette grid
     */
    function renderQuestionPalette() {
        if (!elements.questionPaletteGrid) return;
        elements.questionPaletteGrid.innerHTML = '';

        questions.forEach((q, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'palette-btn state-notvisited';
            btn.id = `palette_btn_${index}`;
            btn.setAttribute('data-index', index);
            btn.setAttribute('data-qid', q.id);
            btn.setAttribute('aria-label', `Question ${index + 1}`);
            btn.textContent = index + 1;

            btn.addEventListener('click', () => {
                goToQuestion(index);
            });

            elements.questionPaletteGrid.appendChild(btn);
        });

        updatePaletteItemStates();
        updateStatsCounters();
    }

    /**
     * Determine palette state for a given question
     */
    function getQuestionState(index) {
        const q = questions[index];
        const hasAnswer = isQuestionAnswered(q.id);
        const isMarked = !!markedForReview[q.id];
        const isVisited = !!visited[q.id];
        const isCurrent = (index === currentIndex);

        return {
            isCurrent,
            hasAnswer,
            isMarked,
            isVisited
        };
    }

    function isQuestionAnswered(questionId) {
        const ans = answers[questionId];
        if (!ans) return false;
        if (Array.isArray(ans)) return ans.length > 0;
        return typeof ans === 'string' && ans.trim().length > 0;
    }

    /**
     * Update palette buttons classes based on state
     */
    function updatePaletteItemStates() {
        if (!elements.questionPaletteGrid) return;

        questions.forEach((q, index) => {
            const btn = document.getElementById(`palette_btn_${index}`);
            if (!btn) return;

            const state = getQuestionState(index);

            // Reset state classes
            btn.className = 'palette-btn';

            // Filter visibility
            if (activeFilter === 'answered' && !state.hasAnswer) {
                btn.style.display = 'none';
            } else if (activeFilter === 'unanswered' && (!state.isVisited || state.hasAnswer)) {
                btn.style.display = 'none';
            } else if (activeFilter === 'marked' && !state.isMarked) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'flex';
            }

            // Assign visual states
            if (state.hasAnswer && state.isMarked) {
                btn.classList.add('state-answered-marked');
            } else if (state.hasAnswer) {
                btn.classList.add('state-answered');
            } else if (state.isMarked) {
                btn.classList.add('state-marked');
            } else if (state.isVisited) {
                btn.classList.add('state-unanswered');
            } else {
                btn.classList.add('state-notvisited');
            }

            if (state.isCurrent) {
                btn.classList.add('state-current');
            }
        });

        // Update mobile badge
        if (elements.mobilePaletteBadge) {
            const answeredCount = Object.keys(answers).filter(k => isQuestionAnswered(k)).length;
            elements.mobilePaletteBadge.textContent = `${answeredCount}/${questions.length}`;
        }
    }

    /**
     * Calculate and display live palette statistics
     */
    function updateStatsCounters() {
        let answered = 0;
        let unanswered = 0;
        let marked = 0;
        let notVisited = 0;

        questions.forEach((q, index) => {
            const state = getQuestionState(index);
            if (state.hasAnswer) answered++;
            else if (state.isVisited) unanswered++;
            else notVisited++;

            if (state.isMarked) marked++;
        });

        if (elements.statAnsweredCount) elements.statAnsweredCount.textContent = answered;
        if (elements.statUnansweredCount) elements.statUnansweredCount.textContent = unanswered;
        if (elements.statMarkedCount) elements.statMarkedCount.textContent = marked;
        if (elements.statNotVisitedCount) elements.statNotVisitedCount.textContent = notVisited;
    }

    /**
     * Live Countdown Timer
     */
    function startCountdownTimer() {
        if (timerInterval) clearInterval(timerInterval);

        updateTimerDisplay();

        timerInterval = setInterval(() => {
            timeRemainingSeconds--;
            updateTimerDisplay();

            if (timeRemainingSeconds <= 0) {
                clearInterval(timerInterval);
                timeRemainingSeconds = 0;
                handleAutoSubmitTimeExpired();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        if (!elements.timerDisplay) return;

        const minutes = Math.floor(timeRemainingSeconds / 60);
        const seconds = timeRemainingSeconds % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        elements.timerDisplay.textContent = display;

        if (elements.timerWidget) {
            if (timeRemainingSeconds <= 60) {
                elements.timerWidget.className = 'timer-widget timer-danger';
            } else if (timeRemainingSeconds <= 300) {
                elements.timerWidget.className = 'timer-widget timer-warning';
            } else {
                elements.timerWidget.className = 'timer-widget';
            }
        }
    }

    function handleAutoSubmitTimeExpired() {
        alert('Time has expired! Your examination is being submitted automatically.');
        submitExamResponses();
    }

    /**
     * Submit Examination Flow
     */
    function openSubmitModal() {
        let answered = 0;
        let unanswered = 0;
        let marked = 0;

        questions.forEach((q, index) => {
            const state = getQuestionState(index);
            if (state.hasAnswer) answered++;
            else unanswered++;
            if (state.isMarked) marked++;
        });

        if (elements.modalTotalQuestions) elements.modalTotalQuestions.textContent = questions.length;
        if (elements.modalAnsweredQuestions) elements.modalAnsweredQuestions.textContent = answered;
        if (elements.modalUnansweredQuestions) elements.modalUnansweredQuestions.textContent = unanswered;
        if (elements.modalMarkedQuestions) elements.modalMarkedQuestions.textContent = marked;

        if (elements.unansweredAlert) {
            if (unanswered > 0) {
                elements.unansweredAlert.classList.remove('hidden');
            } else {
                elements.unansweredAlert.classList.add('hidden');
            }
        }

        if (elements.submitConfirmModal) {
            elements.submitConfirmModal.classList.remove('hidden');
        }
    }

    function closeSubmitModal() {
        if (elements.submitConfirmModal) {
            elements.submitConfirmModal.classList.add('hidden');
        }
    }

    async function submitExamResponses() {
        closeSubmitModal();
        showLoadingState();

        const timeSpent = Math.max(0, totalExamDurationSeconds - timeRemainingSeconds);
        const payload = {
            studentId: studentInfo.studentId,
            answers: answers,
            timeSpentSeconds: timeSpent
        };

        const examId = (examData && examData.id) ? examData.id : 'CS301-2026';
        const endpoint = `${getApiBaseUrl()}/api/exams/${encodeURIComponent(examId)}/submit`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Submission failed.');
            }

            // Clear session storage cache
            clearCachedState();
            if (timerInterval) clearInterval(timerInterval);

            // Display Receipt
            showReceiptModal(data.receipt || {
                submissionId: `SUB-${Date.now().toString(36).toUpperCase()}`,
                studentId: studentInfo.studentId,
                questionsCount: questions.length,
                answeredCount: Object.keys(answers).length,
                submittedAt: new Date().toLocaleTimeString()
            });
        } catch (error) {
            console.error('Error submitting exam:', error);
            showErrorState(`Submission error: ${error.message}`);
        }
    }

    function showReceiptModal(receipt) {
        hideAllStates();
        if (elements.receiptSubmissionId) elements.receiptSubmissionId.textContent = receipt.submissionId;
        if (elements.receiptStudentId) elements.receiptStudentId.textContent = receipt.studentId;
        if (elements.receiptTotalQ) elements.receiptTotalQ.textContent = receipt.questionsCount || questions.length;
        if (elements.receiptAnsweredQ) elements.receiptAnsweredQ.textContent = receipt.answeredCount || Object.keys(answers).length;
        if (elements.receiptTimestamp) elements.receiptTimestamp.textContent = new Date().toLocaleTimeString();

        if (elements.receiptModal) {
            elements.receiptModal.classList.remove('hidden');
        }
    }

    /**
     * State Persistence (sessionStorage)
     */
    function persistCurrentState() {
        try {
            const cacheKey = `aovs_exam_${(examData && examData.id) ? examData.id : 'active'}`;
            const state = {
                currentIndex,
                answers,
                markedForReview,
                visited,
                timeRemainingSeconds
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(state));
        } catch (e) {
            // Quota or disabled storage fallback
        }
    }

    function restoreCachedState() {
        try {
            const cacheKey = `aovs_exam_${(examData && examData.id) ? examData.id : 'active'}`;
            const stored = sessionStorage.getItem(cacheKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.answers) answers = parsed.answers;
                if (parsed.markedForReview) markedForReview = parsed.markedForReview;
                if (parsed.visited) visited = parsed.visited;
                if (typeof parsed.currentIndex === 'number' && parsed.currentIndex < questions.length) {
                    currentIndex = parsed.currentIndex;
                }
                if (typeof parsed.timeRemainingSeconds === 'number' && parsed.timeRemainingSeconds > 0) {
                    timeRemainingSeconds = parsed.timeRemainingSeconds;
                }
            }
        } catch (e) {
            console.warn('Could not restore cached exam state', e);
        }
    }

    function clearCachedState() {
        try {
            const cacheKey = `aovs_exam_${(examData && examData.id) ? examData.id : 'active'}`;
            sessionStorage.removeItem(cacheKey);
        } catch (e) {}
    }

    /**
     * UI State Switches
     */
    function hideAllStates() {
        elements.loadingState.classList.add('hidden');
        elements.errorState.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
        elements.examWorkspace.classList.add('hidden');
    }

    function showLoadingState() {
        hideAllStates();
        elements.loadingState.classList.remove('hidden');
    }

    function showErrorState(msg) {
        hideAllStates();
        if (elements.errorMessage) elements.errorMessage.textContent = msg || 'Could not connect to assessment server.';
        elements.errorState.classList.remove('hidden');
    }

    function showEmptyState() {
        hideAllStates();
        elements.emptyState.classList.remove('hidden');
    }

    function showWorkspaceState() {
        hideAllStates();
        elements.examWorkspace.classList.remove('hidden');
    }

    /**
     * Mobile Palette Drawer Handlers
     */
    function openMobileDrawer() {
        if (elements.paletteSidebar) elements.paletteSidebar.classList.add('drawer-open');
        if (elements.drawerBackdrop) elements.drawerBackdrop.classList.remove('hidden');
    }

    function closeMobileDrawer() {
        if (elements.paletteSidebar) elements.paletteSidebar.classList.remove('drawer-open');
        if (elements.drawerBackdrop) elements.drawerBackdrop.classList.add('hidden');
    }

    /**
     * Copy code snippet to clipboard
     */
    async function copyCodeSnippet() {
        if (!elements.codeSnippetContent) return;
        const text = elements.codeSnippetContent.textContent;
        try {
            await navigator.clipboard.writeText(text);
            if (elements.copyCodeBtn) {
                const originalHtml = elements.copyCodeBtn.innerHTML;
                elements.copyCodeBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                setTimeout(() => {
                    elements.copyCodeBtn.innerHTML = originalHtml;
                }, 2000);
            }
        } catch (e) {
            console.warn('Clipboard copy failed', e);
        }
    }

    /**
     * Fullscreen Toggle
     */
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }

    /**
     * Bind Event Listeners
     */
    function bindEvents() {
        // Navigation Buttons
        if (elements.prevBtn) elements.prevBtn.addEventListener('click', goToPrevQuestion);
        if (elements.nextBtn) elements.nextBtn.addEventListener('click', goToNextQuestion);
        if (elements.clearBtn) elements.clearBtn.addEventListener('click', clearCurrentResponse);
        if (elements.markReviewBtn) elements.markReviewBtn.addEventListener('click', toggleMarkForReview);

        // Submit Examination
        if (elements.submitExamBtn) elements.submitExamBtn.addEventListener('click', openSubmitModal);
        if (elements.closeSubmitModalBtn) elements.closeSubmitModalBtn.addEventListener('click', closeSubmitModal);
        if (elements.cancelSubmitBtn) elements.cancelSubmitBtn.addEventListener('click', closeSubmitModal);
        if (elements.finalConfirmSubmitBtn) elements.finalConfirmSubmitBtn.addEventListener('click', submitExamResponses);

        // Mobile Drawer
        if (elements.mobilePaletteToggle) elements.mobilePaletteToggle.addEventListener('click', openMobileDrawer);
        if (elements.drawerCloseBtn) elements.drawerCloseBtn.addEventListener('click', closeMobileDrawer);
        if (elements.drawerBackdrop) elements.drawerBackdrop.addEventListener('click', closeMobileDrawer);

        // Palette Filter Tabs
        elements.filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                elements.filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeFilter = chip.getAttribute('data-filter') || 'all';
                updatePaletteItemStates();
            });
        });

        // Instructions Modal
        if (elements.instructionsBtn) {
            elements.instructionsBtn.addEventListener('click', () => {
                if (elements.instructionsModal) elements.instructionsModal.classList.remove('hidden');
            });
        }
        if (elements.closeInstructionsBtn) {
            elements.closeInstructionsBtn.addEventListener('click', () => {
                if (elements.instructionsModal) elements.instructionsModal.classList.add('hidden');
            });
        }
        if (elements.confirmInstructionsBtn) {
            elements.confirmInstructionsBtn.addEventListener('click', () => {
                if (elements.instructionsModal) elements.instructionsModal.classList.add('hidden');
            });
        }

        // Copy Code Button
        if (elements.copyCodeBtn) elements.copyCodeBtn.addEventListener('click', copyCodeSnippet);

        // Fullscreen Toggle
        if (elements.fullscreenToggleBtn) elements.fullscreenToggleBtn.addEventListener('click', toggleFullscreen);

        // Retry & Refresh Buttons
        if (elements.retryLoadBtn) elements.retryLoadBtn.addEventListener('click', fetchExamData);
        if (elements.refreshEmptyBtn) elements.refreshEmptyBtn.addEventListener('click', fetchExamData);

        // Keyboard Shortcuts
        document.addEventListener('keydown', handleGlobalKeydown);
    }

    /**
     * Keyboard navigation handler
     */
    function handleGlobalKeydown(e) {
        // Do not intercept if user is inside an input/textarea
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        // Alt + N or Alt + ArrowRight: Next
        if (e.altKey && (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N')) {
            e.preventDefault();
            goToNextQuestion();
        }
        // Alt + P or Alt + ArrowLeft: Prev
        else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P')) {
            e.preventDefault();
            goToPrevQuestion();
        }
        // Alt + M: Mark for review
        else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
            e.preventDefault();
            toggleMarkForReview();
        }
        // Quick Option Selection: 1, 2, 3, 4 or A, B, C, D
        else if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            const key = e.key.toUpperCase();
            const q = questions[currentIndex];
            if (!q) return;

            const letterMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
            const targetId = letterMap[key] || (['A', 'B', 'C', 'D'].includes(key) ? key : null);

            if (targetId && q.options.some(opt => opt.id === targetId)) {
                handleOptionSelect(q, targetId);
            }
        }
    }

    // Expose controller for testing and external access
    window.AOVSExamController = {
        fetchExamData,
        goToQuestion,
        goToNextQuestion,
        goToPrevQuestion,
        clearCurrentResponse,
        toggleMarkForReview,
        submitExamResponses,
        getCurrentIndex: () => currentIndex,
        getAnswers: () => answers,
        getMarked: () => markedForReview,
        getQuestions: () => questions
    };

    // Auto-boot on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
