# Dekolaudačka Party Microsite 🎉

Moderný web pre dekolaudačnú párty s RSVP systémom, guest listom, komentármi a fotkami.

## Funkcie

- ✅ **RSVP systém** - Hostia môžu potvrdiť alebo odmietnuť účasť
- 🎈 **Bublinky pre hostí** - Vizuálny prehľad kto príde
- 💬 **Komentáre** - Možnosť písať správy pod vlastným menom
- 📸 **Fotogaléria** - Pridávanie fotiek cez Google Drive linky
- 📅 **Add to Calendar** - Automatické pridanie do kalendára
- 🍕 **Poll na jedlo** - Hlasovanie čo dáme na jedlo
- 📱 **Responzívny dizajn** - Funguje na mobil aj desktop

## Inštalácia

1. Nainštaluj Node.js (ak ho ešte nemáš)

2. Nainštaluj závislosti:
```bash
npm install
```

3. Spusti server:
```bash
npm start
```

4. Otvor v prehliadači:
```
http://localhost:3000
```

## Príkazy

```bash
npm start          # Spustí server
npm run dev        # Development mode s auto-restart
npm run backup     # Zálohuje databázu do JSON
npm run restore    # Obnoví databázu z JSON
npm run reset      # Vymaže všetky dáta
```

## 💾 Zálohovanie databázy

### Pred deploymentom (dôležité!):
```bash
npm run backup
```
Vytvorí súbor `backup-TIMESTAMP.json` so všetkými dátami.

### Po redeploy (obnovenie):
```bash
npm run restore backup-1234567890.json
```

### ⚠️ Dôležité pre production:

**Free tier platformy (Render, Railway, Fly.io):**
- SQLite databáza sa **vymaže pri každom redeploy**!
- **Vždy backupni** pred pushom do main

**Riešenia:**
1. **Backup/Restore** - pred každým deployom urob backup
2. **Persistent Disk** - Render/Railway ponúkajú (platené ~$5/mes)
3. **PostgreSQL** - prepni na Postgres (Render má free tier s persistent storage)

## 🚀 Deployment

### Render.com (odporúčam):
1. Vytvor účet na render.com
2. New → Web Service
3. Pripoj GitHub repo
4. Settings:
   - Build: `npm install`
   - Start: `npm start`
5. Deploy!

**Persistent databáza na Render:**
- Add Persistent Disk (platené)
- Alebo: Add PostgreSQL database (free tier má persistent storage)

### Railway.app:
1. railway.app → New Project
2. Deploy from GitHub
3. Automaticky detekuje Node.js
4. Deploy!

## 📸 Google Drive fotky

1. Nahraj fotku na Google Drive
2. Pravé tlačidlo → Zdieľať
3. Nastav: "Ktokoľvek s linkom môže prezerať"
4. Skopíruj a vlož link na stránke

## 🛠️ Technológie

- **Frontend**: Vanilla JS, HTML, CSS
- **Backend**: Node.js + Express
- **Databáza**: SQLite (alebo PostgreSQL na production)

## 📁 Štruktúra

```
dekolaudacka/
├── public/
│   ├── index.html      # Hlavná stránka
│   ├── styles.css      # Štýly
│   └── app.js          # Frontend JS
├── server.js           # Backend
├── backup-db.js        # Backup script
├── restore-db.js       # Restore script
├── package.json        # Závislosti
└── party.db           # SQLite databáza
```

## 🔧 Prispôsobenie

### Zmena času párty:
V `public/app.js` (riadky ~373, ~374):
```javascript
dates: '20251024T190000/20251024T230000'  // YYYYMMDDTHHmmss
```

### Zmena adresy:
V `public/index.html` (riadky ~31-39)

### Zmena kontaktov:
V `public/index.html` (riadky ~89-102)

## 📝 Licencia

MIT - Rob si s tým čo chceš! 😊

---

Made with ❤️ for the best party ever!

