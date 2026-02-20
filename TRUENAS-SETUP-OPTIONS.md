# TeamPilot Setup Options auf TrueNAS

Wenn dein initiales Setup fehlschlägt, hast du zwei Optionen:

## Option 1: Image-Pull (schneller, setzt GHCR-Images voraus)

**Befehl:**
```bash
./setup-truenas.sh
```

**Verwendet:** `docker-compose.truenas.yml` mit `image: ghcr.io/...`

**Vorteile:**
- ✅ Schneller Start (kein Bauen nötig)
- ✅ Kleinere Dateien (pre-built Images)

**Nachteile:**
- ❌ Braucht Auth zu GHCR (falls Repo privat ist)
- ❌ Images müssen erst auf GHCR gepusht sein (GitHub Workflow)

**Fehler:** `Failed 'up' action` oder `image not found`
→ Meist bedeutet das, die Images sind noch nicht auf GHCR verfügbar

---

## Option 2: Lokales Build (fallback, funktioniert immer)

**Befehl:**
```bash
./setup-truenas-build.sh
```

**Verwendet:** `docker-compose.build.yml` mit `build: ...`

**Vorteile:**
- ✅ Baut lokal, brauchst kein Internet
- ✅ Funktioniert auch wenn GHCR nicht erreichbar ist
- ✅ Volle Kontrolle über die Quelldateien

**Nachteile:**
- ❌ Dauert beim ersten Mal 5-10 Minuten (Build)
- ❌ Höherer Disk-Speicherplatz

**Problem:** TrueNAS zeigt `Failed 'up' action` → Wahrscheinlich ist Image-Pull fehlgeschlagen

---

## Was ist passiert bei dir?

Der Fehler `Failed 'up' action` deutet hin, dass:

1. **Die Docker Images von GHCR nicht heruntergeladen werden konnten**
   - GHCR-Repo ist privat (braucht Auth)
   - GitHub Workflow hat die Images noch nicht gepusht
   - Netzwerk-Problem

2. **Lösung:** Nutze das **Build-Script statt Image-Pull**

---

## Schnelle Fehler-Diagnose

Auf TrueNAS per SSH:
```bash
# Logs checken
cat /var/log/app_lifecycle.log | tail -100

# Oder direkt Docker-Logs:
docker compose -f docker-compose.truenas.yml logs
```

---

## Empfohlener Workflow

1. **Erste Versuche:** `./setup-truenas-build.sh` (lokal bauen)
2. **Wenn stabil läuft:** Images erzeugen & zu GHCR pushen
3. **Danach:** `./setup-truenas.sh` nutzen (schneller)

---

## Umschalt zwischen Options

Falls du schon mit Option 1 gestartet hast, aber zu Option 2 wechseln willst:

```bash
# Container stoppen
docker compose --env-file .env -f docker-compose.truenas.yml down

# Mit lokaler Build starten
./setup-truenas-build.sh
```

Daten bleiben erhalten (sind in `/mnt/DATA/docker/teampilot/data` gespeichert).
