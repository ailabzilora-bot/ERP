import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface EditDailyPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  onSave: (updatedRecord: any) => void;
}

export default function EditDailyPayrollModal({ isOpen, onClose, record, onSave }: EditDailyPayrollModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [dailyAllowances, setDailyAllowances] = useState<number | ''>(0);
  const [dailyDeductions, setDailyDeductions] = useState<number | ''>(0);
  const [status, setStatus] = useState('Pending');

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (record) {
        setDailyAllowances(record.dailyAllowances || 0);
        setDailyDeductions(record.dailyDeductions || 0);
        setStatus(record.status || 'Pending');
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, record]);

  if (!isVisible && !isOpen) return null;

  const allow = Number(dailyAllowances) || 0;
  const deduct = Number(dailyDeductions) || 0;
  // Assuming basic daily pay calculation or just using existing daily pay + allowances - deductions
  // The prompt says "daily pay" is a column. Let's assume it's calculated or we just pass it through.
  // Actually, let's just let the user edit allowances and deductions and status.
  const basePay = record?.baseDailyPay || 0; // If we need to calculate
  const dailyPay = basePay + allow - deduct;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedRecord = {
      ...record,
      dailyAllowances: allow,
      dailyDeductions: deduct,
      dailyPay: dailyPay,
      status
    };

    try {
      setIsSubmitting(true);
      
      const payload = {
        id: record.id,
        employee_id: record.employee_id,
        daily_allowances: allow,
        daily_deductions: deduct,
        daily_pay: dailyPay,
        status: status
      };

      await fetch('https://n8n.srv843245.hstgr.cloud/webhook/6630b156-8ebf-40ec-91db-260bae286d59', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      onSave(updatedRecord);
      onClose();
    } catch (error) {
      console.error('Error saving daily payroll:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          "relative w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Edit Daily Payroll</h2>
            <p className="text-xs text-slate-400">{record?.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          <form id="edit-daily-payroll-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Daily Allowances (LKR)
                </label>
                <input 
                  type="number" 
                  min="0"
                  value={dailyAllowances}
                  onChange={(e) => setDailyAllowances(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Daily Deductions (LKR)
                </label>
                <input 
                  type="number" 
                  min="0"
                  value={dailyDeductions}
                  onChange={(e) => setDailyDeductions(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Payment Status
                </label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800/50">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Daily Pay (LKR)
                </label>
                <div className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-lg font-mono font-bold text-emerald-400">
                  {dailyPay.toLocaleString()}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="edit-daily-payroll-form"
            disabled={isSubmitting}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
