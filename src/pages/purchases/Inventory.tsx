import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, Bell, DollarSign, CheckCircle2, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export default function Inventory() {
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<any[]>([]);
  const [supplierSpend, setSupplierSpend] = useState<any[]>([]);
  const [monthlySpend, setMonthlySpend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUnpaid: 0,
    totalPaid: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch inventory items
      const { data: inventoryData } = await supabase
        .from('inventory_items')
        .select(`
          *,
          purchase_items (
            item_name,
            unit,
            alert_threshold
          )
        `);

      let formattedStockItems: any[] = [];
      let lowStockCount = 0;

      if (inventoryData) {
        formattedStockItems = inventoryData.map(item => {
          const current = Number(item.current_stock) || 0;
          const threshold = Number(item.purchase_items?.alert_threshold) || 0;
          if (current < threshold) lowStockCount++;
          
          return {
            name: item.purchase_items?.item_name || 'Unknown Item',
            current,
            threshold,
            unit: item.purchase_items?.unit || 'units'
          };
        });
        setStockItems(formattedStockItems);
      }

      // Fetch suppliers with GRNs
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select(`
          id,
          company_name,
          grn_entries (
            total_amount,
            paid_amount,
            status,
            grn_date
          )
        `);

      let totalUnpaid = 0;
      let totalPaidAmount = 0;
      let formattedBalances: any[] = [];
      let formattedSpend: any[] = [];

      if (suppliersData) {
        suppliersData.forEach(supplier => {
          const grns = supplier.grn_entries || [];
          let totalPurchased = 0;
          let totalPaid = 0;

          grns.forEach((grn: any) => {
            totalPurchased += Number(grn.total_amount) || 0;
            totalPaid += Number(grn.paid_amount) || 0;
          });

          const outstanding = totalPurchased - totalPaid;
          totalUnpaid += outstanding;
          totalPaidAmount += totalPaid;

          formattedBalances.push({
            name: supplier.company_name,
            amount: outstanding,
            max: 0 // Will calculate max later
          });

          formattedSpend.push({
            name: supplier.company_name,
            amount: totalPurchased,
            max: 0 // Will calculate max later
          });
        });

        // Calculate monthly spend
        const monthlyData = new Array(7).fill(0);
        const monthNames: string[] = [];
        
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          monthNames.push(d.toLocaleString('default', { month: 'short' }));
        }

        suppliersData.forEach(supplier => {
          const grns = supplier.grn_entries || [];
          grns.forEach((grn: any) => {
            if (grn.grn_date) {
              const grnDate = new Date(grn.grn_date);
              const now = new Date();
              const monthDiff = (now.getFullYear() - grnDate.getFullYear()) * 12 + now.getMonth() - grnDate.getMonth();
              
              if (monthDiff >= 0 && monthDiff < 7) {
                monthlyData[6 - monthDiff] += Number(grn.total_amount) || 0;
              }
            }
          });
        });

        const maxMonthlySpend = Math.max(...monthlyData, 1);
        const formattedMonthlySpend = monthlyData.map((amount, i) => ({
          month: monthNames[i],
          amount,
          height: (amount / maxMonthlySpend) * 100
        }));

        setMonthlySpend(formattedMonthlySpend);
        
        const maxBalance = Math.max(...formattedBalances.map(b => b.amount), 1);
        formattedBalances = formattedBalances
          .filter(b => b.amount > 0)
          .sort((a, b) => b.amount - a.amount)
          .map(b => ({ ...b, max: maxBalance }));

        const maxSpend = Math.max(...formattedSpend.map(s => s.amount), 1);
        formattedSpend = formattedSpend
          .filter(s => s.amount > 0)
          .sort((a, b) => b.amount - a.amount)
          .map(s => ({ ...s, max: maxSpend }));

        setSupplierBalances(formattedBalances);
        setSupplierSpend(formattedSpend);
      }

      setStats({
        totalUnpaid,
        totalPaid: totalPaidAmount
      });

    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = stockItems.filter(item => item.current < item.threshold);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading inventory data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start sm:items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-sm text-red-400">
            <span className="font-bold">Low Stock Alert:</span> {lowStockItems.length} items are running low on stock — {lowStockItems.map(i => i.name).join(', ')} need reordering.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-medium text-slate-400">Total Unpaid Amount</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1 font-mono">
            LKR {stats.totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-base font-medium text-slate-400">Total Paid Amount</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1 font-mono">
            LKR {stats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Stock Levels vs Threshold</h3>
          <div className="space-y-6">
            {stockItems.length === 0 ? (
              <div className="text-slate-500 text-sm">No inventory items found.</div>
            ) : (
              stockItems.map((item, i) => {
                const isLow = item.current < item.threshold;
                const percent = Math.min(100, (item.current / (item.threshold * 3 || 1)) * 100);
                const thresholdPercent = Math.min(100, (item.threshold / (item.threshold * 3 || 1)) * 100);
                
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-medium">{item.name}</span>
                      <span className="text-slate-400 font-mono">
                        {item.current.toLocaleString()} / {item.threshold.toLocaleString()} {item.unit}
                      </span>
                    </div>
                    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-500", isLow ? "bg-red-500" : "bg-green-500")}
                        style={{ width: `${percent}%` }}
                      />
                      <div 
                        className="absolute top-0 h-full w-0.5 bg-yellow-500 z-10"
                        style={{ left: `${thresholdPercent}%` }}
                        title="Alert Threshold"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Supplier Outstanding */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Supplier Outstanding Balances</h3>
          <div className="space-y-6">
            {supplierBalances.length === 0 ? (
              <div className="text-slate-500 text-sm">No outstanding balances.</div>
            ) : (
              supplierBalances.map((supplier, i) => {
                const percent = (supplier.amount / supplier.max) * 100;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-medium">{supplier.name}</span>
                      <span className="text-yellow-500 font-bold font-mono">LKR {supplier.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Monthly Purchase Spend */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Monthly Purchase Spend
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {monthlySpend.map((data, i) => (
              <div key={i} className="w-full bg-slate-800 rounded-t-sm relative group hover:bg-slate-700 transition-colors" style={{ height: `${data.height}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  LKR {data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-slate-500">
            {monthlySpend.map((data, i) => (
              <span key={i}>{data.month}</span>
            ))}
          </div>
        </div>

        {/* Spend by Supplier */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Top Spend by Supplier (YTD)</h3>
          <div className="space-y-6">
            {supplierSpend.length === 0 ? (
              <div className="text-slate-500 text-sm">No purchase data found.</div>
            ) : (
              supplierSpend.map((supplier, i) => {
                const percent = (supplier.amount / supplier.max) * 100;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-medium">{supplier.name}</span>
                      <span className="text-slate-300 font-mono">LKR {supplier.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
