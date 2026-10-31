/**
 * AOVS (Online Assessment and Verification System)
 * SCRUM-8: Instructor Review Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Session Verification & Profile Population
    let currentEvaluator = null;
    try {
        const stored = sessionStorage.getItem('aovs_instructor');
        if (stored) {
            currentEvaluator = JSON.parse(stored);
        }
    } catch (e) {}

    const evaluatorNameEl = document.getElementById('evaluatorName');
    const evaluatorRoleEl = document.getElementById('evaluatorRole');
    const evaluatorAvatarEl = document.getElementById('evaluatorAvatar');
    const instructorDeptEl = document.getElementById('instructorDepartment');
    const logoutBtn = document.getElementById('logoutBtn');

    if (currentEvaluator) {
        if (evaluatorNameEl) evaluatorNameEl.textContent = currentEvaluator.name || 'Instructor';
        if (evaluatorRoleEl) evaluatorRoleEl.textContent = `${currentEvaluator.title || 'Evaluator'} • ${currentEvaluator.role || 'Instructor'}`;
        if (instructorDeptEl && currentEvaluator.department) instructorDeptEl.textContent = currentEvaluator.department;
        if (evaluatorAvatarEl) {
            const initials = (currentEvaluator.name || 'DK')
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
            evaluatorAvatarEl.textContent = initials;
        }
    }

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to sign out from the Review Dashboard?')) {
                sessionStorage.removeItem('aovs_instructor');
                const loginUrl = window.location.protocol === 'file:' ? 'login.html' : '/Instructor/login.html';
                window.location.href = loginUrl;
            }
        });
    }

    // Base API URL
    function getApiBaseUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000';
        }
        return '';
    }

    // State
    let allSubmissions = [];
    let activeSubmissionDetail = null;

    // DOM Elements
    const tableBody = document.getElementById('submissionsTableBody');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const refreshBtn = document.getElementById('refreshBtn');

    const statTotalEl = document.getElementById('statTotalSubmissions');
    const statPendingEl = document.getElementById('statPendingReviews');
    const statEvaluatedEl = document.getElementById('statEvaluated');
    const statAvgDurationEl = document.getElementById('statAvgDuration');

    const reviewModal = document.getElementById('reviewModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const saveGradeBtn = document.getElementById('saveGradeBtn');
    const toastEl = document.getElementById('toastNotification');

    function showToast(message, isSuccess = true) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.style.borderColor = isSuccess ? '#10b981' : '#ef4444';
        toastEl.style.display = 'block';
        setTimeout(() => {
            toastEl.style.display = 'none';
        }, 3200);
    }

    // Fetch and render dashboard statistics
    async function fetchStats() {
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/instructor/stats`);
            if (res.ok) {
                const data = await res.json();
                const s = data.stats;
                if (statTotalEl) statTotalEl.textContent = s.totalSubmissions;
                if (statPendingEl) statPendingEl.textContent = s.pendingReviews;
                if (statEvaluatedEl) statEvaluatedEl.textContent = s.completedReviews;
                if (statAvgDurationEl) statAvgDurationEl.textContent = s.formattedAvgDuration || '--';
            }
        } catch (e) {
            console.warn('Could not fetch instructor stats:', e);
        }
    }

    // Fetch submissions list
    async function fetchSubmissions() {
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell">
                        <i class="fa-solid fa-circle-notch fa-spin"></i> Loading student submissions...
                    </td>
                </tr>
            `;
        }

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/instructor/submissions`);
            if (res.ok) {
                const data = await res.json();
                allSubmissions = data.submissions || [];
                renderSubmissionsTable();
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="loading-cell" style="color: #ef4444;">
                            Failed to load submissions. Please ensure the backend service is running.
                        </td>
                    </tr>
                `;
            }
        } catch (e) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell" style="color: #ef4444;">
                        Connection error while loading submissions.
                    </td>
                </tr>
            `;
        }
    }

    // Render Submissions Table with Filters
    function renderSubmissionsTable() {
        if (!tableBody) return;

        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedStatus = filterStatus ? filterStatus.value : 'all';

        const filtered = allSubmissions.filter(sub => {
            const matchesStatus = (selectedStatus === 'all') || (sub.status === selectedStatus);
            const matchesQuery = !query ||
                (sub.studentId && sub.studentId.toLowerCase().includes(query)) ||
                (sub.studentName && sub.studentName.toLowerCase().includes(query)) ||
                (sub.examTitle && sub.examTitle.toLowerCase().includes(query)) ||
                (sub.submissionId && sub.submissionId.toLowerCase().includes(query));

            return matchesStatus && matchesQuery;
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell">
                        No student assessments found matching your filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map(sub => {
            const isPending = sub.status === 'Pending Review';
            const statusClass = isPending ? 'pending' : 'reviewed';
            const scoreDisplay = sub.totalScore !== null
                ? `<span class="score-text graded">${sub.totalScore} / ${sub.maxScore}</span>`
                : `<span class="score-text" style="color: #71717a;">Not Graded</span>`;

            return `
                <tr data-submission-id="${sub.submissionId}">
                    <td>
                        <div class="student-col">
                            <span class="student-name">${escapeHtml(sub.studentName)}</span>
                            <span class="student-id">${escapeHtml(sub.studentId)}</span>
                        </div>
                    </td>
                    <td>
                        <div class="exam-title-col" title="${escapeHtml(sub.examTitle)}">
                            ${escapeHtml(sub.examTitle)}
                        </div>
                    </td>
                    <td>
                        <strong style="color: #ffffff;">${sub.answeredCount}</strong>
                        <span style="color: #71717a;">/ ${sub.questionsCount}</span>
                    </td>
                    <td>
                        <span style="font-family: monospace; color: #dfdff2;">${sub.formattedTimeSpent}</span>
                    </td>
                    <td>
                        <span class="telemetry-badge" title="Average response time spent per question">
                            <i class="fa-solid fa-clock"></i> ${sub.formattedAvgResponseTime || '--'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <i class="fa-solid ${isPending ? 'fa-hourglass-half' : 'fa-check'}"></i>
                            ${escapeHtml(sub.status)}
                        </span>
                    </td>
                    <td>
                        ${scoreDisplay}
                    </td>
                    <td style="text-align: right;">
                        <button type="button" class="review-btn open-review-btn" data-id="${sub.submissionId}">
                            <i class="fa-solid fa-file-signature"></i> ${isPending ? 'Review &amp; Grade' : 'Inspect &amp; Edit'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind click events on review buttons
        document.querySelectorAll('.open-review-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const subId = btn.getAttribute('data-id');
                openReviewModal(subId);
            });
        });
    }

    // Open detailed review & grading modal
    async function openReviewModal(submissionId) {
        if (!reviewModal) return;

        reviewModal.style.display = 'flex';
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #a1a1aa;">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Loading assessment answers &amp; question telemetry...
                </div>
            `;
        }

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/instructor/submissions/${submissionId}`);
            if (!res.ok) {
                modalBody.innerHTML = `<div style="color: #ef4444; padding: 20px;">Failed to load submission details.</div>`;
                return;
            }

            const data = await res.json();
            activeSubmissionDetail = data.submission;
            renderModalContent(activeSubmissionDetail);
        } catch (e) {
            modalBody.innerHTML = `<div style="color: #ef4444; padding: 20px;">Connection error loading submission.</div>`;
        }
    }

    function renderModalContent(sub) {
        document.getElementById('modalStudentName').textContent = `${sub.studentName} — Assessment Review`;
        document.getElementById('modalStudentId').innerHTML = `<i class="fa-regular fa-id-card"></i> ${escapeHtml(sub.studentId)}`;
        document.getElementById('modalExamTitle').innerHTML = `<i class="fa-solid fa-book"></i> ${escapeHtml(sub.examTitle)}`;
        document.getElementById('modalTotalTime').innerHTML = `<i class="fa-solid fa-stopwatch"></i> Exam Time: ${sub.formattedTimeSpent}`;

        const statusBadge = document.getElementById('modalStatusBadge');
        if (statusBadge) {
            statusBadge.className = `status-badge ${sub.status === 'Pending Review' ? 'pending' : 'reviewed'}`;
            statusBadge.textContent = sub.status;
        }

        document.getElementById('modalMaxScore').textContent = sub.maxScore;

        const modalBody = document.getElementById('modalBody');
        const questions = sub.questions || [];

        modalBody.innerHTML = `
            ${questions.map((q, idx) => {
                const telemetry = q.responseTelemetry;
                const timePill = telemetry
                    ? `<span class="q-telemetry-pill" title="Time spent on this question during exam">
                         <i class="fa-solid fa-stopwatch"></i> Response Time: ${telemetry.formattedTime} (${telemetry.interactions} interactions)
                       </span>`
                    : '';

                const currentScore = q.awardedMarks !== null ? q.awardedMarks : '';

                return `
                    <div class="question-review-card" data-qid="${q.id}" data-max="${q.maxMarks}">
                        <div class="q-header">
                            <div>
                                <span class="q-number-tag">Question ${q.questionNumber || idx + 1} &bull; ${q.maxMarks} Marks</span>
                                <h4 class="q-title">${escapeHtml(q.title)}</h4>
                            </div>
                            ${timePill}
                        </div>

                        <div class="student-answer-box">
                            <span class="box-label"><i class="fa-regular fa-comment-dots"></i> Student Written Response:</span>
                            <div class="answer-text">${escapeHtml(q.studentAnswer)}</div>
                        </div>

                        ${q.sampleAnswer ? `
                            <div style="background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #a1a1aa;">
                                <strong style="color: #38bdf8;"><i class="fa-solid fa-key"></i> Key Concepts &amp; Rubric:</strong>
                                <p style="margin-top: 4px; line-height: 1.4;">${escapeHtml(q.sampleAnswer)}</p>
                            </div>
                        ` : ''}

                        <div class="scoring-row">
                            <div style="font-size: 12px; color: #a1a1aa;">
                                Assign score between 0 and ${q.maxMarks}
                            </div>
                            <div class="score-input-wrap">
                                <label for="score_${q.id}">Awarded Marks:</label>
                                <input type="number" id="score_${q.id}" class="score-input q-score-input"
                                       data-qid="${q.id}" min="0" max="${q.maxMarks}" step="1"
                                       value="${currentScore}" placeholder="0 - ${q.maxMarks}">
                                <span>/ ${q.maxMarks}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}

            <div class="feedback-section">
                <span class="box-label"><i class="fa-regular fa-pen-to-square"></i> Instructor Written Feedback &amp; Evaluation Notes:</span>
                <textarea id="instructorFeedbackInput" class="feedback-textarea"
                          placeholder="Provide constructive feedback for the student on algorithm choice, complexity analysis, and solution structure...">${escapeHtml(sub.instructorFeedback || '')}</textarea>
            </div>
        `;

        // Real-time calculation of total score
        const scoreInputs = modalBody.querySelectorAll('.q-score-input');
        scoreInputs.forEach(input => {
            input.addEventListener('input', calculateModalTotal);
        });

        calculateModalTotal();
    }

    function calculateModalTotal() {
        const scoreInputs = document.querySelectorAll('.q-score-input');
        let total = 0;
        let anyEntered = false;

        scoreInputs.forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val)) {
                total += val;
                anyEntered = true;
            }
        });

        const scoreEl = document.getElementById('modalCalculatedScore');
        if (scoreEl) {
            scoreEl.textContent = anyEntered ? total : '--';
        }
    }

    // Save Evaluation & Grade Handler
    if (saveGradeBtn) {
        saveGradeBtn.addEventListener('click', async () => {
            if (!activeSubmissionDetail) return;

            const scoreInputs = document.querySelectorAll('.q-score-input');
            const marks = {};
            scoreInputs.forEach(input => {
                const qid = input.getAttribute('data-qid');
                const val = input.value !== '' ? Number(input.value) : 0;
                marks[qid] = val;
            });

            const feedbackInput = document.getElementById('instructorFeedbackInput');
            const feedback = feedbackInput ? feedbackInput.value.trim() : '';

            saveGradeBtn.disabled = true;
            saveGradeBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Saving Evaluation...`;

            try {
                const res = await fetch(`${getApiBaseUrl()}/api/instructor/submissions/${activeSubmissionDetail.submissionId}/grade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        marks,
                        feedback,
                        status: 'Reviewed'
                    })
                });

                if (res.ok) {
                    showToast('Assessment evaluation and grade saved successfully!');
                    closeModal();
                    await fetchSubmissions();
                    await fetchStats();
                } else {
                    showToast('Failed to save evaluation', false);
                }
            } catch (e) {
                showToast('Network error while saving evaluation', false);
            } finally {
                saveGradeBtn.disabled = false;
                saveGradeBtn.innerHTML = `<i class="fa-solid fa-check-double"></i> Save Evaluation &amp; Grade`;
            }
        });
    }

    function closeModal() {
        if (reviewModal) {
            reviewModal.style.display = 'none';
        }
        activeSubmissionDetail = null;
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (reviewModal) {
        reviewModal.addEventListener('click', (e) => {
            if (e.target === reviewModal) closeModal();
        });
    }

    // Search and filter listeners
    if (searchInput) searchInput.addEventListener('input', renderSubmissionsTable);
    if (filterStatus) filterStatus.addEventListener('change', renderSubmissionsTable);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await fetchSubmissions();
            await fetchStats();
            showToast('Submissions refreshed');
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Initial load
    fetchStats();
    fetchSubmissions();
});
