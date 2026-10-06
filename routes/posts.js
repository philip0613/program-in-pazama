const express = require('express');
const { pool } = require('../lib/db');
const { requireDB } = require('../middleware/requireDB');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(requireDB);

// GET /api/posts — 게시글 목록 (비회원도 열람 가능)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/posts — 게시글 작성 (로그인 필수)
router.post('/', authenticateToken, async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }

  try {
    const query = `
      INSERT INTO posts (user_id, user_email, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [req.user.id, req.user.email, title, content];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
