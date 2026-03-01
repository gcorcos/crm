export type Role = 'ADMIN' | 'MANAGER' | 'SALES' | 'READONLY'
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'EMAIL' | 'SOCIAL' | 'EVENT' | 'OTHER'
export type OpportunityStage = 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST'
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE'
export type ActivityStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type ContractStatus = 'DRAFT' | 'REVIEW' | 'SIGNED' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  isActive?: boolean
  createdAt?: string
}

export interface Lead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  source: LeadSource
  status: LeadStatus
  score: number
  notes?: string
  convertedAt?: string
  ownerId: string
  owner?: Pick<User, 'id' | 'firstName' | 'lastName'>
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  name: string
  industry?: string
  size?: string
  website?: string
  address?: string
  city?: string
  country?: string
  notes?: string
  ownerId: string
  owner?: Pick<User, 'id' | 'firstName' | 'lastName'>
  _count?: { contacts: number; opportunities: number }
  createdAt: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  title?: string
  role?: string
  accountId: string
  account?: Pick<Account, 'id' | 'name'>
  ownerId: string
  owner?: Pick<User, 'id' | 'firstName' | 'lastName'>
  createdAt: string
}

export interface Opportunity {
  id: string
  name: string
  amount: number
  currency: string
  stage: OpportunityStage
  probability: number
  closeDate: string
  lostReason?: string
  notes?: string
  accountId: string
  account?: Pick<Account, 'id' | 'name'>
  contactId?: string
  contact?: Pick<Contact, 'id' | 'firstName' | 'lastName'>
  ownerId: string
  owner?: Pick<User, 'id' | 'firstName' | 'lastName'>
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  type: ActivityType
  subject: string
  description?: string
  status: ActivityStatus
  dueDate?: string
  doneAt?: string
  relatedType: string
  relatedId: string
  ownerId: string
  owner?: Pick<User, 'id' | 'firstName' | 'lastName'>
  createdAt: string
}

export interface Contract {
  id: string
  number: string
  amount: number
  status: ContractStatus
  startDate?: string
  endDate?: string
  signedAt?: string
  notes?: string
  accountId: string
  account?: Pick<Account, 'id' | 'name'>
  opportunityId?: string
  ownerId: string
  owner?: Pick<User, 'id' | 'firstName' | 'lastName'>
  createdAt: string
}

export interface Order {
  id: string
  number: string
  totalAmount: number
  status: OrderStatus
  orderDate: string
  notes?: string
  accountId: string
  account?: Pick<Account, 'id' | 'name'>
  contractId?: string
  contract?: Pick<Contract, 'id' | 'number'>
  ownerId: string
  owner?: Pick<User, 'id' | 'firstName' | 'lastName'>
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface KpiData {
  pipeline: {
    total: number
    weighted: number
    byStage: { stage: string; count: number; amount: number }[]
  }
  revenue: { thisMonth: number; thisYear: number }
  conversion: { leadsTotal: number; leadsConverted: number; rate: number }
  activities: { overdue: number; today: number; thisWeek: number }
}
