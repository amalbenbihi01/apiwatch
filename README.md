# APIWatch — API Monitoring & Incident Management Platform

Projet de stage — Plateforme Full Stack de surveillance d'APIs, gestion automatique des incidents, analytics de performance, notifications In-App avec cloche d'alerte, système d'alerting par email, Page de Statut Publique et configuration avancée des requêtes HTTP & alertes.

## Stack technique

- **Framework** : Next.js 16 (App Router, JavaScript)
- **Base de données** : PostgreSQL 17 (via Prisma ORM v6)
- **Auth** : `bcryptjs` + `jose` (JWT signé, cookie HTTP-Only)
- **State Management** : TanStack React Query (Polling optimisé à 10s pour les notifications In-App, 30s pour la Status Page)
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
| 11 | Page de Statut Publique (`/status/[slug]`, DTO sanitisé, UI Config Dashboard, Polling 30s) | ✅ |
| 12-13 | Architecture & Migration Prisma (Headers JSON, QueryParams JSON, Body JSON, Timeouts, Alertes, Webhooks) | ✅ |
| 14 | Formulaire 4 Onglets (Général, Requête/Headers, Corps JSON, Alertes & Seuils) | ✅ |

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
│   │   ├── endpoints/          # CRUD Endpoints, Checks, Incidents, Analytics, Check-Url
│   │   ├── incidents/          # Liste des incidents
│   │   ├── notifications/      # Emails logs, préférences et notifications In-App
│   │   ├── status-page/        # Configuration privée Status Page
│   │   └── status/public/[slug]# Endpoint public sanitisé Status Page
│   ├── dashboard/              # Pages Dashboard protégées
│   │   ├── apis/[id]/          # Détail API & analytics
│   │   ├── notifications/      # Centre de Notifications In-App
│   │   └── status-page/        # Page de configuration Status Page Publique
│   ├── status/[slug]/          # Page de Statut Publique dynamique (Sanitisée, Quasi t-réel 30s)
│   ├── login/
│   └── register/
│
├── components/
│   ├── api-monitoring/         # ApiCard, ApiForm (Formulaire 4 Onglets), ApiList, HealthCheckStatus,
│   │                           # IncidentsList, AnalyticsChart, NotificationPreferences,
│   │                           # NotificationLogsList, NotificationBell, NotificationDropdown, StatusPageConfig
│   └── status/                 # PublicStatusHeader, PublicServicesList, PublicIncidentsList
│
├── hooks/                      # React Query hooks (use-apis, use-monitoring,
│                               # use-incidents, use-analytics, use-notifications,
│                               # use-in-app-notifications, use-status-page)
├── lib/                        # auth.js, prisma.js, scheduler.js
├── services/                   # Service Layer (auth, api, monitoring, incident,
│                               # analytics, notification, in-app-notification, status-page)
├── prisma/
│   ├── schema.prisma           # Modèles User, ApiEndpoint, ApiCheck, Incident, NotificationLog, InAppNotification, StatusPage
│   └── migrations/             # Migrations PostgreSQL
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
- **Sanitisation stricte de la Status Page Publique** : aucune donnée sensible (`userId`, `url` interne, `passwordHash`, tokens) n'est exposée sur l'URL publique `/status/[slug]`.
- Masquage des en-têtes sensibles (`Authorization`, `X-API-Key`, `Token`, `Secret`) dans le formulaire et les logs.
- `.env` exclu de Git

## Fonctionnalités Avancées

### 🌐 Page de Statut Publique (`/status/[slug]`)
- **URL personnalisée (Slug)** : Les utilisateurs peuvent configurer leur propre slug dynamique (ex: `/status/mon-entreprise`).
- **Bannière d'état globale** : Détection automatique de la santé du système (`Tous les systèmes sont opérationnels`, `Performances dégradées`, `Panne majeure`).
- **Liste des services & incidents** : Affichage sanitisé du statut des APIs sélectionnées (Uptime 24h, temps de réponse ms, méthode HTTP) et de l'historique des incidents récents.
- **Rafraîchissement automatique quasi temps réel** : Polling TanStack React Query toutes les 30 secondes.

### 📋 Formulaire API 4 Onglets (Request & Alert Configuration)
- **⚙️ Général** : Nom, URL, méthode HTTP, description, activation et bouton "Tester la connexion".
- **🔌 Requête (Headers & Query Params)** : Interface dynamique pour ajouter des en-têtes HTTP (avec masque de saisie des secrets) et des paramètres de requête d'URL.
- **📝 Corps (Body JSON)** : Éditeur JSON avec validation syntaxique en temps réel.
- **🚨 Alertes & Seuils** : Réglage du Timeout (500-30000ms), Seuil de latence, Seuil d'échecs (`unhealthyThreshold`), Seuil de récupération (`recoveryThreshold`) et liste multi-destinataires d'alertes secondaires.

---

### Notifications In-App & Email
- **Cloche 🔔 & Polling 10s** : Notification en temps réel des incidents avec comptage des non-lus et redirection vers l'API concernée.
- **Emails Nodemailer** : Alerte lors de l'ouverture d'incident (`INCIDENT_OPEN`) et notification de rétablissement (`INCIDENT_RESOLVED`).
