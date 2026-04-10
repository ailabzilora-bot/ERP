import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { supabase } from '../../lib/supabase';
import EditEntryModal from '../../components/EditEntryModal';
import CreateCategoryModal from '../../components/CreateCategoryModal';
import DeleteCategoryModal from '../../components/DeleteCategoryModal';

interface IncomeExpensesProps {
  onAddEntryClick?: () => void;
  refreshTrigger?: number;
}

interface Entry {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: string;
  source: string;
  isManual: boolean;
  paymentMethod: string;
}

export default function IncomeExpenses({ onAddEntryClick, refreshTrigger = 0 }: IncomeExpensesProps) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Entry | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [refreshTrigger]);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('income_expense')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedEntries: Entry[] = data.map((item: any) => ({
          id: item.id,
          date: item.date || '-',
          category: item.category || '-',
          description: item.description || '-',
          amount: item.amount || 0,
          type: item.entry_type || 'income',
          source: item.source || '-',
          isManual: item.source === 'Manual',
          paymentMethod: item.payment_method || 'Cash'
        }));
        setEntries(formattedEntries);
      }
    } catch (error) {
      console.error('Error fetching income/expense entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
    if (monthFilter) {
      const entryMonth = entry.date.substring(0, 7);
      if (entryMonth !== monthFilter) return false;
    }
    return true;
  });

  const totalIncome = filteredEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = filteredEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // Calculate income by category for the pie chart
  const incomeEntries = filteredEntries.filter(e => e.type === 'income');
  const incomeByCategoryMap = incomeEntries.reduce((acc: any, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
    return acc;
  }, {});

  const colors = ['#10b981', '#eab308', '#64748b', '#3b82f6', '#8b5cf6'];
  const incomeByCategory = Object.keys(incomeByCategoryMap).map((key, index) => ({
    name: key,
    value: incomeByCategoryMap[key],
    color: colors[index % colors.length]
  }));

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Sales': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'By-Product Sales': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Other Income': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Supplier Payments': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Payroll': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Operational': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === 'From Sales') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        
        {/* Filter Bar */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 w-full sm:w-auto gap-4 items-center">
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
            >
              <option value="all">All Entries</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>
            <input 
              type="month" 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsDeleteCategoryModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-red-400 rounded-lg hover:bg-slate-700 hover:text-red-300 transition-colors font-medium border border-slate-700 w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-4 h-4" />
              Delete Category
            </button>
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium border border-slate-700 w-full sm:w-auto justify-center"
            >
              <Tag className="w-4 h-4" />
              Add Category
            </button>
            <button 
              onClick={onAddEntryClick}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-4 relative">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <h3 className="text-base font-medium text-slate-400">Total Income</h3>
            </div>
            <div className="text-3xl font-bold text-white font-mono relative">
              LKR {totalIncome.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-4 relative">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
                <ArrowDownRight className="w-6 h-6" />
              </div>
              <h3 className="text-base font-medium text-slate-400">Total Expenses</h3>
            </div>
            <div className="text-3xl font-bold text-white font-mono relative">
              LKR {totalExpense.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-semibold text-white">Entries — March 2026</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Category</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Amount (LKR)</th>
                  <th className="px-6 py-4 font-medium text-center whitespace-nowrap">Source</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Loading entries...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No entries found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">{entry.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap", getCategoryBadge(entry.category))}>
                          {entry.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white min-w-[200px]">{entry.description}</td>
                      <td className={cn(
                        "px-6 py-4 text-right font-mono font-medium whitespace-nowrap",
                        entry.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap", getSourceBadge(entry.source))}>
                          {entry.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEntryToEdit(entry);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" 
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {entry.isManual && (
                            <button className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Side Panels */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Income by Category */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-6">Income by Category</h3>
          <div className="h-48 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {incomeByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => `LKR ${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {incomeByCategory.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-white">{item.value.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{Math.round((item.value / totalIncome) * 100)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Net Position */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-6">Net Position</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Total Income</span>
              <span className="font-mono text-emerald-400">LKR {totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Total Expenses</span>
              <span className="font-mono text-red-400">LKR {totalExpense.toLocaleString()}</span>
            </div>
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <span className="font-medium text-white">Net Profit</span>
              <span className="font-mono font-bold text-emerald-500 text-lg">LKR {netProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {entryToEdit && (
        <EditEntryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setTimeout(() => setEntryToEdit(null), 200);
          }}
          entry={entryToEdit}
          onEditEntry={(updatedEntry) => {
            // Frontend only update (mock)
            setEntries(entries.map(e => e.id === updatedEntry.id ? updatedEntry : e));
          }}
        />
      )}

      <CreateCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onAddCategory={() => {
          // Category added successfully
        }}
      />

      <DeleteCategoryModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => setIsDeleteCategoryModalOpen(false)}
        onDeleteCategory={() => {
          // Category deleted successfully
        }}
      />
    </div>
  );
}
