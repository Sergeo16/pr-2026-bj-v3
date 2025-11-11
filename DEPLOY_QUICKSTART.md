# 🚀 Guide Rapide de Déploiement

## 📤 Push sur GitHub

```bash
# Vérifier les changements
git status

# Ajouter tous les fichiers modifiés
git add .

# Créer un commit
git commit -m "Ajout configuration Railway et scripts de déploiement"

# Pousser sur GitHub
git push origin main
```

## 🚂 Déploiement sur Railway

### 1. Créer un compte et projet Railway

1. Allez sur [railway.app](https://railway.app) et créez un compte
2. Cliquez sur **"New Project"** → **"Deploy from GitHub repo"**
3. Sélectionnez votre dépôt `pr-2026-bj`

### 2. Ajouter PostgreSQL

1. Dans le projet, cliquez sur **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway créera automatiquement une base de données

### 3. Configurer les Variables d'Environnement

Dans votre service web, ajoutez ces variables dans **"Variables"** :

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
NEXT_PUBLIC_APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
NODE_ENV=production
PORT=3000
```

**Important :** Remplacez `Postgres` par le nom exact de votre service PostgreSQL si différent.

### 4. Exécuter les Migrations

Une fois l'application déployée, exécutez les migrations :

**Option A : Via Railway CLI**
```bash
# Installer Railway CLI
# Windows PowerShell:
iwr https://railway.app/install.sh | iex

# macOS/Linux:
curl -fsSL https://railway.app/install.sh | sh

# Se connecter
railway login

# Lier le projet
railway link

# Exécuter les migrations
railway run npm run migrate

# Exécuter le seed
railway run npm run seed
```

**Option B : Via le Dashboard Railway**
1. Allez dans votre service web → **"Deployments"**
2. Cliquez sur **"View Logs"** → **"Run Command"**
3. Exécutez : `npm run migrate` puis `npm run seed`

### 5. Configurer le Domaine

1. Dans votre service web → **"Settings"**
2. Cliquez sur **"Generate Domain"** pour obtenir un domaine Railway gratuit
3. Ou configurez un domaine personnalisé

## ✅ Vérification

Une fois déployé, vérifiez que :
- ✅ L'application démarre sans erreur
- ✅ Les migrations sont exécutées
- ✅ Le seed est exécuté
- ✅ L'application est accessible via l'URL Railway
- ✅ Le formulaire de vote fonctionne
- ✅ Le dashboard fonctionne

## 📚 Documentation Complète

Pour plus de détails, consultez [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

