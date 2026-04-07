import React, { useState } from 'react';
import { cn } from '../lib/utils';
import Invoices from './sales/Invoices';
import Customers from './sales/Customers';
import Payments from './sales/Payments';
import { FileText, Users, CreditCard } from 'lucide-react';
import CreateInvoiceModal from '../components/CreateInvoiceModal';

export default function SalesDashboard() {
  const [subTab, setSubTab] = useState('invoices');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const tabs = [
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
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
          <div className="text-sm text-slate-400 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <FileText className="w-4 h-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {subTab === 'invoices' && <Invoices />}
        {subTab === 'customers' && <Customers />}
        {subTab === 'payments' && <Payments />}
      </div>

      <CreateInvoiceModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
