const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./party.db');

const backup = {
  timestamp: new Date().toISOString(),
  guests: [],
  comments: [],
  photos: [],
  poll_options: [],
  poll_votes: []
};

const queries = [
  { table: 'guests', key: 'guests' },
  { table: 'comments', key: 'comments' },
  { table: 'photos', key: 'photos' },
  { table: 'poll_options', key: 'poll_options' },
  { table: 'poll_votes', key: 'poll_votes' }
];

let completed = 0;

queries.forEach(({ table, key }) => {
  db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
    if (err) {
      console.error(`Error backing up ${table}:`, err);
    } else {
      backup[key] = rows;
      console.log(`✓ Backed up ${rows.length} rows from ${table}`);
    }
    
    completed++;
    if (completed === queries.length) {
      const filename = `backup-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
      console.log(`\n✅ Backup saved to ${filename}`);
      db.close();
    }
  });
});

