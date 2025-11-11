# 🚂 Guide de Déploiement sur Railway

Ce guide vous explique comment déployer l'application PR 2026 sur Railway.

## 📋 Prérequis

1. Un compte GitHub avec le dépôt du projet
2. Un compte Railway (gratuit disponible sur [railway.app](https://railway.app))
3. Le projet doit être pushé sur GitHub

## 🚀 Étapes de Déploiement

### Étape 1 : Créer un projet sur Railway

1. Connectez-vous à [Railway](https://railway.app)
2. Cliquez sur **"New Project"**
3. Sélectionnez **"Deploy from GitHub repo"**
4. Autorisez Railway à accéder à votre compte GitHub si nécessaire
5. Sélectionnez le dépôt `pr-2026-bj`

### Étape 2 : Ajouter une base de données PostgreSQL

1. Dans votre projet Railway, cliquez sur **"+ New"**
2. Sélectionnez **"Database"** → **"Add PostgreSQL"**
3. Railway créera automatiquement une base de données PostgreSQL
4. Notez les informations de connexion (elles seront disponibles dans les variables d'environnement)

### Étape 3 : Configurer les Variables d'Environnement

Dans votre service web (l'application Next.js), ajoutez les variables d'environnement suivantes :

1. Allez dans votre service web → **"Variables"**
2. Ajoutez les variables suivantes :

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NEXT_PUBLIC_APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
NODE_ENV=production
PORT=3000
```

**Note importante :**
- `DATABASE_URL` : Railway génère automatiquement cette variable depuis le service PostgreSQL. Utilisez la référence `${{Postgres.DATABASE_URL}}` où `Postgres` est le nom de votre service PostgreSQL.
- `NEXT_PUBLIC_APP_URL` : Utilisez `${{RAILWAY_PUBLIC_DOMAIN}}` pour obtenir automatiquement l'URL publique de votre application.

### Étape 4 : Configurer le Service Web

1. Railway détectera automatiquement le Dockerfile
2. Le build se lancera automatiquement
3. Une fois le build terminé, Railway démarrera l'application

### Étape 5 : Exécuter les Migrations et le Seed

Après le premier déploiement, vous devez exécuter les migrations et le seed :

#### Option 1 : Via Railway CLI (Recommandé)

1. Installez Railway CLI :
```bash
# Windows (PowerShell)
iwr https://railway.app/install.sh | iex

# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh
```

2. Connectez-vous :
```bash
railway login
```

3. Liez votre projet :
```bash
railway link
```

4. Exécutez les migrations :
```bash
railway run npm run migrate
```

5. Exécutez le seed :
```bash
railway run npm run seed
```

#### Option 2 : Via Railway Dashboard

1. Allez dans votre service web
2. Cliquez sur **"Deployments"** → **"View Logs"**
3. Cliquez sur **"Run Command"** ou utilisez le terminal intégré
4. Exécutez :
```bash
npm run migrate
npm run seed
```

### Étape 6 : Configurer le Domaine Public

1. Dans votre service web, allez dans **"Settings"**
2. Cliquez sur **"Generate Domain"** pour obtenir un domaine Railway gratuit
3. Ou configurez un domaine personnalisé dans **"Custom Domain"**

## 🔧 Configuration Avancée

### Script de Démarrage avec Migrations Automatiques

Si vous voulez que les migrations s'exécutent automatiquement au démarrage, vous pouvez créer un script de démarrage :

1. Créez un fichier `scripts/start-railway.js` :
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');

async function main() {
  try {
    console.log('🔄 Exécution des migrations...');
    execSync('npm run migrate', { stdio: 'inherit' });
    console.log('✅ Migrations terminées');
    
    console.log('🚀 Démarrage de l\'application...');
    execSync('node server.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
```

2. Modifiez le `railway.json` pour utiliser ce script :
```json
{
  "deploy": {
    "startCommand": "node scripts/start-railway.js"
  }
}
```

**⚠️ Note :** Cette approche peut ralentir le démarrage. Il est recommandé d'exécuter les migrations manuellement la première fois, puis seulement lors des mises à jour de schéma.

### Monitoring et Logs

- **Logs** : Accessibles via le dashboard Railway dans la section "Deployments"
- **Métriques** : Railway fournit des métriques de base (CPU, RAM, réseau)
- **Alertes** : Configurez des alertes dans les paramètres du projet

## 🐛 Dépannage

### L'application ne démarre pas

1. Vérifiez les logs dans Railway Dashboard
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez que `DATABASE_URL` pointe vers le bon service PostgreSQL

### Erreur de connexion à la base de données

1. Vérifiez que le service PostgreSQL est démarré
2. Vérifiez que `DATABASE_URL` utilise la référence correcte : `${{Postgres.DATABASE_URL}}`
3. Vérifiez que les migrations ont été exécutées

### Build échoue

1. Vérifiez les logs de build dans Railway
2. Vérifiez que le Dockerfile est correct
3. Vérifiez que toutes les dépendances sont dans `package.json`

## 📊 Coûts

Railway offre :
- **Plan gratuit** : $5 de crédit gratuit par mois
- **Plan Hobby** : $20/mois pour plus de ressources
- **Plan Pro** : À partir de $20/mois avec plus de fonctionnalités

Pour une application de vote comme celle-ci, le plan gratuit devrait suffire pour commencer.

## 🔄 Mises à Jour

Pour mettre à jour l'application :

1. Poussez vos changements sur GitHub :
```bash
git add .
git commit -m "Mise à jour de l'application"
git push origin main
```

2. Railway détectera automatiquement les changements et redéploiera
3. Si vous avez modifié le schéma de base de données, exécutez les migrations :
```bash
railway run npm run migrate
```

## 📚 Ressources

- [Documentation Railway](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Exemples Railway](https://github.com/railwayapp/examples)

## ✅ Checklist de Déploiement

- [ ] Projet créé sur Railway
- [ ] Service PostgreSQL ajouté
- [ ] Variables d'environnement configurées
- [ ] Application déployée avec succès
- [ ] Migrations exécutées
- [ ] Seed exécuté
- [ ] Domaine public configuré
- [ ] Application accessible et fonctionnelle

---

**Bon déploiement ! 🚀**

