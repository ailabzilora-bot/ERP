import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface RegisterBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (account: any) => void;
}

export default function RegisterBankModal({ isOpen, onClose, onAddAccount }: RegisterBankModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  // Form State
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [branch, setBranch] = useState('');
  const [accountType, setAccountType] = useState('Current');
  const [currentBalance, setCurrentBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Reset form when opened
      setBankName('');
      setAccountNo('');
      setBranch('');
      setAccountType('Current');
      setCurrentBalance('');
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankName.trim() || !accountNo.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!/^\d+$/.test(accountNo)) {
      alert('Account Number must contain only numbers.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const formattedBalance = currentBalance ? `LKR ${currentBalance}` : 'LKR 0.00';

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          bank_name: bankName,
          account_number: accountNo,
          branch: branch || null,
          account_type: accountType,
          current_balance: formattedBalance
        })
        .select()
        .single();

      if (error) throw error;

      const newAccount = {
        id: data.id,
        name: data.bank_name,
        accountNo: data.account_number,
        branch: data.branch || '-',
        type: data.account_type,
        balance: data.current_balance
      };

      onAddAccount(newAccount);
      onClose();
    } catch (error) {
      console.error('Error saving bank account:', error);
      alert('Failed to save bank account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters except for a single decimal point
    let value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Add commas for thousands
    if (value) {
      const [integerPart, decimalPart] = value.split('.');
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      value = decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
    }

    setCurrentBalance(value);
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
          "relative w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Register Bank Account</h2>
              <p className="text-xs text-slate-400">Add a new bank account for cheque deposits</p>
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
          <form id="register-bank-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Bank Name *
                </label>
                <input 
                  type="text" 
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Bank of Ceylon"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                />
              </div>

              {/* Account Number */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Account Number *
                </label>
                <input 
                  type="text" 
                  required
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 00123456789"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                />
              </div>

              {/* Branch */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Branch
                </label>
                <input 
                  type="text" 
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Negombo"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                />
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Account Type
                </label>
                <select 
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                >
                  <option value="Current">Current</option>
                  <option value="Savings">Savings</option>
                </select>
              </div>

              {/* Current Balance */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Current Balance
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-medium text-sm">LKR</span>
                  </div>
                  <input 
                    type="text" 
                    value={currentBalance}
                    onChange={handleBalanceChange}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-12 pr-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  />
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
            form="register-bank-form"
            disabled={isSubmitting}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Registering...' : 'Register Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
