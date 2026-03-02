export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'CRM API',
    version: '1.0.0',
    description: 'API REST du CRM — Leads, Comptes, Contacts, Opportunités, Activités, Contrats, Commandes',
  },
  servers: [{ url: '/api', description: 'API principale' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: {} },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
      Lead: {
        type: 'object',
        properties: {
          id: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' },
          email: { type: 'string', format: 'email' }, phone: { type: 'string', nullable: true },
          company: { type: 'string', nullable: true },
          source: { type: 'string', enum: ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'SOCIAL', 'EVENT', 'OTHER'] },
          status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Account: {
        type: 'object',
        properties: {
          id: { type: 'string' }, name: { type: 'string' },
          industry: { type: 'string', nullable: true }, size: { type: 'string', nullable: true },
          website: { type: 'string', nullable: true }, city: { type: 'string', nullable: true },
          country: { type: 'string', nullable: true },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' },
          email: { type: 'string' }, phone: { type: 'string', nullable: true },
          title: { type: 'string', nullable: true }, accountId: { type: 'string' },
        },
      },
      Opportunity: {
        type: 'object',
        properties: {
          id: { type: 'string' }, name: { type: 'string' },
          amount: { type: 'number' },
          stage: { type: 'string', enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
          probability: { type: 'integer', minimum: 0, maximum: 100 },
          closeDate: { type: 'string', format: 'date-time' }, accountId: { type: 'string' },
        },
      },
      Activity: {
        type: 'object',
        properties: {
          id: { type: 'string' }, type: { type: 'string', enum: ['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE'] },
          subject: { type: 'string' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          relatedType: { type: 'string', enum: ['LEAD', 'OPPORTUNITY', 'CONTACT', 'ACCOUNT'] },
          relatedId: { type: 'string' },
        },
      },
      Contract: {
        type: 'object',
        properties: {
          id: { type: 'string' }, number: { type: 'string' }, amount: { type: 'number' },
          status: { type: 'string', enum: ['DRAFT', 'REVIEW', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED'] },
          startDate: { type: 'string', format: 'date', nullable: true },
          endDate: { type: 'string', format: 'date', nullable: true },
          accountId: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Connexion utilisateur', security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authentifié',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' }, refreshToken: { type: 'string' },
                    user: { $ref: '#/components/schemas/Contact' },
                  },
                },
              },
            },
          },
          401: { description: 'Identifiants invalides', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'], summary: 'Renouveler le token', security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Nouveau token', content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' } } } } } },
        },
      },
    },
    '/leads': {
      get: {
        tags: ['Leads'], summary: 'Lister les leads',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] } },
        ],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } },
      },
      post: {
        tags: ['Leads'], summary: 'Créer un lead',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['firstName', 'lastName', 'email'],
                properties: {
                  firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' },
                  phone: { type: 'string' }, company: { type: 'string' }, source: { type: 'string' }, notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Lead' } } } },
          409: { description: 'Email déjà existant' },
        },
      },
    },
    '/leads/{id}': {
      get: {
        tags: ['Leads'], summary: 'Détail d\'un lead',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Lead' } } } }, 404: { description: 'Non trouvé' } },
      },
      patch: {
        tags: ['Leads'], summary: 'Modifier un lead',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Lead' } } } },
        responses: { 200: { description: 'Modifié' } },
      },
      delete: {
        tags: ['Leads'], summary: 'Supprimer un lead',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Supprimé' } },
      },
    },
    '/leads/{id}/convert': {
      post: {
        tags: ['Leads'], summary: 'Convertir un lead en Compte + Contact + Opportunité',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { opportunityName: { type: 'string' }, amount: { type: 'number' }, closeDate: { type: 'string', format: 'date' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Converti' }, 400: { description: 'Déjà converti' } },
      },
    },
    '/accounts': {
      get: { tags: ['Comptes'], summary: 'Lister les comptes', parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Comptes'], summary: 'Créer un compte', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Account' } } } }, responses: { 201: { description: 'Créé' }, 409: { description: 'Nom déjà existant' } } },
    },
    '/contacts': {
      get: { tags: ['Contacts'], summary: 'Lister les contacts', parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'accountId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Contacts'], summary: 'Créer un contact', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Contact' } } } }, responses: { 201: { description: 'Créé' } } },
    },
    '/opportunities': {
      get: { tags: ['Opportunités'], summary: 'Lister les opportunités', parameters: [{ name: 'stage', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Opportunités'], summary: 'Créer une opportunité', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Opportunity' } } } }, responses: { 201: { description: 'Créée' } } },
    },
    '/opportunities/{id}/contract': {
      post: {
        tags: ['Opportunités'], summary: 'Créer un contrat depuis une opportunité gagnée',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Contrat créé' }, 400: { description: 'Opp non gagnée' }, 409: { description: 'Contrat déjà existant' } },
      },
    },
    '/activities': {
      get: { tags: ['Activités'], summary: 'Lister les activités', parameters: [{ name: 'relatedType', in: 'query', schema: { type: 'string' } }, { name: 'relatedId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Activités'], summary: 'Créer une activité', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } } }, responses: { 201: { description: 'Créée' } } },
    },
    '/contracts': {
      get: { tags: ['Contrats'], summary: 'Lister les contrats', parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Contrats'], summary: 'Créer un contrat', responses: { 201: { description: 'Créé' } } },
    },
    '/orders': {
      get: { tags: ['Commandes'], summary: 'Lister les commandes', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Commandes'], summary: 'Créer une commande', responses: { 201: { description: 'Créée' } } },
    },
    '/search': {
      get: {
        tags: ['Recherche'], summary: 'Recherche globale (leads, comptes, contacts, opportunités)',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2 } }],
        responses: {
          200: {
            description: 'Résultats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    leads: { type: 'array', items: {} }, accounts: { type: 'array', items: {} },
                    contacts: { type: 'array', items: {} }, opportunities: { type: 'array', items: {} },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/audit-log': {
      get: {
        tags: ['Audit'], summary: 'Journal d\'audit (Admin/Manager)',
        parameters: [
          { name: 'entity', in: 'query', schema: { type: 'string', enum: ['Lead', 'Account', 'Contact', 'Opportunity', 'Contract', 'Order'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'OK' }, 403: { description: 'Permission insuffisante' } },
      },
    },
    '/dashboard/kpi': {
      get: { tags: ['Dashboard'], summary: 'KPI principaux', responses: { 200: { description: 'OK' } } },
    },
    '/dashboard/pipeline': {
      get: { tags: ['Dashboard'], summary: 'Pipeline Kanban par étape', responses: { 200: { description: 'OK' } } },
    },
    '/reports/revenue': {
      get: {
        tags: ['Rapports'], summary: 'Rapport CA par commercial et période',
        parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['month', 'quarter'], default: 'month' } }, { name: 'year', in: 'query', schema: { type: 'integer' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
}
