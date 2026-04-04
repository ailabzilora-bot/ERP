import React, { useState } from 'react';
import { cn } from '../lib/utils';
import ProductionEntry from './ProductionEntry';
import ProductsManagement from './ProductsManagement';
import ProductionAnalytics from './ProductionAnalytics';
import { useAppContext } from '../store';

export default function ProductionDashboard() {
  const [subTab, setSubTab] = useState('entry');
  const { error } = useAppContext();

  const tabs = [
    { id: 'entry', label: 'Entry' },
    { id: 'products', label: 'Products' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub Navigation */}
      <div className="mb-6 border-b border-slate-800">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                subTab === tab.id
                  ? "border-yellow-500 text-yellow-500"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
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
        {subTab === 'entry' && <ProductionEntry />}
        {subTab === 'products' && <ProductsManagement />}
        {subTab === 'analytics' && <ProductionAnalytics />}
      </div>
    </div>
  );
}
