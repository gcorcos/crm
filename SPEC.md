# CRM — Spécification Produit & Backlog

> Architecte produit + Tech Lead · Créé : 2026-02-28 · Mis à jour : 2026-03-09

---

## 1. Résumé Produit

### Cibles
| Segment | Profil | Taille |
|---------|--------|--------|
| PME / ETI | Équipe commerciale 5–50 personnes | Principal |
| Startups B2B | Sales solo ou petite équipe | Secondaire |
| Indépendants | Freelance / consultant | Tertiaire |

### Parcours principaux
1. **Prospection** : Création Lead → Qualification → Conversion Compte + Contact + Opportunité
2. **Vente** : Opportunité Kanban → Suivi activités → Génération Contrat → Commande
3. **Pilotage** : Dashboard pipeline → Rapports CA → KPI équipe

---

## 2. Entités & Relations (ERD Texte)

```
ORGANIZATION (multitenant)
  └── USER (role: ADMIN | MANAGER | SALES | READONLY)

USER ──< LEAD
  Lead: id, firstName, lastName, email, phone, company, source, status, score,
        notes, ownerId, organizationId, createdAt

LEAD ──> ACCOUNT (conversion)
LEAD ──> CONTACT (conversion)
LEAD ──> OPPORTUNITY (conversion)

ACCOUNT
  Account: id, name, industry, size, website, address, city, country,
           notes, ownerId, organizationId, createdAt

ACCOUNT ──< CONTACT
ACCOUNT ──< OPPORTUNITY
ACCOUNT ──< CONTRACT
ACCOUNT ──< ORDER

CONTACT
  Contact: id, firstName, lastName, email, phone, title, role,
           accountId, ownerId, organizationId

OPPORTUNITY
  Opportunity: id, name, amount, currency, stage, probability, closeDate,
               lostReason, notes, accountId, contactId, ownerId, createdAt

OPPORTUNITY ──< ACTIVITY
OPPORTUNITY ──> CONTRACT (gagné)
CONTRACT ──> ORDER

CONTRACT
  Contract: id, number (CTR-YYYY-XXXX), amount, status, startDate, endDate,
            notes, accountId, opportunityId, ownerId, createdAt

ORDER
  Order: id, number (CMD-YYYY-XXXX), totalAmount, status, orderDate,
         notes, contractId, accountId, ownerId

ACTIVITY
  Activity: id, type (CALL|EMAIL|MEETING|TASK|NOTE), subject, description,
            status (TODO|IN_PROGRESS|DONE|CANCELLED), dueDate, doneAt,
            ownerId, relatedType (LEAD|OPPORTUNITY|CONTACT|ACCOUNT), relatedId,
            leadId?, opportunityId?, contactId?, accountId?

REPORT
  Report: id, name, type, filters (JSON), columns (JSON), shared, ownerId

AUDIT_LOG
  AuditLog: id, entity, entityId, action, before (JSON), after (JSON), userId, createdAt
```

---

## 3. Règles Métier par Module

### 3.1 Leads
| Règle | Détail | Statut |
|-------|--------|--------|
| Statuts | `NEW → CONTACTED → QUALIFIED → CONVERTED / LOST` | ✅ |
| Conversion | Crée automatiquement Account + Contact + Opportunity | ✅ |
| Score | 0–100 (email +20, tél +15, société +15, activité récente +50) | ✅ |
| Dédoublonnage | Alerte si email déjà existant | ✅ |
| Owner | Obligatoire — assigné à soi-même par défaut | ✅ |

### 3.2 Opportunités
| Règle | Détail | Statut |
|-------|--------|--------|
| Étapes | `PROSPECTING → QUALIFICATION → PROPOSAL → NEGOTIATION → WON / LOST` | ✅ |
| Probabilité | Liée à l'étape (10/20/40/60/100/0 %) — modifiable | ✅ |
| Montant | Obligatoire, > 0 | ✅ |
| Date clôture | Obligatoire | ✅ |
| Transition Gagné | Bouton "Créer contrat" disponible | ✅ |
| Transition Perdu | Motif obligatoire | ✅ |

### 3.3 Comptes
| Règle | Détail | Statut |
|-------|--------|--------|
| Nom | Unique par tenant | ✅ |
| Secteur | Tech, Finance, Santé, Retail, Industrie, Autre | ✅ |
| Suppression | Bloquée si Contacts ou Opportunités rattachées | ✅ |
| Fiche | Contacts, Opportunités, Contrats, Commandes liés | ✅ |

### 3.4 Contacts
| Règle | Détail | Statut |
|-------|--------|--------|
| Email | Unique par compte | ✅ |
| Account | Obligatoire | ✅ |
| Rôle décisionnel | Décideur, Influenceur, Utilisateur (optionnel) | ✅ |

### 3.5 Tâches / Activités
| Règle | Détail | Statut |
|-------|--------|--------|
| Types | CALL, EMAIL, MEETING, TASK, NOTE | ✅ |
| Statuts | `TODO → IN_PROGRESS → DONE / CANCELLED` | ✅ |
| Due date | Alerte visuelle si dépassée et non terminée | ✅ |
| Liaison | Toujours liée à 1 entité (lead, opp, contact, compte) | ✅ |
| Rappel email | Cron J-1 et J0 via nodemailer | ✅ |

### 3.6 Contrats
| Règle | Détail | Statut |
|-------|--------|--------|
| Statuts | `DRAFT → REVIEW → SIGNED → ACTIVE → EXPIRED / TERMINATED` | ✅ |
| Date fin | Alerte 30 jours avant expiration (dashboard + cron) | ✅ |
| Numéro | Auto-incrémenté CTR-YYYY-XXXX | ✅ |

### 3.7 Commandes
| Règle | Détail | Statut |
|-------|--------|--------|
| Statuts | `PENDING → CONFIRMED → IN_PROGRESS → DELIVERED / CANCELLED` | ✅ |
| Numéro | Auto-incrémenté CMD-YYYY-XXXX | ✅ |
| Lien contrat | Optionnel | ✅ |

---

## 4. Rôles & Permissions

| Permission | Admin | Manager | Sales | ReadOnly |
|-----------|-------|---------|-------|----------|
| Voir tout | ✅ | ✅ équipe | ✅ soi | ✅ |
| Créer | ✅ | ✅ | ✅ | ❌ |
| Modifier tout | ✅ | ✅ équipe | ✅ soi | ❌ |
| Supprimer | ✅ | ✅ équipe | ❌ | ❌ |
| Gérer utilisateurs | ✅ | ❌ | ❌ | ❌ |
| Voir rapports | ✅ | ✅ | limité | ✅ |
| Exporter CSV | ✅ | ✅ | ✅ | ❌ |
| Configurer dashboards | ✅ | ✅ | perso | ❌ |

---

## 5. Dashboard & KPIs implémentés

### KPI Cards
- Pipeline total (somme montants opps ouvertes)
- Pipeline pondéré (montant × probabilité)
- CA ce mois / cette année (opps WON)
- Taux de conversion Leads (convertis / total)
- Activités en retard

### Graphiques (Recharts)
- **BarChart CA mensuel** : 6 derniers mois, données depuis `/api/dashboard/monthly-revenue`
- **PieChart sources leads** : répartition par source (`/api/dashboard/lead-sources`)
- **BarChart horizontal pipeline** : montant par étape (hors WON/LOST)

### Alertes
- Contrats expirant dans 30 jours (liste avec badge jours restants)

---

## 6. Backlog — Statut complet

### MVP Sprint 1 & 2
| # | User Story | Statut |
|---|-----------|--------|
| US-01 | Admin : créer/inviter utilisateurs + rôle | ✅ Livré |
| US-02 | Login / déconnexion JWT + refresh token | ✅ Livré |
| US-03 | Sales : créer et lister des Leads | ✅ Livré |
| US-04 | Sales : modifier le statut d'un Lead | ✅ Livré |
| US-05 | Sales : créer et lister des Comptes | ✅ Livré |
| US-06 | Sales : créer et lister des Contacts liés à un Compte | ✅ Livré |
| US-07 | Sales : créer une Opportunité + liste | ✅ Livré |
| US-08 | Sales : Kanban des Opportunités par étape | ✅ Livré |
| US-09 | Sales : convertir un Lead → Compte + Contact + Opportunité | ✅ Livré |
| US-10 | Sales : créer et gérer des Activités liées à une entité | ✅ Livré |
| US-11 | Dashboard KPI (pipeline, CA, activités, conversion) | ✅ Livré |
| US-12 | Manager : voir les données de son équipe | ✅ Livré |
| US-13 | Filtres + recherche dans toutes les listes | ✅ Livré |
| US-14 | Admin : configurer champs obligatoires | ⏭ Non livré (Could) |

### V1 — Contrats & Commandes
| # | User Story | Statut |
|---|-----------|--------|
| US-15 | Créer / signer un Contrat depuis une Opportunité gagnée | ✅ Livré |
| US-16 | Créer une Commande liée à un Contrat | ✅ Livré |
| US-17 | Workflow statuts Contrat + alertes expiration 30j | ✅ Livré |

### V1 — Rapports & Export
| # | User Story | Statut |
|---|-----------|--------|
| US-18 | Générateur de rapports (filtres, colonnes) | ✅ Livré |
| US-19 | Export CSV des listes et rapports | ✅ Livré |
| US-20 | Rapport CA par période et par commercial | ✅ Livré |

### V1 — UX & Notifications
| # | User Story | Statut |
|---|-----------|--------|
| US-21 | Rappels email sur tâches (J-1, J0) via cron | ✅ Livré |
| US-22 | Alertes contrats expirant dans 30 jours | ✅ Livré |
| US-23 | Timeline des activités sur chaque fiche | ✅ Livré |
| US-24 | Recherche globale (Leads, Comptes, Contacts, Opps) | ✅ Livré |

### V1 — Qualité & Options
| # | User Story | Statut |
|---|-----------|--------|
| US-25 | i18n FR / EN (bascule langue) | ✅ Livré |
| US-26 | Multitenant — isolation données par organisation | ✅ Livré |
| US-27 | Audit log (qui a modifié quoi, quand) | ✅ Livré |
| US-28 | API REST documentée Swagger / OpenAPI | ✅ Livré |

### V1 — UX Fiches & Profil
| # | User Story | Statut |
|---|-----------|--------|
| US-29 | Fiche Compte détaillée (contacts, opps, contrats, commandes, timeline) | ✅ Livré |
| US-30 | Fiche Contact détaillée (compte lié, opps, timeline) | ✅ Livré |
| US-31 | Profil utilisateur (modifier infos + changer mot de passe) | ✅ Livré |
| US-32 | Dashboard graphiques Recharts (CA mensuel, pipeline, sources) | ✅ Livré |

---

## 7. Stack Technique Réelle

| Couche | Choix retenu |
|--------|-------------|
| Frontend | React 18 + TypeScript + Tailwind CSS (custom design system) |
| État | Zustand (auth) + TanStack React Query (server state) |
| Routing | React Router v6 |
| Charts | Recharts |
| i18n | i18next + react-i18next |
| HTTP client | Axios + interceptors JWT refresh |
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Prisma 5 |
| Base de données | PostgreSQL 16 |
| Auth | JWT access (15min) + refresh token (7j) via jsonwebtoken |
| Email | Nodemailer (SMTP configurable) |
| Cron | node-cron (rappels J-1 et J0, alertes expiration) |
| Documentation | Swagger UI + swagger-jsdoc (`/api/docs`) |
| Déploiement | Docker multi-stage + Railway (3 services) |

---

## 8. Architecture de déploiement (Railway)

```
Railway Project
├── backend   — Node.js/Express   → https://crm-backend-production-xxxx.up.railway.app
│   ├── Dockerfile (node:20-alpine, multi-stage)
│   ├── CMD: prisma db push && tsx seed.ts && node dist/index.js
│   └── Vars: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL, PORT
│
├── frontend  — nginx/React SPA   → https://crm-frontend-production-xxxx.up.railway.app
│   ├── Dockerfile (node:20-alpine builder → nginx:alpine)
│   ├── docker-entrypoint.sh → génère /config.js avec window.__API_URL__
│   └── Vars: BACKEND_URL (= URL backend + /api)
│
└── postgresql — PostgreSQL 16    → connexion interne Railway
```

---

## 9. UX Patterns implémentés

- **Liste** : tableau paginé + barre de recherche + filtres par statut + export CSV
- **Fiche** : layout 2 colonnes (infos + métadonnées gauche, timeline activités droite)
- **Pipeline Kanban** : 4 colonnes (Prospection → Négociation), boutons de déplacement rapide
- **Navigation** : sidebar fixe 64px avec icônes + labels, badge rôle utilisateur
- **Recherche globale** : input dans header, dropdown résultats avec debounce 300ms
- **Alertes visuelles** : activités en retard (rouge), contrats expirant (orange), badges colorés

---

## 10. Prochaines étapes — V2

| # | Feature | Priorité |
|---|---------|---------|
| US-33 | Drag & drop natif sur le Kanban | Should |
| US-34 | Notifications in-app (badge cloche) | Should |
| US-35 | Export Excel (xlsx) en plus du CSV | Could |
| US-36 | Import CSV de Leads / Contacts | Could |
| US-37 | Dashboard personnalisable (widgets glissables) | Could |
| US-38 | Vue calendrier des activités | Could |
| US-39 | Signature électronique des contrats | Could |
| US-40 | API webhooks sortants | Could |
