import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LeadsList from './pages/Leads/LeadsList'
import AccountsList from './pages/Accounts/AccountsList'
import ContactsList from './pages/Contacts/ContactsList'
import OpportunitiesPage from './pages/Opportunities/OpportunitiesPage'
import ActivitiesList from './pages/Activities/ActivitiesList'
import ContractsList from './pages/Contracts/ContractsList'
import OrdersList from './pages/Orders/OrdersList'

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
          <Route path="accounts" element={<AccountsList />} />
          <Route path="contacts" element={<ContactsList />} />
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="activities" element={<ActivitiesList />} />
          <Route path="contracts" element={<ContractsList />} />
          <Route path="orders" element={<OrdersList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
