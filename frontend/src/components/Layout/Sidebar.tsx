import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Contact, Target,
  CheckSquare, FileText, ShoppingCart, LogOut, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: TrendingUp },
  { to: '/accounts', label: 'Comptes', icon: Building2 },
  { to: '/contacts', label: 'Contacts', icon: Contact },
  { to: '/opportunities', label: 'Opportunités', icon: Target },
  { to: '/activities', label: 'Activités', icon: CheckSquare },
  { to: '/contracts', label: 'Contrats', icon: FileText },
  { to: '/orders', label: 'Commandes', icon: ShoppingCart },
]

const adminNav = [
  { to: '/users', label: 'Utilisateurs', icon: Users },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64 fixed inset-y-0 left-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">C</div>
        <span className="font-semibold text-lg">CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <>
            <div className="pt-3 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</div>
            {adminNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
