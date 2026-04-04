import React from 'react';
import { 
  Factory, 
  Package, 
  BarChart3, 
  ShoppingCart, 
  Receipt, 
  Wallet, 
  Users, 
  Bot,
  UserCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems: Array<{ id: string; label: string; icon: any; badge?: number; disabled?: boolean }> = [
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
    { id: 'sales', label: 'Sales & Billing', icon: Receipt, badge: 3 },
    { id: 'income', label: 'Income & Expense', icon: Wallet },
    { id: 'payroll', label: 'Payroll', icon: Users },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
  ];

  return (
    <div className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-yellow-500 flex items-center justify-center text-slate-900 font-bold">
          M
        </div>
        <span className="font-semibold text-lg tracking-tight text-white">MillERP</span>
      </div>

      <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => !item.disabled && setActiveTab(item.id)}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-slate-800 text-yellow-400" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50",
                item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-slate-400"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-yellow-400" : "text-slate-500")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-yellow-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
          <UserCircle className="w-8 h-8 text-slate-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-xs text-slate-500 truncate">admin@millerp.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
