# APIWatch — API Monitoring & Incident Management Platform

Projet de stage — Plateforme de surveillance d'APIs avec gestion automatique des incidents.

## Stack technique

- **Framework** : Next.js 16 (App Router, JavaScript)
- **Base de données** : PostgreSQL 17 (via Prisma ORM v6)
- **Auth** : `bcryptjs` + `jose` (JWT signé, cookie HTTP-Only)
- **State Management** : TanStack React Query
- **Styles** : Tailwind CSS
- **Graphiques** : Recharts

## Fonctionnalités implémentées

| Étape | Fonctionnalité | Statut |
|-------|---------------|--------|
| 1-2 | Initialisation du projet, PostgreSQL + Prisma | ✅ |
| 3 | Authentification (Register / Login / Logout / Session) | ✅ |
| 4 | Gestion des API Endpoints (CRUD) | ✅ |
| 5 | Health Checks manuels + Historique | ✅ |
| 6 | Monitoring automatique (Scheduler côté serveur) | ✅ |
| 7 | Incident Management (Création / Résolution automatique) | ✅ |
| 8 | Uptime & Analytics (en cours) | 🔄 |

## Installation et démarrage

### Prérequis
- Node.js 18+
- PostgreSQL 17

### Configuration

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/amalbenbihi01/apiwatch.git
   cd apiwatch
   ```

2. Installer les dépendances :
   ```bash
   npm install
   ```

3. Configurer les variables d'environnement :
   ```bash
   cp .env.example .env
   # Remplir les valeurs dans .env
   ```

4. Créer la base de données PostgreSQL :
   ```sql
   CREATE DATABASE apiwatch;
   ```

5. Appliquer les migrations Prisma :
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

6. Démarrer le serveur de développement :
   ```bash
   npm run dev
   ```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

## Architecture

```
Next.js Monolithe Full Stack
│
├── app/                    # Pages & Route Handlers (App Router)
│   ├── api/                # API Routes
│   │   ├── auth/           # Register, Login, Logout, Me
│   │   ├── endpoints/      # CRUD Endpoints, Checks, Incidents, Analytics
│   │   ├── incidents/      # Liste des incidents
│   │   └── cron/           # Route monitoring automatique (CRON_SECRET)
│   ├── dashboard/          # Pages Dashboard protégées
│   ├── login/
│   └── register/
│
├── components/
│   └── api-monitoring/     # ApiCard, ApiForm, ApiList, HealthCheckStatus, IncidentsList
│
├── hooks/                  # React Query hooks (use-apis, use-monitoring, use-incidents)
├── lib/                    # auth.js, prisma.js, scheduler.js
├── services/               # Service Layer (auth, api, monitoring, incident)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── middleware.js            # Protection des routes /dashboard
├── instrumentation.js       # Démarrage automatique du scheduler
└── .env.example
```

## Sécurité

- Sessions HTTP-Only (cookie `apiwatch_session`)
- JWT signé avec `jose` (HS256)
- Isolation stricte par `userId` sur toutes les requêtes
- Route Cron protégée par `CRON_SECRET` (Bearer token)
- `.env` exclu de Git

## Monitoring automatique

Le scheduler se lance automatiquement au démarrage du serveur via `instrumentation.js`.
Pour déclencher un cycle manuellement :

```bash
curl -X POST http://localhost:3000/api/cron/monitoring \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"
```
