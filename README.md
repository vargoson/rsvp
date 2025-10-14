# Dekolaudačka Party Microsite 🎉

Moderný web pre dekolaudačnú párty s RSVP systémom, guest listom, komentármi a fotkami.

## Funkcie

- ✅ **RSVP systém** - Hostia môžu potvrdiť alebo odmietnuť účasť
- 🎈 **Bublinky pre hostí** - Vizuálny prehľad kto príde
- 💬 **Komentáre** - Možnosť písať správy pod vlastným menom
- 📸 **Fotogaléria** - Pridávanie fotiek cez Google Drive linky
- 📱 **Responzívny dizajn** - Funguje na mobil aj desktop
- 🎨 **Pekný moderný vzhľad** - S animáciami a gradientmi

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

## Ako používať

### Pre hostí:

1. **RSVP** - Zadaj svoje meno a klikni či prídeš alebo nie
2. **Komentáre** - Po prihlásení môžeš písať správy
3. **Fotky** - Nahraj fotku na Google Drive a vlož link

### Google Drive fotky:

1. Nahraj fotku na Google Drive
2. Klikni pravým na fotku → Zdieľať
3. Nastav "Ktokoľvek s linkom môže prezerať"
4. Skopíruj link a vlož ho na stránku

## Deployment

### Rýchle nasadenie (Render.com, Railway, atď):

1. Vytvor účet na [Render.com](https://render.com) alebo [Railway.app](https://railway.app)
2. Pripoj tento repozitár
3. Nastav build command: `npm install`
4. Nastav start command: `npm start`
5. Deploy! 🚀

### Lokálne v sieti:

```bash
npm start
```
Potom zdieľaj URL s tvojou lokálnou IP adresou (napr. `http://192.168.1.100:3000`)

## Technológie

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: Node.js + Express
- **Databáza**: SQLite
- **Storage**: Google Drive (cez linky)

## Štruktúra

```
dekolaudacka/
├── public/
│   ├── index.html      # Hlavná stránka
│   ├── styles.css      # Štýly
│   └── app.js          # Frontend JavaScript
├── server.js           # Backend server
├── package.json        # Závislosti
└── party.db           # SQLite databáza (vytvorí sa automaticky)
```

## Prispôsobenie

Môžeš si upraviť:
- Farby v `styles.css` (CSS premenné v `:root`)
- Názov párty v `index.html`
- Port servera v `server.js` (štandardne 3000)

## Licencia

MIT - Rob si s tým čo chceš! 😊

---

Made with ❤️ for the best party ever!

