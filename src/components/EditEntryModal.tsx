import React, { useState, useEffect } from 'react';
import { X, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditEntry: (entry: any) => void;
  entry: any;
}

export default function EditEntryModal({ isOpen, onClose, onEditEntry, entry }: EditEntryModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('income');
  
  // Form State
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [source, setSource] = useState('');

  const incomeCategories = ['Sales Revenue', 'By-Product Sales', 'Other Income'];
  const expenseCategories = ['Supplier Payments', 'Payroll', 'Operational Expense'];

  useEffect(() => {
    if (isOpen && entry) {
      setIsVisible(true);
      setType(entry.type as 'income' | 'expense');
      setDate(entry.date);
      setCategory(entry.category);
      setDescription(entry.description);
      setAmount(entry.amount);
      setPaymentMethod(entry.paymentMethod || 'Cash');
      setSource(entry.source);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, entry]);

  if (!isVisible && !isOpen) return null;

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(newType === 'income' ? incomeCategories[0] : expenseCategories[0]);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !category || amount === '' || amount <= 0) {
      alert('Please fill in all required fields with valid values.');
      return;
    }

    const updatedEntry = {
      ...entry,
      date,
      category,
      description,
      amount: Number(amount),
      type,
      paymentMethod,
      source: source || 'Manual',
    };

    setIsSubmitting(true);
    try {
      // Send data to webhook
      await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/73bd48e3-d584-4adb-9376-a1a104e5ebe1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updatedEntry,
          entry_type: type
        }),
      });
      
      onEditEntry(updatedEntry);
      onClose();
    } catch (error) {
      console.error('Error sending data to webhook:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategories = type === 'income' ? incomeCategories : expenseCategories;
  // Ensure the current category is in the list even if it's a custom one from the DB
  const displayCategories = currentCategories.includes(category) 
    ? currentCategories 
    : [...currentCategories, category].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )} 
        onClick={onClose}
      />
      
      <div 
        className={cn(
          "relative w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Edit Entry</h2>
              <p className="text-xs text-slate-400">Update financial transaction details</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <form id="edit-entry-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Type Toggle */}
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  type === 'income' 
                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                <ArrowUpRight className="w-4 h-4" />
                Income
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  type === 'expense' 
                    ? "bg-red-500/20 text-red-400 shadow-sm" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                <ArrowDownRight className="w-4 h-4" />
                Expense
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date *
                </label>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all [color-scheme:dark]"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Category *
                </label>
                <select 
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                >
                  {displayCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Amount (LKR) *
                </label>
                <input 
                  type="number" 
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Payment Method
                </label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Source */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Source
                </label>
                <input 
                  type="text" 
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. From Sales / Manual / Bank"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Description
                </label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="edit-entry-form"
            disabled={isSubmitting}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
