import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Contact, Target,
  CheckSquare, FileText, ShoppingCart, LogOut, TrendingUp, BarChart2, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()

  const nav = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/leads', label: t('nav.leads'), icon: TrendingUp },
    { to: '/accounts', label: t('nav.accounts'), icon: Building2 },
    { to: '/contacts', label: t('nav.contacts'), icon: Contact },
    { to: '/opportunities', label: t('nav.opportunities'), icon: Target },
    { to: '/activities', label: t('nav.activities'), icon: CheckSquare },
    { to: '/contracts', label: t('nav.contracts'), icon: FileText },
    { to: '/orders', label: t('nav.orders'), icon: ShoppingCart },
    { to: '/reports', label: t('nav.reports'), icon: BarChart2 },
  ]

  const adminNav = [
    { to: '/users', label: t('nav.users'), icon: Users },
    { to: '/audit-log', label: t('nav.auditLog'), icon: ShieldCheck },
  ]

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
            <div className="pt-3 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('nav.admin')}</div>
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
        <NavLink to="/profile" className="flex items-center gap-3 mb-3 hover:bg-gray-800 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
        </NavLink>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
        >
          <LogOut size={16} />
          {t('common.logout')}
        </button>
      </div>
    </div>
  )
}
