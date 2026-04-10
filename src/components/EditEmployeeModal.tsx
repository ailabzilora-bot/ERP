import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  onSave: (updatedEmployee: any) => void;
}

export default function EditEmployeeModal({ isOpen, onClose, employee, onSave }: EditEmployeeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [basicSalary, setBasicSalary] = useState<number | ''>('');
  const [allowances, setAllowances] = useState<number | ''>(0);
  const [nic, setNic] = useState('');
  const [phone, setPhone] = useState('');
  const [deductions, setDeductions] = useState<number | ''>(0);
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState('Pending');

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (employee) {
        setFullName(employee.name || '');
        setRole(employee.roleTitle || '');
        setBasicSalary(employee.basic || '');
        setAllowances(employee.allowances || 0);
        setNic(employee.nic || '');
        setPhone(employee.phone || '');
        setDeductions(employee.deductions || 0);
        setStartDate(employee.startDate || '');
        setStatus(employee.status || 'Pending');
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, employee]);

  if (!isVisible && !isOpen) return null;

  const basic = Number(basicSalary) || 0;
  const allow = Number(allowances) || 0;
  const deduct = Number(deductions) || 0;
  const netPay = basic + allow - deduct;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || basic <= 0) {
      alert('Please fill in required fields correctly.');
      return;
    }

    const updatedEmployee = {
      ...employee,
      name: fullName,
      roleTitle: role,
      basic,
      allowances: allow,
      deductions: deduct,
      netPay,
      nic,
      phone,
      startDate,
      status,
      paymentDate: status === 'Paid' && employee.status !== 'Paid' ? new Date().toISOString().split('T')[0] : employee.paymentDate
    };

    try {
      setIsSubmitting(true);
      
      // Send data to webhook
      await fetch('https://n8n.srv843245.hstgr.cloud/webhook/22c8f311-7763-4e9b-b2d9-dfdc40332866', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEmployee),
      });

      onSave(updatedEmployee);
      onClose();
    } catch (error) {
      console.error('Error sending data to webhook:', error);
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
          "relative w-full max-w-3xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Edit Employee</h2>
            <p className="text-xs text-slate-400">Update employee salary details</p>
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
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Role / Position
                  </label>
                  <input 
                    type="text" 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Mill Operator"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Basic Salary (LKR) *
                  </label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Allowances (LKR)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    value={allowances}
                    onChange={(e) => setAllowances(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    NIC Number
                  </label>
                  <input 
                    type="text" 
                    value={nic}
                    onChange={(e) => setNic(e.target.value)}
                    placeholder="NIC"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Phone
                  </label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 XX XXX XXXX"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Deductions (LKR)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Start Date
                  </label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/50">
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

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Net Pay (LKR)
                </label>
                <div className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-lg font-mono font-bold text-emerald-400">
                  {netPay.toLocaleString()}
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
            form="edit-employee-form"
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
