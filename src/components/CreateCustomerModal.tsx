import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (customer: any) => void;
}

export default function CreateCustomerModal({ isOpen, onClose, onAddCustomer }: CreateCustomerModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [defaultPayment, setDefaultPayment] = useState('Cash');
  const [creditLimit, setCreditLimit] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      alert('Customer Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: customerName,
        address: location,
        phone: phone,
        default_payment: defaultPayment,
        credit_limit: creditLimit === '' ? 0 : creditLimit
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      onAddCustomer(data);
      
      // Reset form
      setCustomerName('');
      setContactPerson('');
      setPhone('');
      setLocation('');
      setDefaultPayment('Cash');
      setCreditLimit('');
      
      onClose();
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Failed to add customer. Please check the console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers, spaces, and + symbol
    if (/^[\d\s+]*$/.test(value)) {
      setPhone(value);
    }
  };

  const handleCreditLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setCreditLimit('');
      return;
    }
    const num = Number(value);
    if (!isNaN(num) && num >= 0) {
      setCreditLimit(num);
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
          "relative w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-yellow-500" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Add New Customer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Name */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Customer / Business Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Perera Traders"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
              />
            </div>

            {/* Contact Person */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Contact Person
              </label>
              <input 
                type="text" 
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Full name"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Phone
              </label>
              <input 
                type="text" 
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+94 XX XXX XXXX"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Location
              </label>
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City / District"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
              />
            </div>

            {/* Default Payment Method */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Default Payment Method
              </label>
              <select 
                value={defaultPayment}
                onChange={(e) => setDefaultPayment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit">Credit</option>
                <option value="Multi-Cheque">Multi-Cheque</option>
              </select>
            </div>

            {/* Credit Limit */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Credit Limit (LKR)
              </label>
              <input 
                type="number" 
                min="0"
                value={creditLimit}
                onChange={handleCreditLimitChange}
                placeholder="0 = No limit"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]",
                isSubmitting 
                  ? "bg-yellow-500/50 text-slate-900 cursor-not-allowed" 
                  : "bg-yellow-500 hover:bg-yellow-400 text-slate-900"
              )}
            >
              {isSubmitting ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
