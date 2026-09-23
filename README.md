# APIWatch — API Monitoring & Incident Management Platform

Plateforme Full Stack de surveillance d'APIs, gestion automatique des incidents, analytics de performance, notifications In-App, système d'alerting multi-destinataires par email (Gmail SMTP), Page de Statut Publique, configuration avancée des requêtes HTTP et intégrations par Webhooks signés HMAC-SHA256.

## Stack technique

- **Framework** : Next.js 16 (App Router, JavaScript, Turbopack)
- **Base de données** : PostgreSQL 17 (via Prisma ORM v6)
- **Auth** : `bcryptjs` + `jose` (JWT signé, cookie HTTP-Only)
- **State Management** : TanStack React Query (Polling optimisé à 10s pour les notifications In-App, 30s pour la Status Page)
- **Emailing** : Nodemailer (Transport SMTP / Gmail App Password)
- **Sécurité Webhooks** : Signature cryptographique HMAC-SHA256 (`crypto`) + Garde SSRF
- **Styles** : Tailwind CSS
- **Graphiques** : Recharts

---

## Fonctionnalités implémentées

| Étape | Fonctionnalité | Statut |
|-------|---------------|:------:|
| **1-2** | Initialisation du projet, PostgreSQL + Prisma | ✅ |
| **3** | Authentification (Register / Login / Logout / Session) | ✅ |
| **4** | Gestion des API Endpoints (CRUD) | ✅ |
| **5** | Health Checks manuels + Historique `ApiCheck` | ✅ |
| **6** | Monitoring automatique (Scheduler serveur + `instrumentation.js`) | ✅ |
| **7** | Incident Management (Création / Résolution auto, anti-doublon PostgreSQL) | ✅ |
| **8** | Uptime & Analytics (Périodes 24h/7j/30j, Uptime global, P95, Recharts) | ✅ |
| **9** | Notifications Email (Nodemailer, `NotificationLog`, Préférences) | ✅ |
| **10** | Notifications In-App & Alerting (Cloche 🔔, Polling 10s, Redirection API) | ✅ |
| **11** | Page de Statut Publique (`/status/[slug]`, DTO sanitisé, UI Config Dashboard, Polling 30s) | ✅ |
| **12-13** | Architecture & Migration Prisma (Headers JSON, QueryParams JSON, Body JSON, Timeouts, Alertes, Webhooks) | ✅ |
| **14** | Formulaire 4 Onglets (Général, Requête/Headers, Corps JSON, Alertes & Seuils) | ✅ |
| **15** | Advanced Monitoring (Headers customisés, Query params, Body JSON, Timeout dynamique, Détection de latence, Redaction logs) | ✅ |
| **16** | Advanced Alerts & Notifications Gmail (Seuils `unhealthyThreshold` & `recoveryThreshold`, Multi-destinataires `alertEmails`, Templates HTML, Gmail SMTP, Anti-spam, Fail-safe) | ✅ |
| **17** | Webhooks & Integrations (Signature HMAC-SHA256, Protection SSRF, Événements `INCIDENT_OPENED`/`INCIDENT_RESOLVED`, Événement de test `WEBHOOK_TEST`, UI de test interactive) | ✅ |

---

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
   # Remplir les valeurs dans .env (DATABASE_URL, JWT_SECRET, CRON_SECRET, SMTP)
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

---

## Architecture du Projet

```
Next.js Monolithe Full Stack
│
├── app/                        # Pages & Route Handlers (App Router)
│   ├── api/                    # API Routes
│   │   ├── analytics/          # Analytics globales Dashboard
│   │   ├── auth/               # Register, Login, Logout, Me
│   │   ├── cron/               # Route monitoring automatique (CRON_SECRET)
│   │   ├── endpoints/          # CRUD Endpoints, Checks, Incidents, Analytics, Check-Url
│   │   │   └── [id]/webhook/test # Route de test interactif pour les Webhooks (WEBHOOK_TEST)
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
│   ├── api-monitoring/         # ApiCard, ApiForm (Formulaire 4 Onglets + Webhook UI), ApiList, HealthCheckStatus,
│   │                           # IncidentsList, AnalyticsChart, NotificationPreferences,
│   │                           # NotificationLogsList, NotificationBell, NotificationDropdown, StatusPageConfig
│   └── status/                 # PublicStatusHeader, PublicServicesList, PublicIncidentsList
│
├── hooks/                      # React Query hooks (use-apis, use-monitoring,
│                               # use-incidents, use-analytics, use-notifications,
│                               # use-in-app-notifications, use-status-page)
├── lib/                        # auth.js, prisma.js, scheduler.js
├── services/                   # Service Layer :
│                               # auth-service, api-service, monitoring-service, incident-service,
│                               # analytics-service, notification-service, in-app-notification-service,
│                               # status-page-service, webhook-service
├── prisma/
│   ├── schema.prisma           # Modèles User, ApiEndpoint, ApiCheck, Incident, NotificationLog, InAppNotification, StatusPage
│   └── migrations/             # Migrations PostgreSQL
├── middleware.js                # Protection des routes /dashboard
├── instrumentation.js           # Démarrage automatique du scheduler
└── .env.example
```

---

## Sécurité & Robustesse

- **Sessions HTTP-Only** : Cookie sécurisé `apiwatch_session` avec signature JWT (`jose`, HS256).
- **Isolation des Données** : Vérification stricte de l'appartenance (`userId`) sur toutes les requêtes d'API.
- **Protection Anti-Spam** : Unicité des incidents `OPEN` et des notifications d'alerte lors de pannes continues.
- **Signature HMAC-SHA256 des Webhooks** : En-tête `X-APIWatch-Signature: sha256=<signature>` pour authentifier l'émetteur.
- **Garde Anti-SSRF** : Blocage préventif des requêtes vers `localhost`, `127.0.0.1`, les métadonnées cloud (`169.254.169.254`) et les plages IP privées (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- **Masquage des Secrets** : `webhookSecret`, mots de passe, tokens et headers sensibles ne sont jamais divulgués au frontend ni dans les logs.
- **Sanitisation Status Page Publique** : Aucune URL interne, secret ou adresse email n'est exposée sur `/status/[slug]`.
- **Fail-Safe Total** : Une erreur SMTP ou un échec de distribution Webhook n'interrompt jamais le cycle de surveillance du monitoring.

---

## Fonctionnalités Clés

### 🌐 Webhooks & Intégrations (Étape 17)
- **Déclencheurs Automatiques** : Événements `INCIDENT_OPENED` et `INCIDENT_RESOLVED` envoyés en HTTP POST avec payload JSON standardisé.
- **Sécurité HMAC** : Signature calculée sur le corps brut de la requête à l'aide de la clé secrète configurée.
- **Bouton "Tester le webhook"** : Événement dédié `WEBHOOK_TEST` permettant de vérifier la distribution et le code HTTP en direct sans altérer l'historique d'incidents.
- **Gestion Sécurisée** : Masquage du secret dans l'interface (`🔒 Secret configuré`) et conservation automatique lors des modifications.

### 📧 Notifications Email & Alertes Multi-Destinataires (Étape 16)
- **Seuils Personnalisables** : Déclenchement d'incident après `unhealthyThreshold` échecs consécutifs et résolution après `recoveryThreshold` succès consécutifs.
- **Multi-Destinataires** : Envoi groupé à l'adresse du propriétaire (`user.email`) ainsi qu'à la liste `alertEmails`.
- **Templates HTML Professionnels** : Emails responsifs dark-theme avec récapitulatif précis de la panne (URL, Méthode, Statut, Cause, Durée d'interruption).
- **Support Gmail SMTP** : Connexion STARTTLS sur le port 587 avec App Passwords Google.

### ⚡ Advanced Monitoring (Étape 15)
- **Requêtes HTTP Complètes** : Support des méthodes `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- **Headers & Paramètres d'URL** : Injection dynamique des en-têtes personnalisés et des query strings.
- **Corps JSON** : Transmission de payloads pour les méthodes d'écriture (`POST`, `PUT`, `PATCH`).
- **Détection de Latence** : Alerte en cas de dépassement du seuil `responseTimeThresholdMs`.
