import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface DepositChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: any;
  bankAccounts: any[];
  onDeposit: (chequeId: string, bankName: string, newBalance: string) => void;
}

export default function DepositChequeModal({ isOpen, onClose, cheque, bankAccounts, onDeposit }: DepositChequeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uniqueBankNames = Array.from(new Set(bankAccounts.map(b => b.name)));

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setSelectedBank('');
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cheque || !selectedBank) {
      alert('Please select a bank.');
      return;
    }

    const bankAccount = bankAccounts.find(b => b.name === selectedBank);
    if (!bankAccount) {
      alert('Selected bank account not found.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Parse current balance
      let currentBalanceNum = 0;
      if (typeof bankAccount.balance === 'string') {
        currentBalanceNum = parseFloat(bankAccount.balance.replace(/[^0-9.-]+/g, ''));
      } else {
        currentBalanceNum = bankAccount.balance;
      }

      const newBalanceNum = currentBalanceNum + cheque.amount;
      
      // Format new balance
      const formattedInteger = Math.floor(newBalanceNum).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const decimalPart = (newBalanceNum % 1).toFixed(2).substring(2);
      const formattedBalance = `LKR ${formattedInteger}.${decimalPart || '00'}`;

      // Update bank_accounts
      const { error: bankError } = await supabase
        .from('bank_accounts')
        .update({ current_balance: formattedBalance })
        .eq('id', bankAccount.id);

      if (bankError) throw bankError;

      // Update invoices (cheque status)
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: 'paid', bank: selectedBank })
        .eq('id', cheque.id);

      if (invoiceError) throw invoiceError;

      onDeposit(cheque.id, selectedBank, formattedBalance);
      onClose();
    } catch (error) {
      console.error('Error depositing cheque:', error);
      alert('Failed to deposit cheque. Please try again.');
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Deposit Cheque</h2>
              <p className="text-xs text-slate-400">Allocate to a bank account</p>
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
        <div className="p-6">
          <form id="deposit-cheque-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Select Bank *
              </label>
              <select 
                required
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="">Allocate to bank...</option>
                {uniqueBankNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
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
            form="deposit-cheque-form"
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Depositing...' : 'Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
}
