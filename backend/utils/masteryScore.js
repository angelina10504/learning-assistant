function computeMasteryScore({ sessions = [], quizResults = [], planTopic = null }) {
    let tier = 'not_started'

    // 1. In-session performance (25 pts)
    const inSessionCorrect = sessions.reduce((sum, s) => sum + (s.correctAnswers || 0), 0)
    const inSessionTotal = sessions.reduce((sum, s) => sum + (s.questionsAsked || 0), 0)
    const c1 = inSessionTotal > 0 ? (inSessionCorrect / inSessionTotal) * 25 : 0

    // 2. Final quiz performance (40 pts)
    // Get most recent result for this topic
    const sortedResults = [...quizResults].sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt))
    const latestResult = sortedResults.length > 0 ? sortedResults[0] : null
    const c2 = latestResult ? (latestResult.score / 100) * 40 : 0

    // 3. Session engagement (20 pts)
    const totalExchanges = sessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0)
    const totalMinutes = sessions.reduce((sum, s) => sum + Math.round((s.duration || 0) / 60), 0)
    const exchangeScore = Math.min(totalExchanges / 10, 1) * 12
    const timeScore = Math.min(totalMinutes / 20, 1) * 8
    const c3 = exchangeScore + timeScore

    // 4. Completion & recovery (15 pts)
    let c4 = 0
    if (planTopic) {
        const completionBonus = planTopic.status === 'completed' ? 10 : 
                                planTopic.status === 'in_progress' ? 4 : 0
        const retryBonus = Math.min((latestResult?.attemptNumber || 0) > 1 ? 5 : 0, 5)
        c4 = completionBonus + retryBonus
    }

    const totalScore = Math.round(c1 + c2 + c3 + c4)

    // Assign tier based on explicitly requested thresholds
    if (totalScore >= 80)      tier = 'mastered'
    else if (totalScore >= 60) tier = 'proficient'
    else if (totalScore >= 40) tier = 'developing'
    else if (totalScore > 0 || sessions.length > 0) tier = 'emerging'

    return { totalScore, tier }
}

module.exports = { computeMasteryScore }
