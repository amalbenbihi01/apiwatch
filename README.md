# APIWatch — API Monitoring & Incident Management Platform

APIWatch est une plateforme Full Stack de surveillance continue d'APIs, gestion automatisée du cycle de vie des incidents, exploration avancée des logs, tableaux de bord personnalisables multi-équipes, page de statut publique, alertes multi-destinataires par email et intégrations par Webhooks signés HMAC-SHA256.

Développée dans le cadre d'un projet de fin d'études en Génie Informatique, la plateforme répond aux exigences professionnelles de haute disponibilité, de sécurité défensive (gardes anti-SSRF et anti-CSRF) et d'isolation multi-tenant.

Entièrement conteneurisée avec **Docker & Docker Compose** sur **PostgreSQL 17**.

---

## 🚀 Stack Technique & Architecture

- **Framework & Runtime** : Next.js 16 (App Router, Turbopack, React 19, Standalone output) sur Node.js 24 Alpine
- **Langage** : 100% JavaScript (ES Modules modernes, sans TypeScript)
- **Base de Données & ORM** : PostgreSQL 17 via Prisma ORM v6 (9 migrations versionnées, intégrité référentielle CASCADE & RESTRICT)
- **Authentification & Sessions** : JWT signé avec `jose` (HS256, 7 jours), hachage sécurisé `bcryptjs` avec temps constant, cookies sécurisés `HTTP-Only` (`SameSite=Lax`, `Path=/`)
- **Multi-Tenancy & RBAC** : Isolation stricte par équipe, rôles hiérarchiques (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), invitations sécurisées par jeton haché
- **State Management & Data Fetching** : TanStack React Query (mise en cache intelligente, rafraîchissement adaptatif)
- **Emailing & Alerting** : Nodemailer (Transport SMTP STARTTLS, templates HTML responsifs dark-theme)
- **Sécurité Défensive & Hardening** :
  - **Garde Anti-SSRF en profondeur** : Résolution DNS en amont, blocage des plages d'adresses IPv4/IPv6 privées, loopback (`127.0.0.0/8`), link-local et métadonnées cloud (`169.254.169.254`), avec épinglage d'IP pour limiter les risques de DNS rebinding (TOCTOU)
  - **Contrôles Anti-CSRF ciblés** : Vérification des en-têtes `Origin` et `Referer` sur 19 fichiers de routes mutatives sensibles (authentification, équipes, monitors, invitations, statuts) ; la route CRON est protégée par jeton Bearer, tandis que la déconnexion et l'acquittement des notifications in-app reposent sur le contrôle d'accès de session sans validation CSRF dédiée
  - **Rate Limiting mémoire** : Fenêtre glissante par IP (auth et status page publique) avec ramasse-miettes automatique
  - **Signatures Webhooks HMAC-SHA256** : En-tête `X-APIWatch-Signature` pour attester de l'authenticité des notifications
  - **Protection des données sensibles** : Masquage des en-têtes HTTP sensibles via `redactSensitiveHeaders` dans les logs de monitoring, exclusion du `webhookSecret` brut dans les réponses API (`sanitizeEndpoint`) et non-divulgation des hashs de mots de passe
- **Visualisations & UI** : Tailwind CSS v4, Recharts, Lucide Icons, widgets modulaires

---

## 📋 Tableau des Fonctionnalités Implémentées

| Étape | Module / Fonctionnalité | Statut |
| :--- | :--- | :---: |
| **1-2** | Initialisation du projet Next.js App Router, configuration PostgreSQL & Prisma ORM | ✅ |
| **3** | Authentification complète (Inscription, Connexion, Déconnexion, Session JWT HTTP-Only) | ✅ |
| **4** | Gestion CRUD des API Endpoints avec validation de schéma Zod | ✅ |
| **5** | Health Checks manuels et historique chronologique `ApiCheck` | ✅ |
| **6** | Monitoring automatique périodique (Scheduler serveur non-bloquant via `instrumentation.js`) | ✅ |
| **7** | Incident Management (Création/Résolution automatique, machine à états, calcul durée & SLA) | ✅ |
| **8** | Uptime & Analytics (Périodes 24h/7j/30j, Uptime global, temps de réponse moyen/P95, graphiques Recharts) | ✅ |
| **9** | Notifications Email & Alertes (Nodemailer, `NotificationLog`, Préférences utilisateurs) | ✅ |
| **10** | Centre de Notifications In-App (Cloche interactive 🔔, polling 10s, badge non-lus, redirection API) | ✅ |
| **11** | Page de Statut Publique (`/status/[slug]`, DTO sanitisé, UI Config Dashboard, rafraîchissement 30s) | ✅ |
| **12-14** | Formulaire Avancé 4 Onglets (Général, Requête HTTP/Headers, Corps JSON, Alertes & Seuils) | ✅ |
| **15** | Advanced Monitoring (Méthodes GET/POST/PUT/PATCH/DELETE, headers/params custom, timeout dynamique) | ✅ |
| **16** | Alerting Avancé (Seuils consécutifs `unhealthyThreshold`/`recoveryThreshold`, multi-destinataires) | ✅ |
| **17** | Webhooks & Intégrations (Signature HMAC-SHA256, garde SSRF, payloads standardisés, bouton de test) | ✅ |
| **18** | Gestion d'Équipes & Multi-Tenancy (Équipes, rôles RBAC OWNER/ADMIN/MEMBER/VIEWER, invitations email) | ✅ |
| **19** | Tableaux de Bord Personnalisables (7 widgets modulaires, persistance PostgreSQL des préférences) | ✅ |
| **20** | Explorateur de Logs & Observabilité (Filtres combinés statut/code HTTP, métriques P95, export CSV) | ✅ |
| **21-22** | Sécurité, Durcissement & Docker (Garde SSRF, Rate Limiting, build multi-stage Alpine Node 24) | ✅ |
| **23** | Migration Sécurisée des Données & PostgreSQL 17 (Volume persistant, réconciliation Prisma) | ✅ |
| **24-33** | Consolidation Post-V1 (Landing page, navigation, isolation d'équipe du monitoring et durcissement CSRF) | ✅ |
| **34** | Optimisation Performance Analytics (Élimination de la boucle N+1 via requête groupée `distinct`) | ✅ |
| **35** | Assainissement des Migrations Prisma (Alignement strict des 9 migrations dans `_prisma_migrations`) | ✅ |

---

## 🎯 Scénario de Démonstration pour la Soutenance (~10 minutes)

Ce scénario est conçu pour présenter à l'encadrant l'ensemble des capacités opérationnelles d'APIWatch de manière fluide et professionnelle.

### Prérequis
- Application démarrée (via Docker ou `npm run dev`)
- Base de données PostgreSQL locale initialisée
- Navigateur web sur **[http://localhost:3000](http://localhost:3000)**

---

### Étape 1 — Connexion & Découverte du Dashboard (2 min)
1. **Action :** Accéder à la page d'accueil, cliquer sur **Connexion** et s'authentifier avec un compte utilisateur.
2. **Observation :**
   - Redirection vers `/dashboard` via cookie de session sécurisé `HTTP-Only`.
   - Affichage du sélecteur d'équipe active en haut à droite avec le rôle attribué (`OWNER`, `ADMIN`, `MEMBER`, ou `VIEWER`).
   - Présentation des 7 widgets modulaires (Santé du Système, Disponibilité 24h, Latence moyenne, Activité récente, etc.).

### Étape 2 — Création & Configuration d'un Monitor API (2 min)
1. **Action :** Se rendre sur **Monitors** (ou `/dashboard`), cliquer sur **+ Ajouter une API**.
2. **Configuration dans le formulaire à 4 onglets :**
   - *Général :* Nom (ex: `JSONPlaceholder Test`), URL `https://jsonplaceholder.typicode.com/posts/1`, méthode `GET`.
   - *Requête :* Headers personnalisés (ex: `Accept: application/json`).
   - *Alertes :* Seuil d'échecs avant incident = `2`, Seuil de rétablissement = `1`.
3. **Observation :** Validation Zod en temps réel, création immédiate dans l'équipe active.

### Étape 3 — Détection d'Indisponibilité & Création d'Incident (2 min)
1. **Simulation contrôlée :** Modifier l'URL pour pointer vers une ressource retournant une erreur HTTP 500 ou un endpoint invalide (ex: `https://httpstat.us/500`).
2. **Action :** Ouvrir la fiche détaillée du monitor (`/dashboard/apis/[id]`) et déclencher un contrôle manuel via le bouton **Vérifier maintenant** (ou **Réessayer** en cas d'erreur), ou attendre l'exécution automatique du scheduler.
3. **Observation :**
   - Le statut de l'API passe en **DOWN** avec le code HTTP et le message d'erreur.
   - Lorsque le seuil configuré est atteint, un incident **OPEN** est créé automatiquement.
   - La cloche de notifications en haut à droite s'anime avec un badge rouge 🔔 (`Panne détectée`).
   - Un enregistrement d'alerte est consigné dans l'historique des notifications.

### Étape 4 — Rétablissement & Calcul du MTTR (1 min 30)
1. **Action :** Rétablir l'URL valide (`https://jsonplaceholder.typicode.com/posts/1`) et relancer un contrôle.
2. **Observation :**
   - Le statut repasse en **UP**.
   - L'incident passe automatiquement à l'état **RESOLVED**.
   - Calcul immédiat de la durée totale de l'incident et mise à jour du MTTR (Mean Time To Resolution).
   - Nouvelle notification In-App de rétablissement 🟢.

### Étape 5 — Explorateur de Logs & Export CSV (1 min 30)
1. **Action :** Se rendre sur l'onglet **Logs** (`/dashboard/logs`).
2. **Observation :**
   - Filtrage combiné : sélectionner le filtre `Status: DOWN` ou le code HTTP `5xx`.
   - Visualisation de la latence, du code de retour et du détail de chaque contrôle.
3. **Action :** Cliquer sur **Exporter CSV**.
4. **Observation :** Téléchargement instantané d'un fichier CSV formaté contenant l'historique filtré.

### Étape 6 — Page de Statut Publique Sanitisée (1 min)
1. **Action :** Aller dans **Status Page** (`/dashboard/status-page`), activer la page publique et choisir un slug (ex: `production`).
2. **Action :** Ouvrir l'URL publique `/status/production` dans une fenêtre de navigation privée (sans session active).
3. **Observation :**
   - Interface publique élégante montrant le statut global des services (`Opérationnel`, `Dégradé`).
   - **Assainissement des données :** Absence de clé d'API, header sensible ou jeton dans la charge utile transmise (DTO restreint aux attributs publics).

---

## 🐳 Démarrage Rapide avec Docker Compose (Recommandé)

Le déploiement conteneurisé fournit un environnement isolé et reproductible (Next.js Standalone + PostgreSQL 17 Alpine) :

### 1. Cloner le projet
```bash
git clone https://github.com/amalbenbihi01/apiwatch.git
cd apiwatch
```

### 2. Configurer les variables d'environnement
```bash
cp .env.example .env
```
*(Ajustez les valeurs des secrets et vos identifiants SMTP si vous souhaitez tester l'envoi réel d'emails).*

### 3. Démarrer la stack
```bash
docker compose up -d --build
```

Le conteneur applicatif attend que PostgreSQL soit `healthy`, exécute automatiquement les 9 migrations Prisma via son point d'entrée (`docker-entrypoint.sh`), puis démarre le serveur.

L'application est disponible sur :
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 💻 Démarrage en Développement Local (sans Docker)

### Prérequis
- Node.js 20+ ou Node.js 24
- PostgreSQL 17 installé localement et en cours d'exécution sur le port 5432

### Procédure pas-à-pas

1. **Installer les dépendances :**
   ```bash
   npm install
   ```

2. **Créer le fichier de configuration :**
   ```bash
   cp .env.example .env
   ```
   *Renseignez votre `DATABASE_URL` locale dans `.env` (ex: `postgresql://postgres:votre_mot_de_passe@localhost:5432/apiwatch?schema=public`).*

3. **Déployer les migrations et générer le client Prisma :**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
   *(Cette commande applique séquentiellement les 9 migrations versionnées du dossier `prisma/migrations` sans conflit).*

4. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```

Accéder ensuite à **[http://localhost:3000](http://localhost:3000)**.

---

## 🔒 Sécurité & Bonnes Pratiques

- **Protection et filtrage des données sensibles** :
  - **En-têtes HTTP dans les logs** : La fonction `redactSensitiveHeaders` ([`services/monitoring-service.js`](file:///c:/Users/pc/OneDrive/Desktop/Projet_stage/apiwatch/services/monitoring-service.js)) masque systématiquement les en-têtes sensibles (`Authorization`, `Cookie`, etc.) lors des contrôles de monitoring.
  - **Secrets Webhooks** : La fonction `sanitizeEndpoint` ([`services/api-service.js`](file:///c:/Users/pc/OneDrive/Desktop/Projet_stage/apiwatch/services/api-service.js)) élimine le `webhookSecret` brut des réponses envoyées au client et expose uniquement le statut de configuration (`webhookSecretConfigured`).
  - **Mots de passe** : Hachage avec sel via `bcryptjs` et exclusion stricte du champ `passwordHash` des retours de l'API d'authentification.
  - **Page de statut publique** : Les DTOs renvoyés par [`services/status-page-service.js`](file:///c:/Users/pc/OneDrive/Desktop/Projet_stage/apiwatch/services/status-page-service.js) sont restreints aux métriques de statut et de performance publiques, sans détails d'infrastructure interne.
- **Gestion des sessions & cookies** : Cookies de session `HTTP-Only` (`SameSite=Lax`, `Path=/`, flag `Secure` en production) empêchant la lecture directe du jeton via JavaScript (réduisant le risque d'exfiltration en cas de vulnérabilité XSS, sans toutefois neutraliser l'exécution de code malveillant dans le navigateur).
- **Protection Anti-SSRF en profondeur ([`lib/ssrf-guard.js`](file:///c:/Users/pc/OneDrive/Desktop/Projet_stage/apiwatch/lib/ssrf-guard.js))** : Résolution DNS préalable avec filtrage strict des plages d'adresses privées (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, IPv6 `::1`, `fc00::/7`, `fe80::/10`). L'agent HTTP dédié épingle l'adresse IP validée pour limiter les risques d'attaques par DNS rebinding (TOCTOU).
- **Protection Anti-CSRF ciblée ([`lib/csrf-guard.js`](file:///c:/Users/pc/OneDrive/Desktop/Projet_stage/apiwatch/lib/csrf-guard.js))** : L'audit identifie 19 fichiers de routes mutatives protégés par vérification explicite des en-têtes `Origin` et `Referer` (soit directement via `verifyCsrfOrigin`, soit via `enforceRole`). Pour les autres routes mutatives : le point d'entrée CRON est authentifié par jeton Bearer `CRON_SECRET` (hors portée des attaques par rebond de navigateur), tandis que la déconnexion (`/api/auth/logout`) et l'acquittement des notifications in-app (`/api/notifications/in-app/...`) s'appuient uniquement sur la validation de session active (`getSession()`), sans vérification CSRF dédiée.
- **Contrôle d'accès RBAC ([`lib/team-context.js`](file:///c:/Users/pc/OneDrive/Desktop/Projet_stage/apiwatch/lib/team-context.js))** : Vérification côté serveur des droits selon la hiérarchie `OWNER` > `ADMIN` > `MEMBER` > `VIEWER` sur chaque endpoint de l'API.
- **Rate Limiting** : Limiteur en mémoire à fenêtre glissante appliqué sur l'authentification et les accès publics.

---

## 🧪 Tests, Validation & Qualification

### Vérifications Statiques Non-Destructives (Recommandées)
Ces commandes n'effectuent **aucune écriture** et peuvent être lancées en toute sécurité sur n'importe quel environnement :

```bash
npm run lint             # Validation ESLint v9 (0 erreur, 0 avertissement)
npx prisma validate      # Validation syntaxique et intégrité du schéma Prisma
```

### Scripts de Qualification d'Intégration
Le projet comprend des scripts d'intégration sous Node.js validant des scénarios de bout en bout :

```bash
node scripts/test-step18.mjs   # Validation multi-équipes & RBAC
node scripts/test-step19.mjs   # Validation tableaux de bord & widgets
node scripts/test-step20.mjs   # Validation observabilité & export CSV
node scripts/test-step21.mjs   # Validation durcissement SSRF, CSRF & Rate Limit
```

> ⚠️ **Avertissement de sécurité sur les données :**
> Les scripts du dossier `scripts/` effectuent des opérations d'écriture réelles (`INSERT` / `UPDATE`) dans la base de données ciblée par votre fichier `.env`. Pour préserver les données existantes de votre démonstration, il est recommandé de les exécuter sur une base de test isolée.

---

## 📐 Limites Connues & Perspectives d'Évolution

En toute transparence académique, les axes d'amélioration suivants constituent d'excellentes perspectives de développement futur :

1. **Scoping des notifications In-App :**
   * *État actuel :* L'index d'unicité `@@unique([incidentId, type])` associe la notification In-App au créateur du monitor (`incident.userId`).
   * *Perspective :* Faire évoluer le modèle pour notifier l'ensemble des membres de l'équipe active via une table de distribution multi-utilisateurs.
2. **Page de Statut collaborative au niveau Équipe :**
   * *État actuel :* La page de statut publique est rattachée à un utilisateur (`status_pages.userId`).
   * *Perspective :* Migrer la relation vers `teamId` pour permettre une co-gestion de la page de statut par tous les administrateurs d'une même équipe.
3. **Rate Limiting distribué :**
   * *État actuel :* Le limiteur de requêtes utilise une fenêtre glissante en mémoire du processus Node.js.
   * *Perspective :* Brancher un backend Redis pour partager les compteurs entre plusieurs instances applicatives en cas de mise à l'échelle horizontale.

---

## 📂 Architecture des Dossiers

```text
apiwatch/
├── app/                        # Pages & Route Handlers (Next.js App Router)
│   ├── api/                    # 41 Endpoints REST (auth, endpoints, incidents, logs, teams, status, etc.)
│   ├── dashboard/              # Interface utilisateur protégée (monitors, logs, team, settings)
│   ├── status/[slug]/          # Page de statut publique sanitisée
│   ├── login/ & register/      # Interfaces d'authentification
│   └── page.js                 # Page d'accueil / vitrine
├── components/                 # Composants React modulaires (dashboard, logs, team, monitors)
├── hooks/                      # Hooks React Query personnalisés (use-analytics, use-endpoints, etc.)
├── lib/                        # Utilitaires de sécurité & core (auth, ssrf-guard, csrf-guard, team-context)
├── services/                   # Couche métier isolée (monitoring, analytics, incident, team, webhook)
├── prisma/                     # Schéma déclaratif (schema.prisma) et 9 migrations versionnées
│   └── migrations/             # Historique officiel PostgreSQL
├── scripts/                    # Scripts de qualification d'intégration
├── Dockerfile                  # Build multi-stage optimisé (Node 24 Alpine Standalone)
├── docker-compose.yml          # Orchestration multi-conteneurs Next.js + PostgreSQL 17
├── docker-entrypoint.sh        # Point d'entrée conteneur avec auto-migration Prisma
└── .env.example                # Modèle complet et documenté des variables d'environnement
```

---

## 📄 Licence

Ce projet est sous licence MIT.
