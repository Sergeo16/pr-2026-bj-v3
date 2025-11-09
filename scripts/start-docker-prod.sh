#!/bin/bash

# Script pour démarrer l'application avec Docker Compose (Production)
# Usage: ./scripts/start-docker-prod.sh

set -e

echo "🚀 Démarrage de l'application avec Docker Compose (Production)..."
echo ""

# Vérifier que Docker est démarré
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas démarré. Veuillez démarrer Docker Desktop."
    exit 1
fi

echo "✓ Docker est démarré"
echo ""

# Démarrer les services
echo "📦 Démarrage des services..."
docker-compose up -d

echo ""
echo "⏳ Attente que les services soient prêts..."
sleep 5

# Vérifier l'état des services
echo ""
echo "📊 État des services:"
docker-compose ps

echo ""
echo "✅ Application démarrée!"
echo ""
echo "🌐 Accès à l'application:"
echo "   - Local:    http://localhost:3000"
echo ""
echo "💡 Pour voir les logs: docker-compose logs -f web"
echo "💡 Pour arrêter: docker-compose down"

