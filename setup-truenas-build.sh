#!/bin/bash

# kadr Docker Setup für TrueNAS (lokales Build)
# Dieses Skript bereitet die Umgebung vor und startet die Container mit lokalem Build

set -e

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 kadr - TrueNAS Setup (Build Mode)${NC}\n"

# Konfiguration
BASE_PATH="${BASE_PATH:-/mnt/DATA/docker/kadr}"
FRONTEND_PORT="${FRONTEND_PORT:-18080}"
TRUENAS_IP="${TRUENAS_IP:-localhost}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.build.yml}"

# Fehler-Handler
error_exit() {
    echo -e "${RED}❌ Fehler: $1${NC}" >&2
    exit 1
}

# Verzeichnisse erstellen
echo -e "${BLUE}📁 Erstelle Datenverzeichnisse...${NC}"
mkdir -p "${BASE_PATH}/data" || error_exit "Kann nicht in ${BASE_PATH} schreiben"
mkdir -p "${BASE_PATH}/uploads" || error_exit "Kann nicht in ${BASE_PATH} schreiben"
echo -e "${GREEN}✓ Verzeichnisse erstellt${NC}\n"

# JWT_SECRET generieren, falls noch nicht vorhanden
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env existiert bereits, überspringe Secret-Generierung${NC}"
    echo -e "   Aktuelle Settings:"
    grep -E 'JWT_SECRET|FRONTEND_URL' "$ENV_FILE" || true
else
    echo -e "${BLUE}🔐 Generiere JWT_SECRET...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > "$ENV_FILE" << EOF
# kadr - Docker Compose Environment
# Generiert am: $(date)

BACKEND_PORT=3000
FRONTEND_PORT=${FRONTEND_PORT}
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
DATABASE_PATH=/app/data/database.sqlite
FRONTEND_URL=http://${TRUENAS_IP}:${FRONTEND_PORT}
TZ=Europe/Berlin

# Host Pfade
BACKEND_DATA_DIR=${BASE_PATH}/data
BACKEND_UPLOADS_DIR=${BASE_PATH}/uploads
EOF
    
    echo -e "${GREEN}✓ JWT_SECRET generiert und in .env gespeichert${NC}\n"
fi

# Docker Compose starten (mit lokalem Build)
echo -e "${BLUE}🐳 Baue und starte Docker Container...${NC}"
echo -e "${YELLOW}(Dies kann beim ersten Mal 5-10 Minuten dauern...)${NC}\n"

if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build; then
    error_exit "Docker Compose ist fehlgeschlagen. Check Logs mit: docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs"
fi

# Warte kurz, damit Container starten können
sleep 3

echo -e "\n${GREEN}✅ Setup erfolgreich!${NC}\n"
echo -e "${YELLOW}📍 kadr erreichbar unter:${NC}"
echo -e "   ${GREEN}http://${TRUENAS_IP}:${FRONTEND_PORT}${NC}\n"

# Status anzeigen
echo -e "${BLUE}Container Status:${NC}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo -e "\n${YELLOW}Befehle zum Debugging:${NC}"
echo "Logs anzeigen:"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs -f"
echo ""
echo "Container neustarten:"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE restart"
echo ""
echo "Container stoppen:"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE down"
echo ""
