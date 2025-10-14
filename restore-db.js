const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const backupFile = process.argv[2];

if (!backupFile) {
  console.error('Usage: node restore-db.js <backup-file.json>');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`Backup file ${backupFile} not found!`);
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
const db = new sqlite3.Database('./party.db');

console.log(`Restoring backup from ${backup.timestamp}...\n`);

// Clear existing data
const tables = ['poll_votes', 'comments', 'photos', 'poll_options', 'guests'];
tables.forEach(table => {
  db.run(`DELETE FROM ${table}`);
});

let completed = 0;
const total = Object.keys(backup).filter(k => k !== 'timestamp').length;

// Restore guests
if (backup.guests) {
  backup.guests.forEach(g => {
    db.run('INSERT INTO guests (id, name, attending, avatar_color, created_at) VALUES (?, ?, ?, ?, ?)',
      [g.id, g.name, g.attending, g.avatar_color, g.created_at]);
  });
  console.log(`✓ Restored ${backup.guests.length} guests`);
  completed++;
}

// Restore comments
if (backup.comments) {
  backup.comments.forEach(c => {
    db.run('INSERT INTO comments (id, guest_id, comment, created_at) VALUES (?, ?, ?, ?)',
      [c.id, c.guest_id, c.comment, c.created_at]);
  });
  console.log(`✓ Restored ${backup.comments.length} comments`);
  completed++;
}

// Restore photos
if (backup.photos) {
  backup.photos.forEach(p => {
    db.run('INSERT INTO photos (id, guest_id, photo_url, drive_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [p.id, p.guest_id, p.photo_url, p.drive_id, p.created_at]);
  });
  console.log(`✓ Restored ${backup.photos.length} photos`);
  completed++;
}

// Restore poll options
if (backup.poll_options) {
  backup.poll_options.forEach(o => {
    db.run('INSERT INTO poll_options (id, name, emoji, created_at) VALUES (?, ?, ?, ?)',
      [o.id, o.name, o.emoji, o.created_at]);
  });
  console.log(`✓ Restored ${backup.poll_options.length} poll options`);
  completed++;
}

// Restore poll votes
if (backup.poll_votes) {
  backup.poll_votes.forEach(v => {
    db.run('INSERT INTO poll_votes (id, guest_id, option_id, created_at) VALUES (?, ?, ?, ?)',
      [v.id, v.guest_id, v.option_id, v.created_at]);
  });
  console.log(`✓ Restored ${backup.poll_votes.length} poll votes`);
  completed++;
}

setTimeout(() => {
  console.log('\n✅ Database restored successfully!');
  db.close();
}, 1000);

