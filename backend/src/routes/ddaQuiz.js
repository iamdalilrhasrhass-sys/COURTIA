/**
 * ddaQuiz.js — Routes Quiz DDA (formation continue)
 * Disponible pour tous les plans (dda_quiz = true partout)
 * Monté sur /api/dda
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')

router.use(verifyToken)

// GET /api/dda/quizzes — liste des quiz disponibles
router.get('/quizzes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, description, year FROM dda_quizzes WHERE active = TRUE'
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/dda/quizzes]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/dda/quizzes/:id/start — démarrer un quiz (questions sans bonnes réponses)
router.get('/quizzes/:id/start', async (req, res) => {
  try {
    const { id } = req.params

    // Vérifier que le quiz existe et est actif
    const quizResult = await pool.query(
      'SELECT id, title, description, year FROM dda_quizzes WHERE id = $1 AND active = TRUE',
      [id]
    )
    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Quiz introuvable' })
    }

    // Questions sans les bonnes réponses
    const questionsResult = await pool.query(
      'SELECT q.id, q.question, q.choices FROM dda_quiz_questions q WHERE q.quiz_id = $1',
      [id]
    )

    return res.json({
      success: true,
      data: {
        quiz: quizResult.rows[0],
        questions: questionsResult.rows
      }
    })
  } catch (err) {
    console.error('[GET /api/dda/quizzes/:id/start]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/dda/quizzes/:id/attempt — soumettre les réponses
router.post('/quizzes/:id/attempt', async (req, res) => {
  try {
    const user_id = req.user.userId
    const { id } = req.params
    const { answers } = req.body

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        error: 'validation_error',
        message: 'answers doit être un objet { question_id: "A"|"B"|"C"|"D", ... }'
      })
    }

    // Vérifier que le quiz existe
    const quizResult = await pool.query(
      'SELECT id FROM dda_quizzes WHERE id = $1 AND active = TRUE',
      [id]
    )
    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Quiz introuvable' })
    }

    // Récupérer les bonnes réponses
    const questionsResult = await pool.query(
      'SELECT id, correct_answer FROM dda_quiz_questions WHERE quiz_id = $1',
      [id]
    )
    const questions = questionsResult.rows

    // Calculer le score
    let correct_count = 0
    const total_count = questions.length

    for (const question of questions) {
      const userAnswer = answers[question.id] || answers[String(question.id)]
      if (userAnswer && userAnswer.toUpperCase() === (question.correct_answer || '').toUpperCase()) {
        correct_count++
      }
    }

    const score = total_count > 0 ? Math.round((correct_count / total_count) * 100) : 0
    const passed = score >= 70

    // Enregistrer la tentative
    const attemptResult = await pool.query(
      `INSERT INTO dda_quiz_attempts (user_id, quiz_id, score, passed, answers, completed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        user_id,
        id,
        score,
        passed,
        JSON.stringify(answers)
      ]
    )

    const attempt = attemptResult.rows[0]
    const certificate_url = passed ? `/api/dda/certificate/${attempt.id}` : null

    return res.status(201).json({
      success: true,
      data: {
        attempt_id: attempt.id,
        score,
        passed,
        correct_count,
        total_count,
        certificate_url
      }
    })
  } catch (err) {
    console.error('[POST /api/dda/quizzes/:id/attempt]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/dda/progress — progression de l'utilisateur
router.get('/progress', async (req, res) => {
  try {
    const user_id = req.user.userId

    const result = await pool.query(
      'SELECT * FROM dda_quiz_attempts WHERE user_id = $1 ORDER BY completed_at DESC',
      [user_id]
    )

    const attempts = result.rows
    const attempts_count = attempts.length
    const last_attempt = attempts.length > 0 ? attempts[0] : null
    const best_score = attempts.length > 0
      ? Math.max(...attempts.map(a => a.score || 0))
      : 0
    const certified = attempts.some(a => a.passed === true)

    return res.json({
      success: true,
      data: {
        last_attempt,
        best_score,
        attempts_count,
        certified
      }
    })
  } catch (err) {
    console.error('[GET /api/dda/progress]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = router
