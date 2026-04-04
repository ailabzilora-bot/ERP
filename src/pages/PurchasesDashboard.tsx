import React, { useState } from 'react';
import { cn } from '../lib/utils';
import GRNEntry from './purchases/GRNEntry';
import Suppliers from './purchases/Suppliers';
import Inventory from './purchases/Inventory';
import { useAppContext } from '../store';
import { FileText, Users, Package } from 'lucide-react';

export default function PurchasesDashboard() {
  const [subTab, setSubTab] = useState('grn');
  const { error } = useAppContext();

  const tabs = [
    { id: 'grn', label: 'GRN Entry', icon: FileText },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: Package },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub Navigation */}
      <div className="mb-6">
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
      </div>

      {/* Content */}
      <div className="flex-1">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <div className="font-semibold mb-1">Error Loading Data</div>
            {error}
          </div>
        )}
        {subTab === 'grn' && <GRNEntry />}
        {subTab === 'suppliers' && <Suppliers />}
        {subTab === 'inventory' && <Inventory />}
      </div>
    </div>
  );
}
