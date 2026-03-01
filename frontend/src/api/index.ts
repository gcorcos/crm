import { api } from './client'
import type { PaginatedResponse, Lead, Account, Contact, Opportunity, Activity, Contract, Order, KpiData } from '../types'

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
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

// Dashboard
export const dashboardApi = {
  kpi: () => api.get<KpiData>('/dashboard/kpi').then((r) => r.data),
  pipeline: () => api.get('/dashboard/pipeline').then((r) => r.data),
}
