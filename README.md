# APIWatch — API Monitoring & Incident Management Platform

APIWatch est une plateforme Full Stack de surveillance continue d'APIs, gestion automatisée du cycle de vie des incidents, exploration avancée des logs, tableaux de bord personnalisables multi-équipes, page de statut publique, alertes multi-destinataires par email (Gmail SMTP) et intégrations par Webhooks signés HMAC-SHA256.

Entièrement conteneurisée avec **Docker & Docker Compose** sur **PostgreSQL 17**.

---

## 🚀 Stack Technique

- **Framework & Runtime** : Next.js 16 (App Router, Turbopack, React 19, Standalone output) sur Node.js 24 Alpine
- **Base de Données & ORM** : PostgreSQL 17 via Prisma ORM v6 (Migrations automatiques, Intégrité référentielle cascade & restrict)
- **Authentification & Sessions** : JWT signé avec `jose` (HS256), hachage sécurisé `bcryptjs`, cookies sécurisés `HTTP-Only` (`SameSite=Lax`)
- **Multi-Tenancy & RBAC** : Isolation stricte par équipe, rôles hiérarchiques (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), invitations sécurisées par jeton haché
- **State Management & Data Fetching** : TanStack React Query (Polling adaptatif 10s In-App, 30s Status Page)
- **Emailing & Alerting** : Nodemailer (Transport SMTP STARTTLS / Gmail App Password, Templates HTML responsifs dark theme)
- **Sécurité & Hardening** :
  - Garde Anti-SSRF (Résolution DNS temps réel, blocage IPv4/IPv6 privées, loopback et métadonnées cloud)
  - Garde Anti-CSRF (Vérification stricte de l'origine sur requêtes mutatives)
  - Rate Limiting in-memory (Fenêtre glissante par IP)
  - Signatures HMAC-SHA256 des Webhooks (`X-APIWatch-Signature`)
  - Redaction automatique des headers sensibles dans les logs et interfaces
- **Visualisations & UI** : Tailwind CSS, Recharts, Lucide Icons, DnD-ready widgets

---

## 📋 Tableau des Fonctionnalités Implémentées

| Étape | Module / Fonctionnalité | Statut |
| :--- | :--- | :---: |
| **1-2** | Initialisation du projet Next.js App Router, configuration PostgreSQL & Prisma ORM | ✅ |
| **3** | Authentification complète (Inscription, Connexion, Déconnexion, Session JWT HTTP-Only) | ✅ |
| **4** | Gestion CRUD des API Endpoints avec validation Zod | ✅ |
| **5** | Health Checks manuels et historique chronologique `ApiCheck` | ✅ |
| **6** | Monitoring automatique périodique (Scheduler serveur non-bloquant via `instrumentation.js`) | ✅ |
| **7** | Incident Management (Création/Résolution automatique, anti-doublon PostgreSQL, calcul de durée) | ✅ |
| **8** | Uptime & Analytics (Périodes 24h/7j/30j, Uptime global, temps de réponse moyen/P95, graphiques Recharts) | ✅ |
| **9** | Notifications Email & Alertes (Nodemailer, `NotificationLog`, Préférences utilisateurs) | ✅ |
| **10** | Centre de Notifications In-App (Cloche interactive 🔔, polling 10s, badge non-lus, redirection API) | ✅ |
| **11** | Page de Statut Publique (`/status/[slug]`, DTO sanitisé, UI Config Dashboard, rafraîchissement 30s) | ✅ |
| **12-14** | Formulaire Avancé 4 Onglets (Général, Requête HTTP/Headers, Corps JSON, Alertes & Seuils) | ✅ |
| **15** | Advanced Monitoring (Méthodes GET/POST/PUT/PATCH/DELETE, headers/params custom, timeout dynamique) | ✅ |
| **16** | Alerting Avancé (Seuils consécutifs `unhealthyThreshold`/`recoveryThreshold`, multi-destinataires, Gmail SMTP) | ✅ |
| **17** | Webhooks & Intégrations (Signature HMAC-SHA256, garde SSRF, payloads standardisés, bouton de test direct) | ✅ |
| **18** | Gestion d'Équipes & Multi-Tenancy (Équipes, rôles RBAC OWNER/ADMIN/MEMBER/VIEWER, invitations email, transferts) | ✅ |
| **19** | Tableaux de Bord Personnalisables (7 widgets modulaires, persistance des préférences par utilisateur/équipe) | ✅ |
| **20** | Explorateur de Logs & Observabilité (Filtres combinés, métriques P95/médiane, export CSV structuré) | ✅ |
| **21** | Sécurité & Hardening (SSRF Guard DNS, CSRF Guard, Rate Limiter IP, complexité mots de passe) | ✅ |
| **22** | Conteneurisation Docker & Déploiement (Build multi-stage Alpine Node 24, standalone, healthchecks Docker) | ✅ |
| **23** | Migration Sécurisée des Données & PostgreSQL 17 (Restauration intégrale des données historiques, réconciliation Prisma) | ✅ |

---

## 🐳 Démarrage Rapide avec Docker Compose

Le moyen le plus simple et recommandé de lancer APIWatch en production ou en test local :

### 1. Cloner le projet

```bash
git clone https://github.com/amalbenbihi01/apiwatch.git
cd apiwatch
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```
*(Ajustez vos variables SMTP et vos clés de sécurité dans `.env` si nécessaire).*

### 3. Démarrer la stack

```bash
docker compose up -d --build
```

L'application est automatiquement initialisée (migrations Prisma exécutées au démarrage, conteneurs `Healthy`) et accessible sur :
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 💻 Démarrage en Développement Local (sans Docker)

### Prérequis
- Node.js 20+ ou 24
- PostgreSQL 17 installé localement

### Étapes

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Configurer `.env` :
   ```bash
   cp .env.example .env
   ```
   Renseignez votre `DATABASE_URL` locale (ex: `postgresql://postgres:password@localhost:5432/apiwatch?schema=public`).

3. Appliquer les migrations et générer le client Prisma :
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

---

## 🔒 Sécurité & Bonnes Pratiques

- **Zéro fuite de secrets** : Les clés secrètes (`webhookSecret`), tokens et mots de passe ne sont jamais renvoyés aux clients.
- **Authentification robuste** : Cookies de session `HTTP-Only` avec attributs `SameSite=Lax` et flags de sécurité.
- **Garde Anti-SSRF** : Chaque URL ciblée par un check ou un webhook fait l'objet d'une résolution DNS stricte interdisant l'accès aux réseaux internes (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, IPv6 `::1`, `fc00::/7`, `fe80::/10`).
- **Garde Anti-CSRF** : Vérification systématique des en-têtes `Origin` et `Referer` sur les endpoints d'écriture.
- **Rate Limiting** : Protection contre le brute-force sur l'authentification et les actions sensibles.
- **Contrôle d'accès RBAC** : Vérification au niveau du serveur de l'appartenance à l'équipe et des permissions (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) sur chaque ressource.

---

## 🧪 Tests de Qualification

Le projet intègre des suites de tests automatisées validant l'ensemble des modules :

```bash
node scripts/test-step18.mjs   # Tests Gestion d'équipes & RBAC (41/41 tests passés)
node scripts/test-step19.mjs   # Tests Tableaux de bord personnalisables (35/35 assertions passées)
node scripts/test-step20.mjs   # Tests Observabilité, Logs & Export CSV (66/66 tests passés)
node scripts/test-step21.mjs   # Tests Sécurité, SSRF, CSRF, Rate Limiting (56/56 tests passés)
node scripts/test-step22.mjs   # Tests Dockerfile & Déploiement
```

---

## 📂 Architecture des Dossiers

```text
apiwatch/
├── app/                        # Pages & Route Handlers (Next.js App Router)
│   ├── api/                    # Endpoints REST (auth, endpoints, incidents, logs, teams, status, etc.)
│   ├── dashboard/              # Interface utilisateur protégée (monitors, logs, team, settings)
│   ├── status/[slug]/          # Page de statut publique
│   ├── login/ & register/      # Interfaces d'authentification
│   └── page.js                 # Page d'accueil / navigation
├── components/                 # Composants React modulaires (dashboard, logs, team, api-monitoring)
├── hooks/                      # Hooks React Query personnalisés
├── lib/                        # Utilitaires (auth, prisma, scheduler, ssrf-guard, csrf-guard, rate-limiter)
├── services/                   # Couche métier isolée (auth, api, monitoring, team, logs, webhook, etc.)
├── prisma/                     # Schéma déclaratif et migrations versionnées PostgreSQL
├── scripts/                    # Scripts de qualification et de tests automatisés
├── Dockerfile                  # Build multi-stage optimisé (Node 24 Alpine)
├── docker-compose.yml          # Orchestration Next.js + PostgreSQL 17
├── docker-entrypoint.sh        # Point d'entrée avec auto-migration Prisma
└── .env.example                # Modèle des variables d'environnement
```

---

## 📄 Licence

Ce projet est sous licence MIT.
