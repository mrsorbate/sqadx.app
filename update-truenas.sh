#!/bin/bash

# kadr Update Script für TrueNAS
# Aktualisiert den Code, baut neue Docker Images und startet die Container neu

set -e

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔄 kadr - Update${NC}\n"

# Fehler-Handler
error_exit() {
    echo -e "${RED}❌ Fehler: $1${NC}" >&2
    exit 1
}

# Überprüfe, ob wir im korrekten Verzeichnis sind
if [ ! -f "docker-compose.build.yml" ]; then
    error_exit "Nicht im kadr-Verzeichnis. Bitte ausführen im ./kadr-app Ordner"
fi

# Backup erstellen (optional aber empfohlen)
echo -e "${BLUE}💾 Erstelle Backup der .env...${NC}"
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Backup erstellt${NC}\n"
else
    echo -e "${YELLOW}⚠️  Keine .env zum Backup${NC}\n"
fi

# Git-Pull
echo -e "${BLUE}📥 Hole neue Code-Version...${NC}"
if ! git pull; then
    error_exit "Git Pull fehlgeschlagen. Überprüfe deine Internet-Verbindung oder lokale Änderungen."
fi
echo -e "${GREEN}✓ Code aktualisiert${NC}\n"

# Docker Compose - Bau & Restart
echo -e "${BLUE}🐳 Baue und starten neue Container...${NC}"
if [ -f ".env" ]; then
    if ! docker compose --env-file .env -f docker-compose.build.yml up -d --build; then
        error_exit "Docker Compose fehlgeschlagen. Check: docker compose --env-file .env -f docker-compose.build.yml logs"
    fi
else
    error_exit ".env-Datei nicht gefunden. Bitte erst Setup ausführen: ./setup-truenas-build.sh"
fi

echo -e "\n${GREEN}✅ Update erfolgreich!${NC}\n"

# Status anzeigen
echo -e "${BLUE}Container Status:${NC}"
docker compose --env-file .env -f docker-compose.build.yml ps

echo -e "\n${YELLOW}Tipps:${NC}"
echo "Logs anschauen:"
echo "  docker compose --env-file .env -f docker-compose.build.yml logs -f"
echo ""
echo "Bei Problemen: .env.backup.*-Datei zurück copy:"
echo "  cp .env.backup.* .env"
echo "  docker compose --env-file .env -f docker-compose.build.yml down"
echo "  ./setup-truenas-build.sh"
echo ""
