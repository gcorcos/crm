import { api } from './client'
import type { PaginatedResponse, Lead, Account, Contact, Opportunity, Activity, Contract, Order, KpiData } from '../types'

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
}

// Profile (current user)
export const profileApi = {
  updateMe: (data: object) => api.patch('/users/me', data).then((r) => r.data),
  changePassword: (data: object) => api.patch('/users/me/password', data).then((r) => r.data),
}

// Users
export const usersApi = {
  list: () => api.get('/users').then((r) => r.data),
  create: (data: object) => api.post('/users', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch(`/users/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/users/${id}`),
}

// Leads
export const leadsApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Lead>>('/leads', { params }).then((r) => r.data),
  get: (id: string) => api.get<Lead>(`/leads/${id}`).then((r) => r.data),
  create: (data: object) => api.post<Lead>('/leads', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch<Lead>(`/leads/${id}`, data).then((r) => r.data),
  convert: (id: string, data: object) => api.post(`/leads/${id}/convert`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/leads/${id}`),
}

// Accounts
export const accountsApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Account>>('/accounts', { params }).then((r) => r.data),
  get: (id: string) => api.get<Account>(`/accounts/${id}`).then((r) => r.data),
  create: (data: object) => api.post<Account>('/accounts', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch<Account>(`/accounts/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/accounts/${id}`),
}

// Contacts
export const contactsApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Contact>>('/contacts', { params }).then((r) => r.data),
  get: (id: string) => api.get<Contact>(`/contacts/${id}`).then((r) => r.data),
  create: (data: object) => api.post<Contact>('/contacts', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch<Contact>(`/contacts/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/contacts/${id}`),
}

// Opportunities
export const opportunitiesApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Opportunity>>('/opportunities', { params }).then((r) => r.data),
  get: (id: string) => api.get<Opportunity>(`/opportunities/${id}`).then((r) => r.data),
  create: (data: object) => api.post<Opportunity>('/opportunities', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch<Opportunity>(`/opportunities/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/opportunities/${id}`),
  createContract: (id: string, data: object) => api.post<Contract>(`/opportunities/${id}/contract`, data).then((r) => r.data),
}

// Activities
export const activitiesApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Activity>>('/activities', { params }).then((r) => r.data),
  get: (id: string) => api.get<Activity>(`/activities/${id}`).then((r) => r.data),
  create: (data: object) => api.post<Activity>('/activities', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch<Activity>(`/activities/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/activities/${id}`),
}

// Contracts
export const contractsApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Contract>>('/contracts', { params }).then((r) => r.data),
  get: (id: string) => api.get<Contract>(`/contracts/${id}`).then((r) => r.data),
  create: (data: object) => api.post<Contract>('/contracts', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch<Contract>(`/contracts/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/contracts/${id}`),
}

// Orders
export const ordersApi = {
  list: (params?: object) =>
    api.get<PaginatedResponse<Order>>('/orders', { params }).then((r) => r.data),
  get: (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  create: (data: object) => api.post<Order>('/orders', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch<Order>(`/orders/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/orders/${id}`),
}

// Reports
export const reportsApi = {
  list: () => api.get('/reports').then((r) => r.data),
  create: (data: object) => api.post('/reports', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch(`/reports/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/reports/${id}`),
  revenue: (params: object) => api.get('/reports/revenue', { params }).then((r) => r.data),
}

// Organizations
export const orgApi = {
  list: () => api.get('/organizations').then((r) => r.data as { id: string; name: string; slug: string; _count: { users: number } }[]),
  me: () => api.get('/organizations/me').then((r) => r.data as { id: string; name: string } | null),
  create: (data: object) => api.post('/organizations', data).then((r) => r.data),
  update: (id: string, data: object) => api.patch(`/organizations/${id}`, data).then((r) => r.data),
  assign: (orgId: string, userId: string) => api.post(`/organizations/${orgId}/assign`, { userId }).then((r) => r.data),
}

// Audit Log
export const auditApi = {
  list: (params?: object) => api.get('/audit-log', { params }).then((r) => r.data as {
    data: {
      id: string; entity: string; entityId: string; action: string
      before: unknown; after: unknown
      user: { id: string; firstName: string; lastName: string } | null
      createdAt: string
    }[]
    total: number; page: number; limit: number
  }),
}

// Search
export const searchApi = {
  search: (q: string) => api.get('/search', { params: { q } }).then((r) => r.data as {
    leads: { id: string; firstName: string; lastName: string; email: string; company: string | null; status: string }[]
    accounts: { id: string; name: string; industry: string | null }[]
    contacts: { id: string; firstName: string; lastName: string; email: string }[]
    opportunities: { id: string; name: string; stage: string; amount: unknown; account: { name: string } | null }[]
  }),
}

// Dashboard
export const dashboardApi = {
  kpi: () => api.get<KpiData>('/dashboard/kpi').then((r) => r.data),
  pipeline: () => api.get('/dashboard/pipeline').then((r) => r.data),
  expiringContracts: () => api.get<Contract[]>('/dashboard/expiring-contracts').then((r) => r.data),
  leadSources: () => api.get<{ source: string; count: number }[]>('/dashboard/lead-sources').then((r) => r.data),
  monthlyRevenue: (year: number) => api.get('/dashboard/monthly-revenue', { params: { year } }).then((r) => r.data),
}
