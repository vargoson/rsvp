const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { pool, initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

initDatabase().catch(console.error);

// Get all guests
app.get('/api/guests', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM guests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RSVP
app.post('/api/rsvp', async (req, res) => {
  const { name, attending } = req.body;
  if (!name || attending === undefined) return res.status(400).json({ error: 'Missing data' });

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  try {
    const existing = await pool.query('SELECT id FROM guests WHERE LOWER(name) = LOWER($1)', [name]);
    
    if (existing.rows.length > 0) {
      await pool.query('UPDATE guests SET attending = $1 WHERE id = $2', [attending, existing.rows[0].id]);
      res.json({ id: existing.rows[0].id, name, attending });
    } else {
      const result = await pool.query(
        'INSERT INTO guests (name, attending, avatar_color) VALUES ($1, $2, $3) RETURNING *',
        [name, attending, avatarColor]
      );
      res.json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comments
app.post('/api/comments', async (req, res) => {
  const { guest_id, comment } = req.body;
  if (!guest_id || !comment) return res.status(400).json({ error: 'Missing data' });

  try {
    const result = await pool.query(
      'INSERT INTO comments (guest_id, comment) VALUES ($1, $2) RETURNING id',
      [guest_id, comment]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/comments', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, g.name, g.avatar_color 
      FROM comments c 
      JOIN guests g ON c.guest_id = g.id 
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Photos
app.post('/api/photos', async (req, res) => {
  const { guest_id, photo_url } = req.body;
  if (!guest_id || !photo_url) return res.status(400).json({ error: 'Missing data' });

  try {
    const result = await pool.query(
      'INSERT INTO photos (guest_id, photo_url) VALUES ($1, $2) RETURNING id',
      [guest_id, photo_url]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/photos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, g.name, g.avatar_color 
      FROM photos p 
      JOIN guests g ON p.guest_id = g.id 
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Poll
app.get('/api/poll', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        po.id, po.name, po.emoji,
        COUNT(pv.id) as vote_count,
        STRING_AGG(g.name, ',') as voters
      FROM poll_options po
      LEFT JOIN poll_votes pv ON po.id = pv.option_id
      LEFT JOIN guests g ON pv.guest_id = g.id
      GROUP BY po.id
      ORDER BY vote_count DESC
    `);
    res.json(rows.map(r => ({ ...r, voters: r.voters ? r.voters.split(',') : [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/poll/vote', async (req, res) => {
  const { guest_id, option_id } = req.body;
  if (!guest_id || !option_id) return res.status(400).json({ error: 'Missing data' });

  try {
    const existing = await pool.query(
      'SELECT id FROM poll_votes WHERE guest_id = $1 AND option_id = $2',
      [guest_id, option_id]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM poll_votes WHERE guest_id = $1 AND option_id = $2', [guest_id, option_id]);
      res.json({ action: 'removed' });
    } else {
      await pool.query('INSERT INTO poll_votes (guest_id, option_id) VALUES ($1, $2)', [guest_id, option_id]);
      res.json({ action: 'added' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/poll/add-option', async (req, res) => {
  const { name, emoji, guest_id } = req.body;
  if (!name || !guest_id) return res.status(400).json({ error: 'Missing data' });

  try {
    const existing = await pool.query('SELECT id FROM poll_options WHERE LOWER(name) = LOWER($1)', [name]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Už existuje!' });

    const result = await pool.query(
      'INSERT INTO poll_options (name, emoji) VALUES ($1, $2) RETURNING id',
      [name, emoji || '']
    );
    const optionId = result.rows[0].id;
    
    await pool.query('INSERT INTO poll_votes (guest_id, option_id) VALUES ($1, $2)', [guest_id, optionId]);
    res.json({ id: optionId, name, emoji });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backup endpoint
app.get('/api/backup', async (req, res) => {
  try {
    const backup = { timestamp: new Date().toISOString() };
    
    const tables = ['guests', 'comments', 'photos', 'poll_options', 'poll_votes'];
    for (const table of tables) {
      const { rows } = await pool.query(`SELECT * FROM ${table}`);
      backup[table] = rows;
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dekolaudacka-backup-${Date.now()}.json"`);
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore endpoint
app.post('/api/restore', async (req, res) => {
  const backup = req.body;
  if (!backup || !backup.guests) return res.status(400).json({ error: 'Invalid backup' });

  try {
    await pool.query('DELETE FROM poll_votes');
    await pool.query('DELETE FROM comments');
    await pool.query('DELETE FROM photos');
    await pool.query('DELETE FROM poll_options');
    await pool.query('DELETE FROM guests');

    if (backup.guests) {
      for (const g of backup.guests) {
        await pool.query(
          'INSERT INTO guests (id, name, attending, avatar_color, created_at) VALUES ($1, $2, $3, $4, $5)',
          [g.id, g.name, g.attending, g.avatar_color, g.created_at]
        );
      }
    }

    if (backup.comments) {
      for (const c of backup.comments) {
        await pool.query(
          'INSERT INTO comments (id, guest_id, comment, created_at) VALUES ($1, $2, $3, $4)',
          [c.id, c.guest_id, c.comment, c.created_at]
        );
      }
    }

    if (backup.photos) {
      for (const p of backup.photos) {
        await pool.query(
          'INSERT INTO photos (id, guest_id, photo_url, drive_id, created_at) VALUES ($1, $2, $3, $4, $5)',
          [p.id, p.guest_id, p.photo_url, p.drive_id, p.created_at]
        );
      }
    }

    if (backup.poll_options) {
      for (const o of backup.poll_options) {
        await pool.query(
          'INSERT INTO poll_options (id, name, emoji, created_at) VALUES ($1, $2, $3, $4)',
          [o.id, o.name, o.emoji, o.created_at]
        );
      }
    }

    if (backup.poll_votes) {
      for (const v of backup.votes) {
        await pool.query(
          'INSERT INTO poll_votes (id, guest_id, option_id, created_at) VALUES ($1, $2, $3, $4)',
          [v.id, v.guest_id, v.option_id, v.created_at]
        );
      }
    }

    res.json({ success: true, message: 'Database restored' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));

