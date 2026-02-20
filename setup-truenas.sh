#!/bin/bash

# TeamPilot Docker Setup für TrueNAS
# Dieses Skript bereitet die Umgebung vor und startet die Container

set -e

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 TeamPilot - TrueNAS Setup${NC}\n"

# Konfiguration
BASE_PATH="${BASE_PATH:-/mnt/DATA/docker/teampilot}"
FRONTEND_PORT="${FRONTEND_PORT:-18080}"
TRUENAS_IP="${TRUENAS_IP:-localhost}"

# Verzeichnisse erstellen
echo -e "${BLUE}📁 Erstelle Datenverzeichnisse...${NC}"
mkdir -p "${BASE_PATH}/data"
mkdir -p "${BASE_PATH}/uploads"
echo -e "${GREEN}✓ Verzeichnisse erstellt${NC}\n"

# JWT_SECRET generieren, falls noch nicht vorhanden
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env existiert bereits, überspringe Secret-Generierung${NC}"
else
    echo -e "${BLUE}🔐 Generiere JWT_SECRET...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > "$ENV_FILE" << EOF
# TeamPilot - Docker Compose Environment
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

# Docker Compose starten
echo -e "${BLUE}🐳 Starte Docker Container...${NC}"
docker compose -f docker-compose.truenas.yml up -d --pull always

echo -e "\n${GREEN}✅ Setup erfolgreich!${NC}\n"
echo -e "${YELLOW}📍 TeamPilot erreichbar unter:${NC}"
echo -e "   ${GREEN}http://${TRUENAS_IP}:${FRONTEND_PORT}${NC}\n"

# Status anzeigen
echo -e "${BLUE}Container Status:${NC}"
docker compose -f docker-compose.truenas.yml ps

echo -e "\n${YELLOW}Logs anzeigen:${NC}"
echo "docker compose -f docker-compose.truenas.yml logs -f\n"
