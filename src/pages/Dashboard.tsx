import { Sidebar } from '@/components/sidebar'
import { BalanceChart } from '@/components/balance-chart'
import { TransactionList } from '@/components/transaction-list'
import { FinancialGoalsWidget } from '@/components/FinancialGoalsWidget'
import { AchievementWidget } from '@/components/AchievementWidget'

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Welcome back to your financial overview</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <BalanceChart />
              </div>
              <div>
                <FinancialGoalsWidget />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <TransactionList />
              </div>
              <div>
                <AchievementWidget />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}