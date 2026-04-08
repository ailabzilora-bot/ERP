import React, { useState } from 'react';
import { cn } from '../lib/utils';
import IncomeExpenses from './income/IncomeExpenses';
import Cheques from './income/Cheques';
import Analytics from './income/Analytics';
import { Wallet, Receipt, PieChart, Plus } from 'lucide-react';
import CreateEntryModal from '../components/CreateEntryModal';

export default function IncomeDashboard() {
  const [subTab, setSubTab] = useState('income-expenses');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { id: 'income-expenses', label: 'Income & Expenses', icon: Wallet },
    { id: 'cheques', label: 'Cheque Management', icon: Receipt },
    { id: 'analytics', label: 'Analytics Charts', icon: PieChart },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation & Global Header */}
      <div className="flex items-center justify-between mb-6">
        <nav className="flex space-x-2 bg-[#111827] p-1 rounded-xl border border-slate-800 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
                  isActive
                    ? "bg-slate-800 text-yellow-500 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-yellow-500" : "text-slate-500")} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400 font-medium hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {subTab === 'income-expenses' && <IncomeExpenses refreshTrigger={refreshTrigger} onAddEntryClick={() => setIsCreateModalOpen(true)} />}
        {subTab === 'cheques' && <Cheques />}
        {subTab === 'analytics' && <Analytics />}
      </div>

      <CreateEntryModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddEntry={() => setRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
}
