# CRM — Spécification Produit & Backlog MVP

> Architecte produit + Tech Lead · Date : 2026-02-28

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
TENANT (multitenant optionnel)
  └── USER (role: admin | manager | sales | readonly)

USER ──< LEAD
  Lead: id, prenom, nom, email, telephone, societe, source, statut, score, owner_id, created_at

LEAD ──> ACCOUNT (conversion)
LEAD ──> CONTACT (conversion)
LEAD ──> OPPORTUNITY (conversion)

ACCOUNT
  Account: id, nom, secteur, taille, site_web, adresse, owner_id, created_at

ACCOUNT ──< CONTACT
ACCOUNT ──< OPPORTUNITY
ACCOUNT ──< CONTRACT
ACCOUNT ──< ORDER

CONTACT
  Contact: id, prenom, nom, email, telephone, poste, account_id, owner_id

OPPORTUNITY
  Opportunity: id, nom, montant, devise, etape, probabilite, date_cloture,
               account_id, contact_id, owner_id, created_at

OPPORTUNITY ──< ACTIVITY
OPPORTUNITY ──> CONTRACT (gagné)
CONTRACT ──> ORDER

CONTRACT
  Contract: id, numero, montant, statut, date_debut, date_fin,
            account_id, opportunity_id, signe_le, owner_id

ORDER
  Order: id, numero, montant_total, statut, date_commande,
         contract_id, account_id, owner_id

ACTIVITY (Tasks/Activités)
  Activity: id, type (appel|email|réunion|tâche), sujet, description,
            statut, due_date, done_at, owner_id,
            related_type (lead|opportunity|contact|account), related_id

REPORT
  Report: id, nom, type, filtres (JSON), colonnes (JSON), owner_id, shared

DASHBOARD
  Dashboard: id, nom, widgets (JSON), owner_id
```

---

## 3. Règles Métier par Module

### 3.1 Leads
| Règle | Détail |
|-------|--------|
| Statuts | `Nouveau → Contacté → Qualifié → Converti / Perdu` |
| Conversion | Crée automatiquement Account + Contact + Opportunity |
| Score | 0–100, calculé sur : email renseigné (+20), tél (+15), société (+15), activité récente (+50) |
| Dédoublonnage | Alerte si email déjà existant |
| Owner | Obligatoire — assigné à soi-même par défaut |

### 3.2 Opportunités
| Règle | Détail |
|-------|--------|
| Étapes (pipeline) | `Prospection → Qualification → Proposition → Négociation → Gagné / Perdu` |
| Probabilité | Liée à l'étape (0/20/40/60/80/100 %) — modifiable manuellement |
| Montant | Obligatoire, > 0 |
| Date clôture | Obligatoire |
| Transition Gagné | Déclenche la création d'un Contrat (optionnel) |
| Transition Perdu | Motif obligatoire |

### 3.3 Comptes
| Règle | Détail |
|-------|--------|
| Nom | Unique par tenant |
| Secteur | Liste fermée (Tech, Finance, Santé, Retail, Industrie, Autre) |
| Suppression | Bloquée si Contacts ou Opportunités actives rattachées |

### 3.4 Contacts
| Règle | Détail |
|-------|--------|
| Email | Unique par compte |
| Account | Obligatoire |
| Rôle décisionnel | Champ optionnel (Décideur, Influenceur, Utilisateur) |

### 3.5 Tâches / Activités
| Règle | Détail |
|-------|--------|
| Statuts | `À faire → En cours → Terminé / Annulé` |
| Due date | Alerte si dépassée et non terminée |
| Liaison | Toujours liée à 1 entité (lead, opp, contact, compte) |
| Rappel | Email J-1 + le jour J (v1) |

### 3.6 Contrats
| Règle | Détail |
|-------|--------|
| Statuts | `Brouillon → En révision → Signé → Actif → Expiré / Résilié` |
| Date fin | Alerte 30 jours avant expiration |
| Numéro | Auto-incrémenté (CTR-YYYY-XXXX) |

### 3.7 Commandes
| Règle | Détail |
|-------|--------|
| Statuts | `En attente → Confirmée → En cours → Livrée → Annulée` |
| Numéro | Auto-incrémenté (CMD-YYYY-XXXX) |
| Lien contrat | Optionnel |

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
| Exporter | ✅ | ✅ | ✅ | ❌ |
| Configurer dashboards | ✅ | ✅ | perso | ❌ |

---

## 5. KPI Dashboard

### Pipeline
- Valeur totale pipeline (somme montants opps ouvertes)
- Valeur pondérée (montant × probabilité)
- Nombre d'opps par étape (Kanban counts)
- Velocity : durée moyenne par étape

### Conversion
- Taux Lead → Opp (nb convertis / nb créés)
- Taux Opp → Gagné (nb gagnés / nb fermés)
- Motifs de perte (top 5)

### Chiffre d'Affaires
- CA signé (mois en cours / trimestre / année)
- CA prévisionnel (opps Négociation + Proposition)
- CA par commercial

### Activités
- Activités du jour / semaine par commercial
- Taux de complétion des tâches
- Activités en retard

---

## 6. Backlog MVP — Sprint 1 & 2 (2 semaines)

### Sprint 1 (Sem 1) — Fondations
| # | User Story | Priorité |
|---|-----------|---------|
| US-01 | En tant qu'Admin, je peux créer/inviter des utilisateurs et leur assigner un rôle | Must |
| US-02 | En tant qu'utilisateur, je peux me connecter / déconnecter (JWT) | Must |
| US-03 | En tant que Sales, je peux créer et lister des Leads | Must |
| US-04 | En tant que Sales, je peux modifier le statut d'un Lead | Must |
| US-05 | En tant que Sales, je peux créer et lister des Comptes | Must |
| US-06 | En tant que Sales, je peux créer et lister des Contacts liés à un Compte | Must |
| US-07 | En tant que Sales, je peux créer une Opportunité et la visualiser en liste | Must |
| US-08 | En tant que Sales, je vois le Kanban des Opportunités par étape | Must |

### Sprint 2 (Sem 2) — Cœur métier
| # | User Story | Priorité |
|---|-----------|---------|
| US-09 | En tant que Sales, je peux convertir un Lead en Compte + Contact + Opportunité | Must |
| US-10 | En tant que Sales, je peux créer et gérer des Tâches/Activités liées à une entité | Must |
| US-11 | En tant que Sales, je vois un Dashboard avec les KPI principaux (pipeline, CA, activités) | Must |
| US-12 | En tant que Manager, je vois les données de mon équipe | Must |
| US-13 | En tant qu'utilisateur, je peux filtrer et rechercher dans toutes les listes | Should |
| US-14 | En tant qu'Admin, je peux configurer les champs obligatoires | Could |

---

## 7. Backlog V1 — Semaines 3–6

### Semaine 3 — Contrats & Commandes
- US-15 : Créer / signer un Contrat depuis une Opportunité gagnée
- US-16 : Créer une Commande liée à un Contrat
- US-17 : Workflow statuts Contrat + alertes expiration

### Semaine 4 — Rapports & Export
- US-18 : Générateur de rapports (filtres, colonnes, tri)
- US-19 : Export CSV / Excel des listes et rapports
- US-20 : Rapport CA par période et par commercial

### Semaine 5 — UX & Notifications
- US-21 : Rappels email sur tâches (J-1, J0)
- US-22 : Alertes contrats expirant dans 30 jours
- US-23 : Vue Timeline des activités sur une fiche
- US-24 : Recherche globale (tous modules)

### Semaine 6 — Qualité & Options
- US-25 : i18n FR / EN (bascule langue utilisateur)
- US-26 : Multitenant (isolation données par organisation)
- US-27 : Audit log (qui a modifié quoi, quand)
- US-28 : API REST documentée (Swagger/OpenAPI)

---

## 8. Stack Technique Recommandée

| Couche | Choix |
|--------|-------|
| Frontend | React + TypeScript + Tailwind CSS + shadcn/ui |
| État | Zustand + React Query (TanStack) |
| Backend | Node.js + Express (ou Fastify) + TypeScript |
| ORM | Prisma |
| Base de données | PostgreSQL |
| Auth | JWT + refresh token / ou NextAuth si Next.js |
| Tests | Vitest + Playwright (e2e) |
| Déploiement | Docker + Railway / Render / VPS |

---

## 9. UX Patterns (inspiration Salesforce simplifié)

- **Liste** : tableau paginé + filtres + tri colonnes + actions bulk
- **Fiche** : layout 2 colonnes (infos gauche, activités/timeline droite)
- **Pipeline Kanban** : colonnes par étape, drag & drop, badge montant
- **Navigation** : sidebar fixe avec icônes modules
- **Notifications** : bandeau top + badge cloche
