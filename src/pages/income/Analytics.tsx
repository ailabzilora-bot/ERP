import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';

export default function Analytics() {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [netProfitTrend, setNetProfitTrend] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [chequeFlow, setChequeFlow] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      const [ieResponse, invResponse] = await Promise.all([
        supabase.from('income_expense').select('*'),
        supabase.from('invoices').select('*, customers(customer_name)')
      ]);

      const ieData = ieResponse.data || [];
      const invData = invResponse.data || [];

      // 1. Monthly Data & Net Profit Trend
      const monthlyMap = new Map();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      ieData.forEach(row => {
        const date = new Date(row.date);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        
        if (!monthlyMap.has(monthKey)) {
          // Use year * 100 + month for proper sorting
          const sortKey = date.getFullYear() * 100 + date.getMonth();
          monthlyMap.set(monthKey, { name: monthKey, income: 0, expense: 0, sortKey });
        }
        
        const monthData = monthlyMap.get(monthKey);
        if (row.entry_type === 'income') {
          monthData.income += row.amount;
        } else if (row.entry_type === 'expense') {
          monthData.expense += row.amount;
        }
      });

      const processedMonthlyData = Array.from(monthlyMap.values())
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ name, income, expense }) => ({ name, income, expense }));

      setMonthlyData(processedMonthlyData);
      
      setNetProfitTrend(processedMonthlyData.map(d => ({
        name: d.name,
        profit: d.income - d.expense
      })));

      // 2. Expense Breakdown
      const expenseMap = new Map();
      ieData.filter(r => r.entry_type === 'expense').forEach(row => {
        expenseMap.set(row.category, (expenseMap.get(row.category) || 0) + row.amount);
      });

      const colors = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#eab308', '#6366f1'];
      const totalExpense = Array.from(expenseMap.values()).reduce((a, b) => a + b, 0);
      
      const processedExpenseBreakdown = Array.from(expenseMap.entries())
        .map(([name, value], index) => ({
          name,
          value: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0,
          amount: value,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.value - a.value);

      setExpenseBreakdown(processedExpenseBreakdown);

      // 3. Top Customers
      const customerMap = new Map();
      invData.forEach(row => {
        const customerName = row.customers?.customer_name || 'Unknown';
        customerMap.set(customerName, (customerMap.get(customerName) || 0) + row.total_amount);
      });

      const processedTopCustomers = Array.from(customerMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

      setTopCustomers(processedTopCustomers);

      // 4. Cheque Flow
      let receivable = 0;
      let deposited = 0;
      let payable = 0;

      invData.filter(r => r.payment_method === 'cheque').forEach(row => {
        if (row.status === 'paid') {
          deposited += row.cheque_amount || 0;
        } else {
          receivable += row.cheque_amount || 0;
        }
      });

      ieData.filter(r => r.payment_method === 'cheque' && r.entry_type === 'expense').forEach(row => {
        payable += row.amount;
      });

      setChequeFlow([
        { name: 'Receivable', value: receivable, color: 'bg-blue-500' },
        { name: 'Deposited', value: deposited, color: 'bg-emerald-500' },
        { name: 'Payable', value: payable, color: 'bg-red-500' },
      ]);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading analytics...
      </div>
    );
  }

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
