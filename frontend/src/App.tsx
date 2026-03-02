import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LeadsList from './pages/Leads/LeadsList'
import LeadDetail from './pages/Leads/LeadDetail'
import AccountsList from './pages/Accounts/AccountsList'
import ContactsList from './pages/Contacts/ContactsList'
import OpportunitiesPage from './pages/Opportunities/OpportunitiesPage'
import OpportunityDetail from './pages/Opportunities/OpportunityDetail'
import ActivitiesList from './pages/Activities/ActivitiesList'
import ContractsList from './pages/Contracts/ContractsList'
import OrdersList from './pages/Orders/OrdersList'
import UsersList from './pages/Users/UsersList'
import ReportsPage from './pages/Reports/ReportsPage'
import AuditLogPage from './pages/AuditLog/AuditLogPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<LeadsList />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="accounts" element={<AccountsList />} />
          <Route path="contacts" element={<ContactsList />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="opportunities/:id" element={<OpportunityDetail />} />
          <Route path="activities" element={<ActivitiesList />} />
          <Route path="contracts" element={<ContractsList />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="users" element={<UsersList />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
