# CRM — Guide de démarrage rapide

## Prérequis
- Node.js 20+
- Docker + Docker Compose (pour PostgreSQL)
- npm

## Démarrage en développement

### 1. Base de données (PostgreSQL via Docker)
```bash
docker compose up postgres -d
```

### 2. Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
npm run dev
```
API disponible sur http://localhost:4000

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App disponible sur http://localhost:5173

## Comptes de démonstration
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@crm.dev | Admin1234! | Admin |
| manager@crm.dev | Sales1234! | Manager |
| sales@crm.dev | Sales1234! | Sales |

## Stack
- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query + Zustand
- **Backend** : Node.js + Express + TypeScript + Prisma ORM
- **Base de données** : PostgreSQL 16
- **Auth** : JWT (access 15min + refresh 7j)

## Structure
```
CRM/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Schéma BDD (9 entités)
│   │   └── seed.ts            # Données de démo
│   └── src/
│       ├── index.ts           # Serveur Express
│       ├── lib/               # prisma, jwt
│       ├── middleware/        # auth, permissions
│       └── routes/            # 9 modules REST
└── frontend/
    └── src/
        ├── api/               # Clients API
        ├── store/             # Zustand (auth)
        ├── types/             # TypeScript types
        ├── components/        # Layout, UI
        └── pages/             # 9 modules
```

## Déploiement complet (Docker)
```bash
docker compose up --build -d
```
