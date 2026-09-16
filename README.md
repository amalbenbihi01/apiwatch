# APIWatch — API Monitoring & Incident Management Platform

Projet de stage — Plateforme Full Stack de surveillance d'APIs, gestion automatique des incidents, analytics de performance, notifications In-App avec cloche d'alerte et système d'alerting par email.

## Stack technique

- **Framework** : Next.js 16 (App Router, JavaScript)
- **Base de données** : PostgreSQL 17 (via Prisma ORM v6)
- **Auth** : `bcryptjs` + `jose` (JWT signé, cookie HTTP-Only)
- **State Management** : TanStack React Query (Polling optimisé à 10s)
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
| 9 | Notifications Email (Nodemailer, `NotificationLog`, Préférences) | ✅ |
| 10 | Notifications In-App & Alerting (Cloche 🔔, Polling 10s, Redirection API) | ✅ |

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
│   │   └── notifications/      # Emails logs, préférences et notifications In-App
│   │       ├── in-app/         # GET list, GET unread-count, PATCH read, PATCH read-all
│   │       └── preferences/
│   ├── dashboard/              # Pages Dashboard protégées
│   │   ├── apis/[id]/          # Détail API & analytics
│   │   └── notifications/      # Centre de Notifications In-App
│   ├── login/
│   └── register/
│
├── components/
│   └── api-monitoring/         # ApiCard, ApiForm, ApiList, HealthCheckStatus,
│                               # IncidentsList, AnalyticsChart, NotificationPreferences,
│                               # NotificationLogsList, NotificationBell, NotificationDropdown
│
├── hooks/                      # React Query hooks (use-apis, use-monitoring,
│                               # use-incidents, use-analytics, use-notifications,
│                               # use-in-app-notifications)
├── lib/                        # auth.js, prisma.js, scheduler.js
├── services/                   # Service Layer (auth, api, monitoring, incident,
│                               # analytics, notification, in-app-notification)
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
- Contrainte d'unicité PostgreSQL `@@unique([incidentId, type])` sur `NotificationLog` et `InAppNotification`
- `.env` exclu de Git

## Monitoring & Alerting

### Scheduler Automatique
Le scheduler se lance automatiquement au démarrage du serveur via `instrumentation.js`.
Pour déclencher un cycle manuellement :

```bash
curl -X POST http://localhost:3000/api/cron/monitoring \
  -H "Authorization: Bearer VOTRE_CRON_SECRET"
```

### Notifications In-App (Cloche 🔔 & Polling Optimisé)
- **Cloche de Notification 🔔** : Intégrée dans le header du Dashboard avec un badge dynamique affichant le nombre de notifications non lues (`🔔 3`).
- **Menu Déroulant (Dropdown)** : Affiche les 5 plus récentes notifications avec badges 🔴 (Ouverture) et 🟢 (Résolution). Le clic sur une notification marque la notification comme lue et redirige automatiquement l'utilisateur vers la page de l'API concernée (`/dashboard/apis/[endpointId]`).
- **Polling Optimisé** : Le rafraîchissement se fait toutes les 10 secondes via TanStack React Query sur la route ultralégère `/api/notifications/in-app/unread-count`. Le polling se met en pause automatiquement lorsque l'onglet est inactif (`refetchIntervalInBackground: false`) et se rafraîchit immédiatement au retour de l'utilisateur (`refetchOnWindowFocus: true`).
- **Centre de Notifications (`/dashboard/notifications`)** : Page complète avec filtres (Toutes / Non lues), pagination et bouton global de marquage comme lu.

### Notifications Email
- **Ouverture (`INCIDENT_OPEN`) & Résolution (`INCIDENT_RESOLVED`)** : Emails d'alerte et de rétablissement envoyés via Nodemailer.
- **Tolérance aux pannes (Fail-Safe)** : Une défaillance SMTP ou In-App n'annule jamais la création/résolution de l'incident et s'exécute dans des blocs isolés.
