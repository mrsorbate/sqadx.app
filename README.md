# kadr - Moderne Team-Management Software

Eine benutzerfreundliche Team-Management-App für Sportvereine mit Fokus auf Terminverwaltung, Zu-/Absagen und Kaderverwaltung.

## Features

- ✅ **Terminverwaltung**: Trainings und Spiele einfach organisieren
- ✅ **Zu-/Absagen System**: Schnelle Rückmeldungen von Spielern
- ✅ **Kaderverwaltung**: Spieler und Trainer verwalten
- ✅ **Statistiken**: Anwesenheitsquoten
- 📱 **Progressive Web App**: Auf allen Geräten nutzbar
- 🔒 **Sicher**: Moderne Authentifizierung und Datenschutz

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (Build Tool)
- Tailwind CSS (Styling)
- React Router (Navigation)
- React Query (Data Fetching)
- PWA Support

### Backend
- Node.js + Express + TypeScript
- SQLite / PostgreSQL
- JWT Authentication
- REST API

## Projekt-Struktur

```
.
├── frontend/          # React Frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # Node.js Backend
│   ├── src/
│   └── package.json
└── README.md
```

## Installation

### 🔥 TrueNAS Deployment (empfohlen für Produktion)

Complete setup mit automatischem JWT_SECRET, Backup und Updates:

```bash
# SSH zu deiner TrueNAS
ssh root@<TRUENAS-IP>

# Repository klonen
cd /mnt/DATA/docker
git clone https://github.com/mrsorbate/kadr-app.git
cd kadr-app

# Initial Setup (5-10 Min)
chmod +x setup-truenas-build.sh
./setup-truenas-build.sh

# Zugriff: http://<TRUENAS-IP>:18080
```

**Updates einspielen:**
```bash
chmod +x update-truenas.sh
./update-truenas.sh
```

📖 **Vollständiger Guide:** [TRUENAS-SETUP.md](TRUENAS-SETUP.md)

---

### Backend (lokal entwickeln)
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Entwicklung

Die App läuft standardmäßig auf:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Docker

Die App kann komplett per Docker gestartet werden (Frontend + Backend).

### Umgebungsvariablen
```bash
cp .env.example .env
```

Danach ggf. `JWT_SECRET`, `FRONTEND_PORT` und `BACKEND_PORT` in `.env` anpassen.

### Starten
```bash
docker compose up --build
```

Danach läuft die App auf:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000

### Stoppen
```bash
docker compose down
```

### Mit Daten-Reset
```bash
docker compose down -v
```

Es werden zwei persistente Volumes verwendet:
- `backend_data` für SQLite-Datenbank
- `backend_uploads` für hochgeladene Bilder

## Lizenz

MIT
