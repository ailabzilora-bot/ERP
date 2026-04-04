import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Filter } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '../lib/utils';

export default function ProductionAnalytics() {
  const { products, entries, isLoading } = useAppContext();
  const [dateRange, setDateRange] = useState<'Daily' | 'Monthly' | 'Custom'>('Daily');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [productFilter, setProductFilter] = useState('All');

  // Prepare chart data
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; finishedGoods: number; byProducts: number }>();
    
    // Initialize days for the selected month
    const start = startOfMonth(parseISO(`${selectedMonth}-01`));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });
    
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      dataMap.set(dateStr, { date: format(day, 'MMM dd'), finishedGoods: 0, byProducts: 0 });
    });

    entries.forEach(entry => {
      if (entry.date.startsWith(selectedMonth)) {
        const dayData = dataMap.get(entry.date);
        if (dayData) {
          entry.lines.forEach(line => {
            const product = products.find(p => p.id === line.productId);
            if (productFilter === 'All' || product?.id === productFilter) {
              if (product?.type === 'Finished Good') {
                dayData.finishedGoods += line.qty;
              } else if (product?.type === 'By-product') {
                dayData.byProducts += line.qty;
              }
            }
          });
        }
      }
    });

    return Array.from(dataMap.values());
  }, [entries, products, selectedMonth, productFilter]);

  // Prepare product progress data
  const productOutput = useMemo(() => {
    const output: Record<string, number> = {};
    products.forEach(p => output[p.name] = 0);

    entries.forEach(entry => {
      if (entry.date.startsWith(selectedMonth)) {
        entry.lines.forEach(line => {
          const product = products.find(p => p.id === line.productId);
          if (product) {
            output[product.name] += line.qty;
          }
        });
      }
    });

    const maxOutput = Math.max(...Object.values(output), 1);
    
    return Object.entries(output)
      .filter(([_, qty]) => qty > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, qty]) => ({
        name,
        qty,
        percentage: (qty / maxOutput) * 100
      }));
  }, [entries, products, selectedMonth]);

  // Prepare detailed log table data
  const logData = useMemo(() => {
    const logs = new Map<string, Record<string, any>>();
    
    entries.forEach(entry => {
      if (entry.date.startsWith(selectedMonth)) {
        if (!logs.has(entry.date)) {
          logs.set(entry.date, {
            date: entry.date,
            totalOutput: 0,
          });
        }
        
        const dayLog = logs.get(entry.date)!;
        
        entry.lines.forEach(line => {
          const product = products.find(p => p.id === line.productId);
          if (product) {
            dayLog[product.name] = (dayLog[product.name] || 0) + line.qty;
            dayLog.totalOutput += line.qty;
          }
        });
      }
    });

    return Array.from(logs.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, products, selectedMonth]);

  const productNames = products.map(p => p.name);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Production Analytics</h1>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
          {['Daily', 'Monthly', 'Custom'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range as any)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                dateRange === range 
                  ? "bg-slate-800 text-yellow-400 shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-48 bg-[#0a0f1c] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>
          
          <div className="relative flex-1 sm:flex-none">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select 
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full sm:w-48 bg-[#0a0f1c] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 appearance-none"
            >
              <option value="All">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-6">Daily Output</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="finishedGoods" name="Finished Goods" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="byProducts" name="By-products" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Progress Bars */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-6">Output by Product</h2>
          <div className="space-y-5">
            {productOutput.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-300 font-medium">{item.name}</span>
                  <span className="text-white font-mono">{item.qty.toLocaleString()} kg</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {productOutput.length === 0 && (
              <div className="text-center text-slate-500 py-8 text-sm">
                No production data for selected period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Log Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-white">Production Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/20">
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                {productNames.map(name => (
                  <th key={name} className="px-6 py-4 text-right whitespace-nowrap">{name}</th>
                ))}
                <th className="px-6 py-4 text-right whitespace-nowrap text-yellow-500">Total Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logData.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-medium whitespace-nowrap">
                    {log.date}
                  </td>
                  {productNames.map(name => (
                    <td key={name} className="px-6 py-4 text-sm text-slate-300 text-right font-mono">
                      {log[name] ? log[name].toLocaleString() : '-'}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-sm text-yellow-400 font-bold text-right font-mono bg-yellow-500/5">
                    {log.totalOutput.toLocaleString()}
                  </td>
                </tr>
              ))}
              {logData.length === 0 && (
                <tr>
                  <td colSpan={productNames.length + 2} className="px-6 py-12 text-center text-slate-500">
                    No production logs found for selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
