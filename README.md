# APIWatch — API Monitoring & Incident Management Platform

Projet de stage — Plateforme Full Stack de surveillance d'APIs, gestion automatique des incidents, analytics de performance et système d'alerting par email.

## Stack technique

- **Framework** : Next.js 16 (App Router, JavaScript)
- **Base de données** : PostgreSQL 17 (via Prisma ORM v6)
- **Auth** : `bcryptjs` + `jose` (JWT signé, cookie HTTP-Only)
- **State Management** : TanStack React Query
- **Emailing** : Nodemailer (Transport SMTP)
- **Styles** : Tailwind CSS
- **Graphiques** : Recharts

## Fonctionnalités implémentées

| Étape | Fonctionnalité | Statut |
|-------|---------------|--------|
| 1-2 | Initialisation du projet, PostgreSQL + Prisma | ✅ |
| 3 | Authentification (Register / Login / Logout / Session) | ✅ |
| 4 | Gestion des API Endpoints (CRUD) | ✅ |
| 5 | Health Checks manuels + Historique `ApiCheck` | ✅ |
| 6 | Monitoring automatique (Scheduler serveur + `instrumentation.js`) | ✅ |
| 7 | Incident Management (Création / Résolution auto, anti-doublon PostgreSQL) | ✅ |
| 8 | Uptime & Analytics (Périodes 24h/7j/30j, Uptime global, P95, Recharts) | ✅ |
| 9 | Notifications & Alerting (Emails Nodemailer, `NotificationLog`, Préférences) | ✅ |

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
   # Remplir les valeurs dans .env (PostgreSQL, JWT_SECRET, CRON_SECRET, SMTP)
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
├── app/                        # Pages & Route Handlers (App Router)
│   ├── api/                    # API Routes
│   │   ├── analytics/          # Analytics globales Dashboard
│   │   ├── auth/               # Register, Login, Logout, Me
│   │   ├── cron/               # Route monitoring automatique (CRON_SECRET)
│   │   ├── endpoints/          # CRUD Endpoints, Checks, Incidents, Analytics
│   │   ├── incidents/          # Liste des incidents
│   │   └── notifications/      # Logs de notifications et préférences utilisateur
│   ├── dashboard/              # Pages Dashboard protégées (/dashboard, /dashboard/apis/[id])
│   ├── login/
│   └── register/
│
├── components/
│   └── api-monitoring/         # ApiCard, ApiForm, ApiList, HealthCheckStatus,
│                               # IncidentsList, AnalyticsChart, NotificationPreferences,
│                               # NotificationLogsList
│
├── hooks/                      # React Query hooks (use-apis, use-monitoring,
│                               # use-incidents, use-analytics, use-notifications)
├── lib/                        # auth.js, prisma.js, scheduler.js
├── services/                   # Service Layer (auth, api, monitoring, incident,
│                               # analytics, notification)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── middleware.js                # Protection des routes /dashboard
├── instrumentation.js           # Démarrage automatique du scheduler
└── .env.example
```

## Sécurité & Isolation

- Sessions HTTP-Only (cookie `apiwatch_session`)
- JWT signé avec `jose` (HS256)
- Isolation stricte par `userId` déduit côté serveur sur toutes les requêtes
- Route Cron protégée par `CRON_SECRET` (Bearer token)
- Contrainte d'unicité partielle PostgreSQL `unique_open_incident_per_endpoint` (anti-doublon d'incidents OPEN)
- Contrainte d'unicité PostgreSQL `@@unique([incidentId, type])` sur `NotificationLog`
- `.env` exclu de Git

## Monitoring & Alerting

### Scheduler Automatique
Le scheduler se lance automatiquement au démarrage du serveur via `instrumentation.js`.
Pour déclencher un cycle manuellement :

```bash
curl -X POST http://localhost:3000/api/cron/monitoring \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"
```

### Notifications & Alerts Email
- **Ouverture (`INCIDENT_OPEN`)** : Email d'alerte envoyé automatiquement lors de l'ouverture d'une nouvelle panne.
- **Résolution (`INCIDENT_RESOLVED`)** : Email de rétablissement envoyé avec calcul de la durée exacte de la panne.
- **Tolérance aux pannes (Fail-Safe)** : Une défaillance SMTP n'annule jamais la création/résolution de l'incident et est enregistrée dans le journal `NotificationLog` avec le statut `FAILED`.
- **Préférences Utilisateur** : Chaque utilisateur peut activer ou désactiver ses alertes par email directement dans le Dashboard.
