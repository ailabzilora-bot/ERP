import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Save, FileText } from 'lucide-react';
import { useAppContext } from '../store';
import { cn } from '../lib/utils';

interface EditProductionEntryModalProps {
  entry: any;
  onClose: () => void;
}

export default function EditProductionEntryModal({ entry, onClose }: EditProductionEntryModalProps) {
  const { products, entries, setEntries } = useAppContext();
  const [lines, setLines] = useState(entry.lines);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleAddLine = () => {
    setLines([...lines, { id: `temp-${Date.now()}`, productId: '', qty: 0, bags: 0, notes: '' }]);
  };

  const handleRemoveLine = (id: string) => {
    if (id.startsWith('temp-')) {
      setLines(lines.filter((line: any) => line.id !== id));
    } else {
      setItemToDelete(id);
      setDeleteError(null);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setDeletingLineId(itemToDelete);
    setDeleteError(null);
    try {
      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/35fd3a48-b406-4882-b340-f7df464298b5', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: itemToDelete })
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      // Update global entries state so it reflects the deletion even if canceled
      const updatedEntry = {
        ...entry,
        lines: entry.lines.filter((l: any) => l.id !== itemToDelete)
      };
      setEntries(entries.map((e: any) => e.id === entry.id ? updatedEntry : e));
      setLines(lines.filter((line: any) => line.id !== itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      setDeleteError('Failed to delete item. Please try again.');
    } finally {
      setDeletingLineId(null);
    }
  };

  const handleLineChange = (id: string, field: string, value: any) => {
    setLines(lines.map((line: any) => line.id === id ? { ...line, [field]: value } : line));
  };

  const totalQty = useMemo(() => lines.reduce((sum: number, line: any) => sum + (Number(line.qty) || 0), 0), [lines]);
  const totalBags = useMemo(() => lines.reduce((sum: number, line: any) => sum + (Number(line.bags) || 0), 0), [lines]);

  const handleSave = async (action: 'Draft' | 'Save') => {
    if (lines.some((l: any) => !l.productId || l.qty <= 0)) {
      alert('Please fill all required fields correctly.');
      return;
    }

    setIsSubmitting(true);

    try {
      const targetStatus = action === 'Draft' ? 'Update as Draft' : 'Update as Save Entry';
      const payload: any = { id: entry.id };
      
      // Always send the new status based on the button clicked
      payload.status = targetStatus;

      const getLinesPayload = (linesArray: any[]) => linesArray.map(l => ({
        id: l.id,
        product_id: l.productId,
        qty_kg: l.qty,
        bags: l.bags,
        notes: l.notes
      }));

      const currentLinesPayload = getLinesPayload(lines);
      const originalLinesPayload = getLinesPayload(entry.lines);

      // Only send lines if they were updated
      if (JSON.stringify(currentLinesPayload) !== JSON.stringify(originalLinesPayload)) {
        payload.lines = currentLinesPayload;
      }

      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/5cdcd5ee-24a6-4b3d-9e44-bbef08df98a0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send data to webhook');
      }

      // Optimistic update
      const updatedEntry = {
        ...entry,
        status: action === 'Draft' ? 'Saved' : 'Today',
        lines: lines
      };

      setEntries(entries.map(e => e.id === entry.id ? updatedEntry : e));
      handleClose();
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />
      
      <div 
        className={cn(
          "relative w-full max-w-5xl bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Edit Production Entry</h2>
              <p className="text-sm text-slate-400">Update production details</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-6 custom-scrollbar space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Date</label>
              <input 
                type="date" 
                value={entry.date}
                disabled
                className="w-full bg-[#111827] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 cursor-not-allowed opacity-70"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Batch Reference</label>
              <input 
                type="text" 
                value={entry.batchRef}
                disabled
                className="w-full bg-[#111827] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 font-mono cursor-not-allowed opacity-70"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Production Lines</h3>
            <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                    <th className="px-4 py-3 w-[30%]">Product</th>
                    <th className="px-4 py-3 w-[20%]">Qty (kg)</th>
                    <th className="px-4 py-3 w-[15%]">Bags</th>
                    <th className="px-4 py-3 w-[25%]">Notes</th>
                    <th className="px-4 py-3 w-[10%] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {lines.map((line: any) => (
                    <tr key={line.id}>
                      <td className="py-3 px-4">
                        <select 
                          value={line.productId}
                          onChange={(e) => handleLineChange(line.id, 'productId', e.target.value)}
                          className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        >
                          <option value="">Select Product...</option>
                          {products.filter(p => p.status === 'Active' || p.id === line.productId).map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          min="0"
                          value={line.qty || ''}
                          onChange={(e) => handleLineChange(line.id, 'qty', Number(e.target.value))}
                          className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          min="0"
                          value={line.bags || ''}
                          onChange={(e) => handleLineChange(line.id, 'bags', Number(e.target.value))}
                          className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="text" 
                          value={line.notes || ''}
                          onChange={(e) => handleLineChange(line.id, 'notes', e.target.value)}
                          className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                          placeholder="Optional notes"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleRemoveLine(line.id)}
                          disabled={lines.length === 1 || deletingLineId === line.id}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingLineId === line.id ? (
                            <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3 shrink-0">
          <button 
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={() => handleSave('Draft')}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 disabled:opacity-50"
          >
            Update as Draft
          </button>
          <button 
            onClick={() => handleSave('Save')}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Update as Save Entry
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deletingLineId && setItemToDelete(null)}
          />
          <div className="relative w-full max-w-md bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-xl font-bold text-white mb-2">Delete Item</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete this item from the Batch? This action cannot be undone.
            </p>
            
            {deleteError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={!!deletingLineId}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!deletingLineId}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deletingLineId ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
