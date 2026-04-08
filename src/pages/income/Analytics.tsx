import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
  const monthlyData = [
    { name: 'Oct', income: 4000000, expense: 2400000 },
    { name: 'Nov', income: 3000000, expense: 1398000 },
    { name: 'Dec', income: 2000000, expense: 9800000 },
    { name: 'Jan', income: 2780000, expense: 3908000 },
    { name: 'Feb', income: 1890000, expense: 4800000 },
    { name: 'Mar', income: 2390000, expense: 3800000 },
  ];

  const expenseBreakdown = [
    { name: 'Supplier Payments', value: 65, color: '#ef4444' },
    { name: 'Payroll', value: 20, color: '#f97316' },
    { name: 'Operational', value: 15, color: '#3b82f6' },
  ];

  const netProfitTrend = monthlyData.map(d => ({
    name: d.name,
    profit: d.income - d.expense
  }));

  const topCustomers = [
    { name: 'Acme Corp', value: 1250000 },
    { name: 'Global Traders', value: 850000 },
    { name: 'Mega Foods', value: 650000 },
    { name: 'City Supermarket', value: 450000 },
  ];

  const chequeFlow = [
    { name: 'Receivable', value: 1050000, color: 'bg-blue-500' },
    { name: 'Deposited', value: 300000, color: 'bg-emerald-500' },
    { name: 'Payable', value: 0, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Row: Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Revenue vs Expenses */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 lg:col-span-2">
          <h3 className="font-semibold text-white mb-6">Monthly Revenue vs Expenses</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `LKR ${(value / 1000000).toFixed(1)}M`}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(value: number) => `LKR ${value.toLocaleString()}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-6">Expense Breakdown</h3>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {expenseBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Section: 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Net Profit Trend */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-6">Net Profit Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={netProfitTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `LKR ${(value / 1000000).toFixed(1)}M`}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  formatter={(value: number) => `LKR ${value.toLocaleString()}`}
                />
                <Bar 
                  dataKey="profit" 
                  name="Net Profit" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={30}
                >
                  {netProfitTrend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-6">Top Customers by Revenue</h3>
          <div className="space-y-4">
            {topCustomers.map((customer, index) => {
              const max = Math.max(...topCustomers.map(c => c.value));
              const percentage = (customer.value / max) * 100;
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">{customer.name}</span>
                    <span className="font-mono text-white">LKR {customer.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cheque Flow */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-6">Cheque Flow</h3>
          <div className="space-y-6">
            {chequeFlow.map((item, index) => {
              const max = 1500000; // Arbitrary max for scale
              const percentage = Math.min(100, (item.value / max) * 100);
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-mono text-white">LKR {item.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
