import { Sidebar } from '@/components/sidebar'

export default function Achievements() {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Achievements</h1>
              <p className="text-gray-600 dark:text-gray-400">Track your financial milestones</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-gray-600 dark:text-gray-400">Achievements page coming soon...</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}