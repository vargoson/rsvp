const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./party.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Database connected');
    initDatabase();
  }
});

// Create tables
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
}

// API Routes

// Get all guests
app.get('/api/guests', (req, res) => {
  db.all('SELECT * FROM guests ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add/Update guest RSVP
app.post('/api/rsvp', (req, res) => {
  const { name, attending } = req.body;
  
  if (!name || attending === undefined) {
    return res.status(400).json({ error: 'Name and attending status required' });
  }

  // Random color for avatar
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  // Check if guest already exists
  db.get('SELECT id FROM guests WHERE LOWER(name) = LOWER(?)', [name], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row) {
      // Update existing guest
      db.run('UPDATE guests SET attending = ? WHERE id = ?', [attending, row.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: row.id, name, attending, message: 'RSVP updated' });
      });
    } else {
      // Insert new guest
      db.run('INSERT INTO guests (name, attending, avatar_color) VALUES (?, ?, ?)', 
        [name, attending, avatarColor], 
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ id: this.lastID, name, attending, avatar_color: avatarColor, message: 'RSVP added' });
        }
      );
    }
  });
});

// Get guest by name
app.get('/api/guest/:name', (req, res) => {
  db.get('SELECT * FROM guests WHERE LOWER(name) = LOWER(?)', [req.params.name], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Guest not found' });
      return;
    }
    res.json(row);
  });
});

// Add comment
app.post('/api/comments', (req, res) => {
  const { guest_id, comment } = req.body;
  
  if (!guest_id || !comment) {
    return res.status(400).json({ error: 'Guest ID and comment required' });
  }

  db.run('INSERT INTO comments (guest_id, comment) VALUES (?, ?)', 
    [guest_id, comment], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, guest_id, comment, message: 'Comment added' });
    }
  );
});

// Get all comments with guest names
app.get('/api/comments', (req, res) => {
  const query = `
    SELECT c.*, g.name, g.avatar_color 
    FROM comments c 
    JOIN guests g ON c.guest_id = g.id 
    ORDER BY c.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get photos with guest info
app.get('/api/photos', (req, res) => {
  const query = `
    SELECT p.*, g.name, g.avatar_color 
    FROM photos p 
    JOIN guests g ON p.guest_id = g.id 
    ORDER BY p.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add photo URL (for Google Drive links)
app.post('/api/photos', (req, res) => {
  const { guest_id, photo_url, drive_id } = req.body;
  
  if (!guest_id || !photo_url) {
    return res.status(400).json({ error: 'Guest ID and photo URL required' });
  }

  db.run('INSERT INTO photos (guest_id, photo_url, drive_id) VALUES (?, ?, ?)', 
    [guest_id, photo_url, drive_id], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, guest_id, photo_url, message: 'Photo added' });
    }
  );
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});

