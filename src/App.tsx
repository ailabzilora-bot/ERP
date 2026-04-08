/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './store';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ProductionDashboard from './pages/ProductionDashboard';
import PurchasesDashboard from './pages/PurchasesDashboard';
import SalesDashboard from './pages/SalesDashboard';
import IncomeDashboard from './pages/IncomeDashboard';
import CreateProductModal from './components/CreateProductModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('production');

  return (
    <AppProvider>
      <div className="flex h-screen bg-[#0a0f1c] text-slate-200 font-sans overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 bg-[#0a0f1c]">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'production' && <ProductionDashboard />}
              {activeTab === 'purchases' && <PurchasesDashboard />}
              {activeTab === 'sales' && <SalesDashboard />}
              {activeTab === 'income' && <IncomeDashboard />}
              {activeTab !== 'production' && activeTab !== 'purchases' && activeTab !== 'sales' && activeTab !== 'income' && (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} module coming soon.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      <CreateProductModal />
    </AppProvider>
  );
}

