import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from '../ui/GlobalSearch'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-8 sticky top-0 z-30">
          <GlobalSearch />
        </header>
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
