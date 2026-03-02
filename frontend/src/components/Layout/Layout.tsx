import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from '../ui/GlobalSearch'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { orgApi } from '../../api'
import { Building2 } from 'lucide-react'

function LangToggle() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('en') ? 'en' : 'fr'

  function toggle(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem('crm_lang', lang)
  }

  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
      <button
        onClick={() => toggle('fr')}
        className={`px-2.5 py-1.5 transition-colors ${current === 'fr' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        FR
      </button>
      <button
        onClick={() => toggle('en')}
        className={`px-2.5 py-1.5 transition-colors ${current === 'en' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        EN
      </button>
    </div>
  )
}

function OrgName() {
  const { data: org } = useQuery({ queryKey: ['org-me'], queryFn: orgApi.me })
  if (!org) return null
  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500">
      <Building2 size={14} />
      <span>{org.name}</span>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-30">
          <GlobalSearch />
          <div className="flex items-center gap-4">
            <OrgName />
            <LangToggle />
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
