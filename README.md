# CRM

CRM web inspiré Salesforce, simplifié. Gestion complète du cycle commercial : Leads → Opportunités → Contrats → Commandes.

## Démo live (Railway)

| Service | URL |
|---------|-----|
| Frontend | https://crm-frontend-production-xxxx.up.railway.app |
| API | https://crm-backend-production-1aca.up.railway.app |
| Swagger | https://crm-backend-production-1aca.up.railway.app/api/docs |

### Comptes de démonstration
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@crm.dev | Admin1234! | Admin |
| manager@crm.dev | Sales1234! | Manager |
| sales@crm.dev | Sales1234! | Sales |

---

## Stack

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| État | Zustand (auth) + TanStack React Query |
| Charts | Recharts |
| i18n | i18next (FR / EN) |
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Prisma 5 |
| Base de données | PostgreSQL 16 |
| Auth | JWT access (15min) + refresh token (7j) |
| Email / Cron | Nodemailer + node-cron |
| Déploiement | Docker multi-stage + Railway |

---

## Fonctionnalités

- **Leads** : CRUD, scoring, conversion → Compte + Contact + Opportunité
- **Opportunités** : vue liste + Kanban par étape, création de contrat depuis une opp gagnée
- **Comptes & Contacts** : fiches détaillées avec timeline d'activités
- **Activités** : CALL, EMAIL, MEETING, TASK, NOTE liées à toute entité
- **Contrats & Commandes** : workflow statuts, alertes expiration 30j
- **Dashboard** : KPIs pipeline, CA mensuel, sources leads, graphiques Recharts
- **Rapports** : générateur filtres/colonnes, rapport CA par commercial, export CSV
- **Recherche globale** : Leads, Comptes, Contacts, Opportunités
- **Audit log** : historique de toutes les modifications
- **Multitenant** : isolation données par organisation
- **i18n** : bascule FR / EN

---

## Démarrage en développement

### Prérequis
- Node.js 20+
- Docker + Docker Compose

### 1. Base de données
```bash
docker compose up postgres -d
```

### 2. Backend
```bash
cd backend
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```
API sur http://localhost:4000 · Swagger sur http://localhost:4000/api/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App sur http://localhost:5173

---

## Déploiement Docker complet
```bash
docker compose up --build -d
```

---

## Structure du projet

```
CRM/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Schéma BDD (10 entités)
│   │   └── seed.ts              # 3 utilisateurs de démo
│   ├── src/
│   │   ├── index.ts             # Serveur Express + CORS + Morgan
│   │   ├── lib/                 # prisma, jwt, mailer, audit
│   │   ├── middleware/          # authenticate, requireRole
│   │   ├── routes/              # auth, users, leads, accounts, contacts,
│   │   │                        # opportunities, activities, contracts, orders,
│   │   │                        # dashboard, reports, search, audit, organizations
│   │   └── jobs/                # Cron notifications (J-1, J0, expiration)
│   ├── Dockerfile
│   └── railway.json
│
└── frontend/
    ├── public/
    │   └── config.js            # window.__API_URL__ (injecté à runtime)
    ├── src/
    │   ├── api/                 # client axios + tous les appels API
    │   ├── store/               # Zustand auth store
    │   ├── components/          # Layout, Sidebar, GlobalSearch, UI (Modal, Badge…)
    │   ├── i18n/                # locales/fr.json + en.json
    │   └── pages/               # Dashboard, Leads, Accounts, Contacts,
    │                            # Opportunities, Activities, Contracts, Orders,
    │                            # Users, Reports, AuditLog, Profile
    ├── Dockerfile
    ├── nginx.conf
    └── docker-entrypoint.sh     # Génère config.js avec BACKEND_URL au démarrage
```

---

## Variables d'environnement

### Backend
| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/crm` |
| `JWT_SECRET` | Secret tokens d'accès | chaîne aléatoire 32+ chars |
| `JWT_REFRESH_SECRET` | Secret refresh tokens | chaîne aléatoire 32+ chars |
| `JWT_EXPIRES_IN` | Durée access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Durée refresh token | `7d` |
| `FRONTEND_URL` | URL du frontend (CORS) | `https://crm-frontend-xxx.up.railway.app` |
| `PORT` | Port d'écoute | `4000` (auto Railway) |
| `SMTP_HOST` | Serveur SMTP (optionnel) | `smtp.gmail.com` |
| `SMTP_USER` | Identifiant SMTP | |
| `SMTP_PASS` | Mot de passe SMTP | |

### Frontend
| Variable | Description | Exemple |
|----------|-------------|---------|
| `BACKEND_URL` | URL de l'API backend | `https://crm-backend-xxx.up.railway.app/api` |
