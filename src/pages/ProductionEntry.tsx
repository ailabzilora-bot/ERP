import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Plus, Trash2, Save, FileText, TrendingUp, Package, Activity, Edit2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import EditProductionEntryModal from '../components/EditProductionEntryModal';

export default function ProductionEntry() {
  const { products, entries, setEntries, setIsCreateProductModalOpen, isLoading } = useAppContext();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [batchRef, setBatchRef] = useState(`BATCH-${format(new Date(), 'yyyy-MM-dd')}`);
  const [lines, setLines] = useState([{ id: Date.now().toString(), productId: '', qty: 0, bags: 0, notes: '' }]);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [deleteBatchError, setDeleteBatchError] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const handleAddLine = () => {
    setLines([...lines, { id: Date.now().toString(), productId: '', qty: 0, bags: 0, notes: '' }]);
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  const handleLineChange = (id: string, field: string, value: any) => {
    setLines(lines.map(line => line.id === id ? { ...line, [field]: value } : line));
  };

  const totalQty = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0), [lines]);
  const totalBags = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.bags) || 0), 0), [lines]);

  const handleSave = async (status: 'Today' | 'Saved') => {
    if (lines.some(l => !l.productId || l.qty <= 0)) {
      alert('Please fill all required fields correctly.');
      return;
    }

    try {
      const webhookPayload = {
        batch_ref: batchRef,
        production_date: date,
        status: status === 'Saved' ? 'Save draft' : 'Save Entry',
        lines: lines.map(line => ({
          product_id: line.productId,
          qty_kg: line.qty,
          bags: line.bags,
          notes: line.notes
        }))
      };

      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook/a860100c-790d-4451-92d5-5a38626d29ee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to send data to webhook');
      }

      // Update local state optimistically
      const newEntry = {
        id: `temp-${Date.now()}`,
        date: date,
        batchRef: batchRef,
        status: status,
        lines: lines.map(line => ({
          id: `temp-line-${Date.now()}-${Math.random()}`,
          productId: line.productId,
          qty: line.qty,
          bags: line.bags,
          notes: line.notes
        }))
      };

      setEntries([newEntry, ...entries]);
      setLines([{ id: Date.now().toString(), productId: '', qty: 0, bags: 0, notes: '' }]);
      setBatchRef(`BATCH-${format(new Date(), 'yyyy-MM-dd')}`);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    }
  };

  const handleDeleteBatchClick = (id: string) => {
    setBatchToDelete(id);
    setDeleteBatchError(null);
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    setIsDeletingBatch(true);
    setDeleteBatchError(null);
    try {
      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook/4c0e38a0-65d8-435d-b566-ec6e14613dd1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: batchToDelete })
      });

      if (!response.ok) {
        throw new Error('Failed to send delete request to webhook');
      }

      setEntries(entries.filter(e => e.id !== batchToDelete));
      setBatchToDelete(null);
    } catch (error) {
      console.error('Error deleting batch:', error);
      setDeleteBatchError('Failed to delete batch. Please try again.');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const todayOutput = entries.filter(e => e.date === format(new Date(), 'yyyy-MM-dd')).reduce((sum, entry) => sum + entry.lines.reduce((s, l) => s + l.qty, 0), 0);
  const monthOutput = entries.filter(e => e.date.startsWith(format(new Date(), 'yyyy-MM'))).reduce((sum, entry) => sum + entry.lines.reduce((s, l) => s + l.qty, 0), 0);

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
        <h1 className="text-2xl font-bold text-white tracking-tight">Production Entry</h1>
        <button 
          onClick={() => setIsCreateProductModalOpen(true)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border border-slate-700"
        >
          <Plus className="w-4 h-4" />
          New Product
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">+12.5%</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">Today's Output</p>
          <p className="text-2xl font-bold text-white mt-1">{todayOutput.toLocaleString()} <span className="text-sm font-normal text-slate-500">kg</span></p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">+5.2%</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">This Month Output</p>
          <p className="text-2xl font-bold text-white mt-1">{monthOutput.toLocaleString()} <span className="text-sm font-normal text-slate-500">kg</span></p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium">Active Products</p>
          <p className="text-2xl font-bold text-white mt-1">{products.filter(p => p.status === 'Active').length}</p>
        </div>
      </div>

      {/* New Entry Form */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
          <FileText className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-white">New Production Entry</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Production Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Batch Reference</label>
              <input 
                type="text" 
                value={batchRef}
                onChange={(e) => setBatchRef(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
                placeholder="e.g. BATCH-2026-04-01"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-sm font-medium text-slate-400">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium w-32">Qty (kg)</th>
                  <th className="pb-3 font-medium w-32">Bags</th>
                  <th className="pb-3 font-medium">Notes</th>
                  <th className="pb-3 font-medium w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {lines.map((line, index) => (
                  <tr key={line.id}>
                    <td className="py-3 pr-4">
                      <select 
                        value={line.productId}
                        onChange={(e) => handleLineChange(line.id, 'productId', e.target.value)}
                        className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                      >
                        <option value="">Select Product...</option>
                        {products.filter(p => p.status === 'Active').map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <input 
                        type="number" 
                        min="0"
                        value={line.qty || ''}
                        onChange={(e) => handleLineChange(line.id, 'qty', Number(e.target.value))}
                        className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input 
                        type="number" 
                        min="0"
                        value={line.bags || ''}
                        onChange={(e) => handleLineChange(line.id, 'bags', Number(e.target.value))}
                        className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input 
                        type="text" 
                        value={line.notes}
                        onChange={(e) => handleLineChange(line.id, 'notes', e.target.value)}
                        className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        placeholder="Optional notes"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <button 
                        onClick={() => handleRemoveLine(line.id)}
                        disabled={lines.length === 1}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button 
              onClick={handleAddLine}
              className="text-sm font-medium text-yellow-500 hover:text-yellow-400 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-yellow-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product Line
            </button>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="text-slate-400">
                Total Qty: <span className="text-white font-bold text-lg ml-1">{totalQty.toLocaleString()} kg</span>
              </div>
              <div className="text-slate-400">
                Total Bags: <span className="text-white font-bold text-lg ml-1">{totalBags.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3">
          <button 
            onClick={() => handleSave('Saved')}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700"
          >
            Save Draft
          </button>
          <button 
            onClick={() => handleSave('Today')}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <Save className="w-4 h-4" />
            Save Entry
          </button>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-semibold text-white">Recent Production Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/20">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Batch Ref</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      Loading entries...
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No production entries found. Add your first entry above.
                  </td>
                </tr>
              ) : (
                entries.map(entry => {
                  const isExpanded = expandedEntries.has(entry.id);
                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-300 whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-400 whitespace-nowrap">
                          {entry.batchRef}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border",
                            entry.status === 'Today' 
                              ? "bg-green-500/10 text-green-400 border-green-500/20" 
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          )}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => toggleExpand(entry.id)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title={isExpanded ? "Hide details" : "View details"}
                            >
                              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => setEditingEntry(entry)}
                              className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteBatchClick(entry.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 bg-slate-900/30 border-t border-slate-800/50">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  <th className="pb-3 pr-4">Product</th>
                                  <th className="pb-3 px-4">Type</th>
                                  <th className="pb-3 px-4 text-right">Qty (kg)</th>
                                  <th className="pb-3 px-4 text-right">Bags</th>
                                  <th className="pb-3 pl-4">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {entry.lines.map(line => {
                                  const product = products.find(p => p.id === line.productId);
                                  return (
                                    <tr key={line.id}>
                                      <td className="py-3 pr-4 text-sm text-white font-medium">
                                        {product?.name || 'Unknown'}
                                      </td>
                                      <td className="py-3 px-4 text-sm">
                                        <span className={cn(
                                          "px-2.5 py-1 rounded-full text-xs font-medium border",
                                          product?.type === 'Finished Good' 
                                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                        )}>
                                          {product?.type}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-sm text-slate-300 text-right font-mono">
                                        {line.qty.toLocaleString()}
                                      </td>
                                      <td className="py-3 px-4 text-sm text-slate-300 text-right font-mono">
                                        {line.bags.toLocaleString()}
                                      </td>
                                      <td className="py-3 pl-4 text-sm text-slate-400 max-w-[200px] truncate" title={line.notes || ''}>
                                        {line.notes || '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingEntry && (
        <EditProductionEntryModal 
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Delete Batch Confirmation Modal */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeletingBatch && setBatchToDelete(null)}
          />
          <div className="relative w-full max-w-md bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-xl font-bold text-white mb-2">Delete Batch</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete this batch? This action cannot be undone.
            </p>
            
            {deleteBatchError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {deleteBatchError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setBatchToDelete(null)}
                disabled={isDeletingBatch}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBatch}
                disabled={isDeletingBatch}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingBatch ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
