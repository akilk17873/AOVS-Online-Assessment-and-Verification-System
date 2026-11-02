/**
 * AOVS (Online Assessment and Verification System)
 * SCRUM-13: Risk Scoring Engine
 *
 * Combines response time and paste-event signals into a weighted risk score
 * so that only genuinely suspicious answers trigger verification.
 *
 * Mathematical Model:
 *  - Paste Signal (S_paste): Based on paste events, pasted characters, and paste ratio.
 *  - Response Time Signal (S_time): Based on typing speed (chars/sec) and response duration anomaly.
 *  - Weighted Score = (W_paste * S_paste) + (W_time * S_time)
 *  - Flagged for verification if Weighted Score >= Configurable Threshold.
 */

require('dotenv').config();

// Global configurable risk settings
const DEFAULT_CONFIG = {
    threshold: Number(process.env.RISK_SCORE_THRESHOLD) || 65,
    weightPaste: 0.55,
    weightTime: 0.45,
    maxNormalTypingCps: 6.0,      // Normal human typing speed ceiling (~70 WPM)
    suspiciousTypingCps: 12.0,    // High anomaly typing speed (superhuman / copy-pasted)
    minAnswerLengthForCheck: 20   // Minimum chars to perform deep anomaly analysis
};

let activeConfig = { ...DEFAULT_CONFIG };

/**
 * Get current risk configuration
 */
function getRiskConfig() {
    return { ...activeConfig };
}

/**
 * Update risk configuration dynamically (AC: Threshold is configurable)
 * @param {Object} newConfig
 */
function updateRiskConfig(newConfig = {}) {
    if (typeof newConfig.threshold === 'number' && !isNaN(newConfig.threshold)) {
        activeConfig.threshold = Math.max(1, Math.min(100, Math.round(newConfig.threshold)));
    }
    if (typeof newConfig.weightPaste === 'number') {
        activeConfig.weightPaste = Math.max(0, Math.min(1, newConfig.weightPaste));
        activeConfig.weightTime = Number((1 - activeConfig.weightPaste).toFixed(2));
    }
    if (typeof newConfig.weightTime === 'number') {
        activeConfig.weightTime = Math.max(0, Math.min(1, newConfig.weightTime));
        activeConfig.weightPaste = Number((1 - activeConfig.weightTime).toFixed(2));
    }
    return { ...activeConfig };
}

/**
 * Reset risk configuration to defaults
 */
function resetRiskConfig() {
    activeConfig = {
        ...DEFAULT_CONFIG,
        threshold: Number(process.env.RISK_SCORE_THRESHOLD) || 65
    };
    return { ...activeConfig };
}

/**
 * Compute Paste-Event Signal (0 to 100)
 * Evaluates:
 *  1. Paste count frequency
 *  2. Volume of pasted text vs total answer length (paste ratio)
 *  3. Single large paste bursts
 */
function computePasteSignal(pasteCount = 0, pastedChars = 0, answerLength = 0) {
    if (pasteCount <= 0 || pastedChars <= 0 || answerLength <= 0) {
        return 0;
    }

    const pasteRatio = Math.min(1, pastedChars / Math.max(answerLength, 1));
    let score = pasteRatio * 70; // Up to 70 points based on proportion of answer pasted

    // Additional penalty for multiple paste events or large volume pastes
    if (pasteCount >= 2) {
        score += Math.min(20, pasteCount * 7);
    }
    if (pastedChars > 150) {
        score += 15;
    }

    return Math.min(100, Math.round(score));
}

/**
 * Compute Response Time & Typing Rate Signal (0 to 100)
 * Evaluates:
 *  1. Typing rate in characters per second (cps)
 *  2. Extremely short time spent on long, complex answers
 */
function computeResponseTimeSignal(timeSpentSeconds = 0, answerLength = 0, config = activeConfig) {
    if (answerLength < config.minAnswerLengthForCheck) {
        return 0;
    }

    const safeTime = Math.max(1, timeSpentSeconds);
    const typingCps = answerLength / safeTime;

    let score = 0;

    // Typing speed anomaly scoring
    if (typingCps <= config.maxNormalTypingCps) {
        // Completely normal human typing rate (0 to 15 points max)
        score = Math.round((typingCps / config.maxNormalTypingCps) * 15);
    } else if (typingCps <= config.suspiciousTypingCps) {
        // Fast typing (15 to 60 points)
        const ratio = (typingCps - config.maxNormalTypingCps) / (config.suspiciousTypingCps - config.maxNormalTypingCps);
        score = 15 + Math.round(ratio * 45);
    } else {
        // Superhuman typing rate (> 12 chars/sec) -> Extreme anomaly (60 to 100 points)
        const excess = Math.min(25, typingCps - config.suspiciousTypingCps);
        score = 60 + Math.round((excess / 25) * 40);
    }

    // Additional duration penalty: answer > 150 chars produced in under 12 seconds
    if (timeSpentSeconds < 12 && answerLength > 150) {
        score = Math.max(score, 85);
    }

    return Math.min(100, Math.round(score));
}

/**
 * Compute weighted risk score for a single question response (AC: Weighted score computed per answer)
 * @param {Object} qTelemetry Telemetry object { timeSpentSeconds, pasteCount, pastedChars, answerLength }
 * @param {string} [answerText] Optional raw answer text
 * @param {Object} [customConfig] Optional custom weights/threshold
 */
function calculateAnswerRisk(qTelemetry = {}, answerText = '', customConfig = null) {
    const config = customConfig ? { ...activeConfig, ...customConfig } : activeConfig;

    const timeSpentSeconds = typeof qTelemetry.timeSpentSeconds === 'number' ? qTelemetry.timeSpentSeconds : 0;
    const pasteCount = typeof qTelemetry.pasteCount === 'number' ? qTelemetry.pasteCount : 0;
    const pastedChars = typeof qTelemetry.pastedChars === 'number' ? qTelemetry.pastedChars : 0;
    const answerLength = typeof qTelemetry.answerLength === 'number'
        ? qTelemetry.answerLength
        : (typeof answerText === 'string' ? answerText.trim().length : 0);

    const safeTime = Math.max(1, timeSpentSeconds);
    const typingSpeedCps = Number((answerLength / safeTime).toFixed(1));

    // Calculate individual signal scores
    const pasteScore = computePasteSignal(pasteCount, pastedChars, answerLength);
    const timeScore = computeResponseTimeSignal(timeSpentSeconds, answerLength, config);

    // Compute weighted score (AC: Weighted score computed per answer)
    const rawWeighted = (config.weightPaste * pasteScore) + (config.weightTime * timeScore);
    const finalScore = Math.max(0, Math.min(100, Math.round(rawWeighted)));

    // Evaluation against configurable threshold
    const flagged = finalScore >= config.threshold;
    const requiresVerification = flagged;

    // Determine risk level category
    let riskLevel = 'LOW';
    if (finalScore >= config.threshold) {
        riskLevel = 'HIGH';
    } else if (finalScore >= Math.round(config.threshold * 0.6)) {
        riskLevel = 'MEDIUM';
    }

    // Generate descriptive flag reasoning for evaluators
    const flagReasons = [];
    if (pasteCount > 0) {
        flagReasons.push(`${pasteCount} paste event(s) detected (${pastedChars} chars pasted)`);
    }
    if (typingSpeedCps > config.maxNormalTypingCps) {
        flagReasons.push(`Elevated typing rate of ${typingSpeedCps} chars/sec`);
    }
    if (timeSpentSeconds < 15 && answerLength > 120) {
        flagReasons.push(`Abnormally brief formulation time (${timeSpentSeconds}s for ${answerLength} chars)`);
    }

    return {
        score: finalScore,
        riskLevel,
        flagged,
        requiresVerification,
        threshold: config.threshold,
        signals: {
            pasteScore,
            timeScore
        },
        weights: {
            paste: config.weightPaste,
            time: config.weightTime
        },
        metrics: {
            timeSpentSeconds,
            answerLength,
            pasteCount,
            pastedChars,
            typingSpeedCps
        },
        flagReasons,
        flagReason: flagReasons.join('; ') || 'Normal telemetry patterns observed'
    };
}

/**
 * Compute overall examination risk analysis across all answers (AC: Score logged for review)
 * @param {Object} perQuestionTelemetry Map of questionId -> telemetry
 * @param {Object} answers Map of questionId -> text
 * @param {Object} [customConfig]
 */
function calculateExamRisk(perQuestionTelemetry = {}, answers = {}, customConfig = null) {
    const config = customConfig ? { ...activeConfig, ...customConfig } : activeConfig;
    const allQIds = Array.from(new Set([
        ...Object.keys(perQuestionTelemetry || {}),
        ...Object.keys(answers || {})
    ]));

    const perAnswerRisk = {};
    let totalScore = 0;
    let maxAnswerScore = 0;
    let answeredQuestionsCount = 0;
    let anyFlagged = false;

    allQIds.forEach(qId => {
        const qTel = (perQuestionTelemetry && perQuestionTelemetry[qId]) || {};
        const qAns = (answers && answers[qId]) || '';
        const answerRisk = calculateAnswerRisk(qTel, qAns, config);

        perAnswerRisk[qId] = answerRisk;

        if (answerRisk.metrics.answerLength > 0 || answerRisk.metrics.pasteCount > 0) {
            totalScore += answerRisk.score;
            maxAnswerScore = Math.max(maxAnswerScore, answerRisk.score);
            answeredQuestionsCount += 1;
            if (answerRisk.flagged) {
                anyFlagged = true;
            }
        }
    });

    // Composite examination risk calculation
    // Combines highest risk answer (peak signal) with overall average
    const avgScore = answeredQuestionsCount > 0 ? Math.round(totalScore / answeredQuestionsCount) : 0;
    const compositeScore = Math.round((maxAnswerScore * 0.65) + (avgScore * 0.35));

    const examFlagged = anyFlagged || (compositeScore >= config.threshold);

    let compositeRiskLevel = 'LOW';
    if (compositeScore >= config.threshold || anyFlagged) {
        compositeRiskLevel = 'HIGH';
    } else if (compositeScore >= Math.round(config.threshold * 0.6)) {
        compositeRiskLevel = 'MEDIUM';
    }

    return {
        compositeScore,
        averageScore: avgScore,
        maxAnswerScore,
        riskLevel: compositeRiskLevel,
        threshold: config.threshold,
        flagged: examFlagged,
        requiresVerification: examFlagged,
        evaluatedAnswersCount: answeredQuestionsCount,
        perAnswer: perAnswerRisk,
        weights: {
            paste: config.weightPaste,
            time: config.weightTime
        },
        analyzedAt: new Date().toISOString()
    };
}

module.exports = {
    DEFAULT_CONFIG,
    getRiskConfig,
    updateRiskConfig,
    resetRiskConfig,
    computePasteSignal,
    computeResponseTimeSignal,
    calculateAnswerRisk,
    calculateExamRisk
};

