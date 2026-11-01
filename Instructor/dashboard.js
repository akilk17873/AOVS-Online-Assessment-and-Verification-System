/**
 * AOVS (Online Assessment and Verification System)
 * SCRUM-8 & SCRUM-13: Instructor Review Dashboard & Risk Score Telemetry
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
    let activeRiskThreshold = 65;

    // DOM Elements
    const tableBody = document.getElementById('submissionsTableBody');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const filterRisk = document.getElementById('filterRisk');
    const refreshBtn = document.getElementById('refreshBtn');

    const statTotalEl = document.getElementById('statTotalSubmissions');
    const statPendingEl = document.getElementById('statPendingReviews');
    const statEvaluatedEl = document.getElementById('statEvaluated');
    const statFlaggedEl = document.getElementById('statFlaggedReviews');
    const statAvgDurationEl = document.getElementById('statAvgDuration');

    const reviewModal = document.getElementById('reviewModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const saveGradeBtn = document.getElementById('saveGradeBtn');
    const toastEl = document.getElementById('toastNotification');

    // Threshold Config Elements (SCRUM-13)
    const openThresholdBtn = document.getElementById('openThresholdBtn');
    const thresholdModal = document.getElementById('thresholdModal');
    const closeThresholdModalBtn = document.getElementById('closeThresholdModalBtn');
    const cancelThresholdBtn = document.getElementById('cancelThresholdBtn');
    const saveThresholdBtn = document.getElementById('saveThresholdBtn');
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdDisplayValue = document.getElementById('thresholdDisplayValue');
    const currentThresholdBadge = document.getElementById('currentThresholdBadge');

    function showToast(message, isSuccess = true) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.style.borderColor = isSuccess ? '#10b981' : '#ef4444';
        toastEl.style.display = 'block';
        setTimeout(() => {
            toastEl.style.display = 'none';
        }, 3200);
    }

    // SCRUM-13: Fetch active risk configuration
    async function fetchRiskConfig() {
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/instructor/risk-config`);
            if (res.ok) {
                const data = await res.json();
                if (data.config && typeof data.config.threshold === 'number') {
                    activeRiskThreshold = data.config.threshold;
                    if (currentThresholdBadge) currentThresholdBadge.textContent = activeRiskThreshold;
                    if (thresholdSlider) thresholdSlider.value = activeRiskThreshold;
                    if (thresholdDisplayValue) thresholdDisplayValue.textContent = activeRiskThreshold;
                }
            }
        } catch (e) {
            console.warn('Could not fetch risk config:', e);
        }
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
                if (statFlaggedEl) statFlaggedEl.textContent = s.flaggedSubmissionsCount !== undefined ? s.flaggedSubmissionsCount : 0;
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
                    <td colspan="9" class="loading-cell">
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
                        <td colspan="9" class="loading-cell" style="color: #ef4444;">
                            Failed to load submissions. Please ensure the backend service is running.
                        </td>
                    </tr>
                `;
            }
        } catch (e) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-cell" style="color: #ef4444;">
                        Connection error while loading submissions.
                    </td>
                </tr>
            `;
        }
    }

    // Render Submissions Table with Filters (Status & SCRUM-13 Risk)
    function renderSubmissionsTable() {
        if (!tableBody) return;

        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedStatus = filterStatus ? filterStatus.value : 'all';
        const selectedRisk = filterRisk ? filterRisk.value : 'all';

        const filtered = allSubmissions.filter(sub => {
            const matchesStatus = (selectedStatus === 'all') || (sub.status === selectedStatus);

            const rScore = typeof sub.riskScore === 'number' ? sub.riskScore : (sub.riskAnalysis ? sub.riskAnalysis.compositeScore : 0);
            const isFlagged = Boolean(sub.flagged || sub.requiresVerification || (sub.riskAnalysis && sub.riskAnalysis.flagged) || (rScore >= activeRiskThreshold));

            let matchesRisk = true;
            if (selectedRisk === 'flagged') {
                matchesRisk = isFlagged;
            } else if (selectedRisk === 'low') {
                matchesRisk = !isFlagged;
            }

            const matchesQuery = !query ||
                (sub.studentId && sub.studentId.toLowerCase().includes(query)) ||
                (sub.studentName && sub.studentName.toLowerCase().includes(query)) ||
                (sub.examTitle && sub.examTitle.toLowerCase().includes(query)) ||
                (sub.submissionId && sub.submissionId.toLowerCase().includes(query));

            return matchesStatus && matchesRisk && matchesQuery;
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-cell">
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

            // SCRUM-13: Risk Score Rendering
            const rScore = typeof sub.riskScore === 'number' ? sub.riskScore : (sub.riskAnalysis ? sub.riskAnalysis.compositeScore : 0);
            const isFlagged = Boolean(sub.flagged || sub.requiresVerification || (rScore >= activeRiskThreshold));
            let riskClass = 'low';
            let riskIcon = 'fa-check';
            let riskText = 'Verified';

            if (isFlagged) {
                riskClass = 'high';
                riskIcon = 'fa-triangle-exclamation';
                riskText = 'Flagged';
            } else if (rScore >= Math.round(activeRiskThreshold * 0.6)) {
                riskClass = 'medium';
                riskIcon = 'fa-circle-exclamation';
                riskText = 'Medium';
            }

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
                    <td>
                        <span class="risk-badge ${riskClass}" title="Weighted risk score combining response time and paste signals">
                            <i class="fa-solid ${riskIcon}"></i> ${rScore} &bull; ${riskText}
                        </span>
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
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Loading assessment answers, telemetry &amp; risk scores...
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

        // SCRUM-13: Overall Risk Score Badge in Modal Header
        const modalRiskBadge = document.getElementById('modalRiskBadge');
        const rScore = typeof sub.riskScore === 'number' ? sub.riskScore : (sub.riskAnalysis ? sub.riskAnalysis.compositeScore : 0);
        const isFlagged = Boolean(sub.flagged || sub.requiresVerification || (rScore >= activeRiskThreshold));

        if (modalRiskBadge) {
            modalRiskBadge.className = `risk-badge ${isFlagged ? 'high' : 'low'}`;
            modalRiskBadge.innerHTML = `<i class="fa-solid ${isFlagged ? 'fa-triangle-exclamation' : 'fa-shield-check'}"></i> Risk Score: ${rScore} (${isFlagged ? 'Flagged' : 'Normal'})`;
        }

        document.getElementById('modalMaxScore').textContent = sub.maxScore;

        const modalBody = document.getElementById('modalBody');
        const questions = sub.questions || [];

        // SCRUM-13: Risk Telemetry Overview Banner
        const riskCardHtml = `
            <div class="risk-overview-card ${isFlagged ? 'flagged' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
                    <div>
                        <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.8px; color: ${isFlagged ? '#f87171' : '#38bdf8'}; text-transform: uppercase;">
                            <i class="fa-solid fa-microchip"></i> Telemetry &amp; Integrity Signals (SCRUM-13)
                        </span>
                        <h4 style="font-size: 16px; font-weight: 800; color: #ffffff; margin-top: 4px;">
                            ${isFlagged ? '⚠️ Suspicious Answer Patterns Detected — Manual Verification Required' : '✓ Telemetry Verified — Normal Response Rate & Typing Cadence'}
                        </h4>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 11px; color: #a1a1aa; display: block;">Composite Risk Score</span>
                        <strong style="font-size: 22px; font-weight: 800; color: ${isFlagged ? '#ef4444' : '#10b981'}; font-family: monospace;">
                            ${rScore} <span style="font-size: 13px; color: #71717a;">/ 100</span>
                        </strong>
                        <span style="font-size: 10px; color: #a1a1aa; display: block;">Threshold: ${activeRiskThreshold}</span>
                    </div>
                </div>

                ${isFlagged ? `
                    <div class="risk-warning-callout">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size: 16px; flex-shrink: 0;"></i>
                        <div>
                            <strong>Verification Required:</strong>
                            <span>This submission exceeded the risk threshold (${rScore} &ge; ${activeRiskThreshold}). The system detected rapid response times combined with external paste events. Verify authenticity before finalizing grade.</span>
                        </div>
                    </div>
                ` : `
                    <div style="font-size: 12px; color: #a1a1aa; margin-top: 4px;">
                        No anomalies detected. Typing velocity conforms to expected human baseline (&le; 6.0 chars/sec) without excessive paste bursts.
                    </div>
                `}
            </div>
        `;

        modalBody.innerHTML = `
            ${riskCardHtml}

            ${questions.map((q, idx) => {
                const telemetry = q.responseTelemetry;
                const timePill = telemetry
                    ? `<span class="q-telemetry-pill" title="Time spent on this question during exam">
                         <i class="fa-solid fa-stopwatch"></i> Response Time: ${telemetry.formattedTime} (${telemetry.interactions} interactions)
                       </span>`
                    : '';

                // SCRUM-13: Per-Question Risk Data
                const qRisk = q.risk || { score: 10, riskLevel: 'LOW', flagged: false, flagReason: '' };
                const isQFlagged = Boolean(qRisk.flagged);
                const qRiskPill = `
                    <span class="q-risk-pill ${isQFlagged ? 'high' : 'low'}" title="Weighted risk computed for this answer">
                        <i class="fa-solid ${isQFlagged ? 'fa-triangle-exclamation' : 'fa-shield-check'}"></i> Risk: ${qRisk.score}
                    </span>
                `;

                const metrics = qRisk.metrics || {};
                const typingSpeedText = metrics.typingSpeedCps !== undefined ? `${metrics.typingSpeedCps} chars/sec` : '--';
                const pasteCountText = metrics.pasteCount !== undefined ? `${metrics.pasteCount} paste(s)` : '0 pastes';

                const currentScore = q.awardedMarks !== null ? q.awardedMarks : '';

                return `
                    <div class="question-review-card" data-qid="${q.id}" data-max="${q.maxMarks}">
                        <div class="q-header">
                            <div>
                                <span class="q-number-tag">Question ${q.questionNumber || idx + 1} &bull; ${q.maxMarks} Marks</span>
                                <h4 class="q-title">${escapeHtml(q.title)}</h4>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                ${timePill}
                                ${qRiskPill}
                            </div>
                        </div>

                        <!-- SCRUM-13: Telemetry Signals Strip -->
                        <div style="display: flex; gap: 14px; font-size: 11px; color: #a1a1aa; padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                            <span><strong style="color: #dfdff2;">Typing Speed:</strong> ${typingSpeedText}</span>
                            <span><strong style="color: #dfdff2;">Paste Events:</strong> ${pasteCountText}</span>
                            ${metrics.pastedChars ? `<span><strong style="color: #f87171;">Pasted Chars:</strong> ${metrics.pastedChars}</span>` : ''}
                        </div>

                        ${isQFlagged && qRisk.flagReason ? `
                            <div class="risk-warning-callout">
                                <i class="fa-solid fa-flag" style="color: #ef4444;"></i>
                                <span><strong>Flagged Signal:</strong> ${escapeHtml(qRisk.flagReason)}</span>
                            </div>
                        ` : ''}

                        <div class="student-answer-box">
                            <span class="box-label"><i class="fa-regular fa-comment-dots"></i> Student Written Response:</span>
                            <div class="answer-text">${escapeHtml(q.studentAnswer)}</div>
                        </div>

                        ${q.oralVerification ? `
                            <div class="oral-verification-review-card" style="margin-top: 10px; background: rgba(237, 255, 102, 0.04); border: 1px solid rgba(237, 255, 102, 0.25); border-radius: 8px; padding: 12px 14px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                                    <span style="font-size: 11px; font-weight: 800; color: #edff66; text-transform: uppercase; letter-spacing: 0.5px;">
                                        <i class="fa-solid fa-microphone-lines"></i> Adaptive Oral Verification (SCRUM-16)
                                    </span>
                                    <span class="oral-status-tag" style="font-size: 11px; color: ${q.oralVerification.microphoneStatus === 'denied' || (q.oralVerification.status && q.oralVerification.status.includes('Unverifiable')) ? '#fbbf24' : '#38bdf8'}; background: ${q.oralVerification.microphoneStatus === 'denied' || (q.oralVerification.status && q.oralVerification.status.includes('Unverifiable')) ? 'rgba(251, 191, 36, 0.12)' : 'rgba(56, 189, 248, 0.1)'}; border: 1px solid ${q.oralVerification.microphoneStatus === 'denied' || (q.oralVerification.status && q.oralVerification.status.includes('Unverifiable')) ? 'rgba(251, 191, 36, 0.35)' : 'rgba(56, 189, 248, 0.25)'}; padding: 2px 8px; border-radius: 4px;">
                                        <i class="fa-regular fa-clock"></i> ${q.oralVerification.timeElapsedSeconds || q.oralVerification.durationSeconds || 35}s spoken response (${q.oralVerification.status || 'Completed'})
                                    </span>
                                </div>
                                <div class="oral-review-prompt" style="font-size: 13px; font-weight: 600; color: #ffffff; line-height: 1.5; margin-bottom: 10px;">
                                    <span style="color: #a1a1aa; font-weight: 500; font-size: 11px; display: block; margin-bottom: 2px;">Spontaneous Oral Follow-Up Prompt:</span>
                                    "${escapeHtml(q.oralVerification.questionPrompt)}"
                                </div>

                                ${q.oralVerification.microphoneStatus === 'denied' || (q.oralVerification.status && q.oralVerification.status.includes('Unverifiable')) ? `
                                    <div class="oral-unverifiable-warning" style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #fbbf24; display: flex; align-items: center; gap: 8px;">
                                        <i class="fa-solid fa-triangle-exclamation"></i>
                                        <span><strong>Unverifiable Case (FR 3.3.3):</strong> Student microphone was unavailable or permission denied. Spoken audio could not be captured. Flagged for manual interview.</span>
                                    </div>
                                ` : `
                                    ${q.oralVerification.audioDataUrl || q.oralVerification.audioUrl ? `
                                        <div class="oral-audio-player-wrap" style="margin-top: 10px; margin-bottom: 10px; background: rgba(0, 0, 0, 0.35); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.2);">
                                            <div style="font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                                                <i class="fa-solid fa-headphones"></i> Recorded Student Voice Audio:
                                            </div>
                                            <audio controls preload="metadata" class="oral-audio-player" src="${q.oralVerification.audioDataUrl || q.oralVerification.audioUrl}" style="width: 100%; height: 36px; border-radius: 6px; outline: none;"></audio>
                                        </div>
                                    ` : ''}

                                    ${q.oralVerification.transcript ? `
                                        <div class="oral-transcript-box" style="margin-top: 8px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 10px 12px;">
                                            <div style="font-size: 11px; font-weight: 700; color: #10b981; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                                                <i class="fa-solid fa-file-waveform"></i> Speech-to-Text Transcript (Whisper STT):
                                            </div>
                                            <div class="oral-transcript-text" style="font-size: 12.5px; color: #f4f4f5; font-style: italic; line-height: 1.4;">
                                                "${escapeHtml(q.oralVerification.transcript)}"
                                            </div>
                                        </div>
                                    ` : ''}
                                `}
                            </div>
                        ` : ''}

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

    // SCRUM-13: Threshold Configuration Modal Event Handlers
    if (openThresholdBtn && thresholdModal) {
        openThresholdBtn.addEventListener('click', () => {
            if (thresholdSlider) thresholdSlider.value = activeRiskThreshold;
            if (thresholdDisplayValue) thresholdDisplayValue.textContent = activeRiskThreshold;
            thresholdModal.style.display = 'flex';
        });
    }

    function closeThresholdModal() {
        if (thresholdModal) thresholdModal.style.display = 'none';
    }

    if (closeThresholdModalBtn) closeThresholdModalBtn.addEventListener('click', closeThresholdModal);
    if (cancelThresholdBtn) cancelThresholdBtn.addEventListener('click', closeThresholdModal);

    if (thresholdSlider && thresholdDisplayValue) {
        thresholdSlider.addEventListener('input', (e) => {
            thresholdDisplayValue.textContent = e.target.value;
        });
    }

    if (saveThresholdBtn) {
        saveThresholdBtn.addEventListener('click', async () => {
            const newThreshold = parseInt(thresholdSlider.value, 10);
            saveThresholdBtn.disabled = true;
            saveThresholdBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Applying...`;

            try {
                const res = await fetch(`${getApiBaseUrl()}/api/instructor/risk-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ threshold: newThreshold })
                });

                if (res.ok) {
                    activeRiskThreshold = newThreshold;
                    if (currentThresholdBadge) currentThresholdBadge.textContent = newThreshold;
                    showToast(`Risk threshold updated to ${newThreshold}%. Submissions re-evaluated!`);
                    closeThresholdModal();
                    await fetchSubmissions();
                    await fetchStats();
                } else {
                    showToast('Failed to update risk threshold', false);
                }
            } catch (e) {
                showToast('Network error while updating threshold', false);
            } finally {
                saveThresholdBtn.disabled = false;
                saveThresholdBtn.innerHTML = `<i class="fa-solid fa-check"></i> Apply &amp; Re-evaluate Submissions`;
            }
        });
    }

    // Search and filter listeners
    if (searchInput) searchInput.addEventListener('input', renderSubmissionsTable);
    if (filterStatus) filterStatus.addEventListener('change', renderSubmissionsTable);
    if (filterRisk) filterRisk.addEventListener('change', renderSubmissionsTable);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await fetchRiskConfig();
            await fetchSubmissions();
            await fetchStats();
            showToast('Submissions and risk scores refreshed');
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
    fetchRiskConfig();
    fetchStats();
    fetchSubmissions();
});
