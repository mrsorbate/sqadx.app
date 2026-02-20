# TeamPilot auf TrueNAS deployen

Dieses Readme erklärt, wie du TeamPilot auf deiner TrueNAS als Docker-Container abläufst.

## Voraussetzungen

- TrueNAS SCALE mit Docker/Virtualisierung aktiviert
- SSH-Zugang zur TrueNAS (optional, für Shell-Setup)
- ≥ 2GB RAM verfügbar
- Ein freier Port (Standard: 18080)

## Schnellstart (empfohlen)

### Option 1: Via Script (automatisches Setup)

```bash
# Auf TrueNAS per SSH oder Shell
cd /mnt/DATA/docker
git clone https://github.com/mrsorbate/TeamPilot-App.git
cd TeamPilot-App

# Setup-Script ausführbar machen
chmod +x setup-truenas.sh

# Ausführen (generiert JWT_SECRET automatisch)
./setup-truenas.sh
```

Das Skript wird:
- Datenverzeichnisse erstellen
- Ein sicheres JWT_SECRET generieren
- `.env` mit allen nötigen Werten füllen
- Docker Container starten

**Ergebnis:** http://TRUENAS-IP:18080

---

### Option 2: Via TrueNAS Web-UI

1. **Verzeichnisse vorbereiten** (als root/SSH):
   ```bash
   mkdir -p /mnt/DATA/docker/teampilot/{data,uploads}
   ```

2. **In TrueNAS-UI:**
   - **Apps → Discover** (oder **Custom Apps** je nach Version)
   - **Compose file einfügen** aus `docker-compose.truenas.yml`
   - **Environment hinzufügen:**
     ```
     JWT_SECRET=<dein-sicheres-secret>
     FRONTEND_URL=http://<TRUENAS-IP>:18080
     BACKEND_DATA_DIR=/mnt/DATA/docker/teampilot/data
     BACKEND_UPLOADS_DIR=/mnt/DATA/docker/teampilot/uploads
     FRONTEND_PORT=18080
     ```
   - **Deploy**

3. **Wart auf Status „Running"** → öffne http://TRUENAS-IP:18080

---

## JWT_SECRET generieren

Wenn du eine Variante ohne Skript nutzt, generiere das Secret manuell:

```bash
openssl rand -base64 32
```

**Beispiel-Output:**
```
xYzAbCdEfGhIjKlMnOpQrStUvWxYz0AbCdEfGhIjKlMnOpQrStUvWxYz==
```

Verwende diesen Wert als `JWT_SECRET` in deiner `.env` oder in den Container-Umgebungsvariablen.

---

## Konfiguration übergeben

Die folgenden Variablen kannst du vor dem Start anpassen:

| Variable | Erklärung | Standard |
|----------|-----------|----------|
| `FRONTEND_PORT` | Host-Port für Web-Zugriff | `18080` |
| `BACKEND_PORT` | Interner Port (Container) | `3000` |
| `JWT_SECRET` | Sicherheitsschlüssel (MUSS gesetzt sein!) | - |
| `DATABASE_PATH` | Pfad zur SQLite DB im Container | `/app/data/database.sqlite` |
| `FRONTEND_URL` | Externe URL (für Links/Redirects) | `http://<IP>:18080` |
| `BACKEND_DATA_DIR` | Host-Pfad für Datenbank | `/mnt/DATA/docker/teampilot/data` |
| `BACKEND_UPLOADS_DIR` | Host-Pfad für Uploads | `/mnt/DATA/docker/teampilot/uploads` |

---

## Daten & Persistenz

Die Daten bleiben persistent auf dem Host unter:
- **/mnt/DATA/docker/teampilot/data** — Datenbank (SQLite)
- **/mnt/DATA/docker/teampilot/uploads** — User-Uploads (Bilder etc.)

Falls du die Container löschst, bleiben die Daten erhalten.

---

## Logs anschauen

```bash
# Alle Logs
docker compose -f docker-compose.truenas.yml logs

# Nur Backend
docker compose -f docker-compose.truenas.yml logs teampilot-backend

# Live-Logs (Follow)
docker compose -f docker-compose.truenas.yml logs -f
```

---

## Container neu starten

```bash
# Neustarten
docker compose -f docker-compose.truenas.yml restart

# Neu bauen & starten (z. B. nach .env-Änderungen)
docker compose -f docker-compose.truenas.yml up -d --pull always
```

---

## Updates

```bash
cd /path/to/TeamPilot-App
git pull
docker compose -f docker-compose.truenas.yml up -d --pull always
```

Die neuen Images werden automatisch heruntergeladen und Container neu gestartet.

---

## Troubleshooting

### Container starten nicht
→ Check: `docker compose -f docker-compose.truenas.yml logs`

### Port bereits belegt?
→ Ändere `FRONTEND_PORT` in `.env` oder in den Container-Umgebungsvariablen

### JWT_SECRET nicht gesetzt?
→ Container startet nicht: Check die Error-Logs

### Datenbank-Fehler?
→ Stelle sicher, dass `/mnt/DATA/docker/teampilot/data` existiert und schreibbar ist (`chmod 755`)

---

## Support

Bei Fragen: [GitHub Issues](https://github.com/mrsorbate/TeamPilot-App/issues)
