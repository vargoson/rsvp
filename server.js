const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./party.db', (err) => {
  if (err) console.error(err);
  else initDatabase();
});

function initDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    attending BOOLEAN NOT NULL,
    avatar_color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    photo_url TEXT NOT NULL,
    drive_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests (id),
    FOREIGN KEY (option_id) REFERENCES poll_options (id),
    UNIQUE(guest_id, option_id)
  )`);

}

app.get('/api/guests', (req, res) => {
  db.all('SELECT * FROM guests ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/rsvp', (req, res) => {
  const { name, attending } = req.body;
  if (!name || attending === undefined) return res.status(400).json({ error: 'Name and attending status required' });

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  db.get('SELECT id FROM guests WHERE LOWER(name) = LOWER(?)', [name], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      db.run('UPDATE guests SET attending = ? WHERE id = ?', [attending, row.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: row.id, name, attending });
      });
    } else {
      db.run('INSERT INTO guests (name, attending, avatar_color) VALUES (?, ?, ?)', [name, attending, avatarColor], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, attending, avatar_color: avatarColor });
      });
    }
  });
});

app.get('/api/guest/:name', (req, res) => {
  db.get('SELECT * FROM guests WHERE LOWER(name) = LOWER(?)', [req.params.name], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Guest not found' });
    res.json(row);
  });
});

app.post('/api/comments', (req, res) => {
  const { guest_id, comment } = req.body;
  if (!guest_id || !comment) return res.status(400).json({ error: 'Guest ID and comment required' });

  db.run('INSERT INTO comments (guest_id, comment) VALUES (?, ?)', [guest_id, comment], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.get('/api/comments', (req, res) => {
  db.all(`SELECT c.*, g.name, g.avatar_color FROM comments c JOIN guests g ON c.guest_id = g.id ORDER BY c.created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/photos', (req, res) => {
  db.all(`SELECT p.*, g.name, g.avatar_color FROM photos p JOIN guests g ON p.guest_id = g.id ORDER BY p.created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/photos', (req, res) => {
  const { guest_id, photo_url, drive_id } = req.body;
  if (!guest_id || !photo_url) return res.status(400).json({ error: 'Missing data' });

  db.run('INSERT INTO photos (guest_id, photo_url, drive_id) VALUES (?, ?, ?)', [guest_id, photo_url, drive_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.get('/api/poll', (req, res) => {
  db.all(`SELECT po.id, po.name, po.emoji, COUNT(pv.id) as vote_count, GROUP_CONCAT(g.name) as voters 
          FROM poll_options po LEFT JOIN poll_votes pv ON po.id = pv.option_id 
          LEFT JOIN guests g ON pv.guest_id = g.id GROUP BY po.id ORDER BY vote_count DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, voters: r.voters ? r.voters.split(',') : [] })));
  });
});

app.post('/api/poll/vote', (req, res) => {
  const { guest_id, option_id } = req.body;
  if (!guest_id || !option_id) return res.status(400).json({ error: 'Missing data' });

  db.get('SELECT id FROM poll_votes WHERE guest_id = ? AND option_id = ?', [guest_id, option_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row) {
      db.run('DELETE FROM poll_votes WHERE guest_id = ? AND option_id = ?', [guest_id, option_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ action: 'removed' });
      });
    } else {
      db.run('INSERT INTO poll_votes (guest_id, option_id) VALUES (?, ?)', [guest_id, option_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ action: 'added' });
      });
    }
  });
});

app.post('/api/poll/add-option', (req, res) => {
  const { name, emoji, guest_id } = req.body;
  if (!name || !guest_id) return res.status(400).json({ error: 'Missing data' });

  db.get('SELECT id FROM poll_options WHERE LOWER(name) = LOWER(?)', [name], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Už existuje!' });

    db.run('INSERT INTO poll_options (name, emoji) VALUES (?, ?)', [name, emoji || ''], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const optionId = this.lastID;
      db.run('INSERT INTO poll_votes (guest_id, option_id) VALUES (?, ?)', [guest_id, optionId]);
      res.json({ id: optionId, name, emoji });
    });
  });
});

// Backup endpoint
app.get('/api/backup', (req, res) => {
  const backup = { timestamp: new Date().toISOString() };
  const tables = ['guests', 'comments', 'photos', 'poll_options', 'poll_votes'];
  let completed = 0;

  tables.forEach(table => {
    db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
      if (!err) backup[table] = rows;
      completed++;
      
      if (completed === tables.length) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="dekolaudacka-backup-${Date.now()}.json"`);
        res.json(backup);
      }
    });
  });
});

// Restore endpoint
app.post('/api/restore', (req, res) => {
  const backup = req.body;
  if (!backup || !backup.guests) return res.status(400).json({ error: 'Invalid backup' });

  db.serialize(() => {
    db.run('DELETE FROM poll_votes');
    db.run('DELETE FROM comments');
    db.run('DELETE FROM photos');
    db.run('DELETE FROM poll_options');
    db.run('DELETE FROM guests');

    if (backup.guests) {
      backup.guests.forEach(g => {
        db.run('INSERT INTO guests (id, name, attending, avatar_color, created_at) VALUES (?, ?, ?, ?, ?)',
          [g.id, g.name, g.attending, g.avatar_color, g.created_at]);
      });
    }

    if (backup.comments) {
      backup.comments.forEach(c => {
        db.run('INSERT INTO comments (id, guest_id, comment, created_at) VALUES (?, ?, ?, ?)',
          [c.id, c.guest_id, c.comment, c.created_at]);
      });
    }

    if (backup.photos) {
      backup.photos.forEach(p => {
        db.run('INSERT INTO photos (id, guest_id, photo_url, drive_id, created_at) VALUES (?, ?, ?, ?, ?)',
          [p.id, p.guest_id, p.photo_url, p.drive_id, p.created_at]);
      });
    }

    if (backup.poll_options) {
      backup.poll_options.forEach(o => {
        db.run('INSERT INTO poll_options (id, name, emoji, created_at) VALUES (?, ?, ?, ?)',
          [o.id, o.name, o.emoji, o.created_at]);
      });
    }

    if (backup.poll_votes) {
      backup.poll_votes.forEach(v => {
        db.run('INSERT INTO poll_votes (id, guest_id, option_id, created_at) VALUES (?, ?, ?, ?)',
          [v.id, v.guest_id, v.option_id, v.created_at]);
      });
    }

    res.json({ success: true, message: 'Database restored' });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

