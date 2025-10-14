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

  // Insert default poll options if none exist
  db.get('SELECT COUNT(*) as count FROM poll_options', [], (err, row) => {
    if (!err && row.count === 0) {
      const defaultOptions = [
        { name: 'Pizza', emoji: '🍕' },
        { name: 'Burger & hranolky', emoji: '🍔' },
        { name: 'Sushi', emoji: '🍱' },
        { name: 'Tacos', emoji: '🌮' },
        { name: 'Pasta', emoji: '🍝' },
        { name: 'Grilované mäso', emoji: '🥩' },
        { name: 'Vegetariánske jedlo', emoji: '🥗' },
        { name: 'Finger food (chipsiky, atď)', emoji: '🍟' }
      ];

      const stmt = db.prepare('INSERT INTO poll_options (name, emoji) VALUES (?, ?)');
      defaultOptions.forEach(option => {
        stmt.run(option.name, option.emoji);
      });
      stmt.finalize();
    }
  });
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

// Get poll results
app.get('/api/poll', (req, res) => {
  const query = `
    SELECT 
      po.id,
      po.name,
      po.emoji,
      COUNT(pv.id) as vote_count,
      GROUP_CONCAT(g.name) as voters
    FROM poll_options po
    LEFT JOIN poll_votes pv ON po.id = pv.option_id
    LEFT JOIN guests g ON pv.guest_id = g.id
    GROUP BY po.id
    ORDER BY vote_count DESC, po.name ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Convert voters string to array
    const results = rows.map(row => ({
      ...row,
      voters: row.voters ? row.voters.split(',') : []
    }));
    res.json(results);
  });
});

// Vote on poll (toggle vote)
app.post('/api/poll/vote', (req, res) => {
  const { guest_id, option_id } = req.body;
  
  if (!guest_id || !option_id) {
    return res.status(400).json({ error: 'Guest ID and option ID required' });
  }

  // Check if vote already exists
  db.get('SELECT id FROM poll_votes WHERE guest_id = ? AND option_id = ?', 
    [guest_id, option_id], 
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (row) {
        // Remove vote (toggle off)
        db.run('DELETE FROM poll_votes WHERE guest_id = ? AND option_id = ?', 
          [guest_id, option_id], 
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ message: 'Vote removed', action: 'removed' });
          }
        );
      } else {
        // Add vote
        db.run('INSERT INTO poll_votes (guest_id, option_id) VALUES (?, ?)', 
          [guest_id, option_id], 
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ id: this.lastID, message: 'Vote added', action: 'added' });
          }
        );
      }
    }
  );
});

// Add custom poll option
app.post('/api/poll/add-option', (req, res) => {
  const { name, emoji, guest_id } = req.body;
  
  if (!name || !guest_id) {
    return res.status(400).json({ error: 'Name and guest ID required' });
  }

  // Check if option already exists
  db.get('SELECT id FROM poll_options WHERE LOWER(name) = LOWER(?)', [name], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row) {
      res.status(400).json({ error: 'Táto možnosť už existuje!' });
      return;
    }

    // Insert new option
    db.run('INSERT INTO poll_options (name, emoji) VALUES (?, ?)', 
      [name, emoji || ''], 
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Automatically vote for the new option
        const optionId = this.lastID;
        db.run('INSERT INTO poll_votes (guest_id, option_id) VALUES (?, ?)', 
          [guest_id, optionId],
          function(voteErr) {
            if (voteErr) {
              console.error('Error auto-voting:', voteErr);
            }
          }
        );
        
        res.json({ 
          id: optionId, 
          name, 
          emoji, 
          message: 'Option added successfully' 
        });
      }
    );
  });
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

