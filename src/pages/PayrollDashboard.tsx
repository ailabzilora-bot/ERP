import React, { useState, useEffect } from 'react';
import { Plus, Users, Wallet, CheckCircle2, TrendingUp, Edit2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import AddEmployeeModal from '../components/AddEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import EditDailyPayrollModal from '../components/EditDailyPayrollModal';

export default function PayrollDashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [dailyPayroll, setDailyPayroll] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditDailyModalOpen, setIsEditDailyModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<any>(null);
  const [dailyRecordToEdit, setDailyRecordToEdit] = useState<any>(null);

  useEffect(() => {
    fetchPayrollData();
    fetchDailyPayrollData();
  }, []);

  const fetchDailyPayrollData = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_payroll')
        .select(`
          *,
          employees (
            full_name,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map((item: any) => {
          const empName = item.employees?.full_name || 'Unknown';
          const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          
          const colors = ['bg-blue-500/20 text-blue-400', 'bg-purple-500/20 text-purple-400', 'bg-emerald-500/20 text-emerald-400', 'bg-rose-500/20 text-rose-400', 'bg-amber-500/20 text-amber-400'];
          const colorIndex = empName.length % colors.length;

          return {
            id: item.id,
            employee_id: item.employee_id,
            initials,
            name: empName,
            roleTitle: item.employees?.role || 'Employee',
            dailyAllowances: item.daily_allowances || 0,
            dailyDeductions: item.daily_deductions || 0,
            dailyPay: item.daily_pay || 0,
            status: item.status === 'paid' ? 'Paid' : 'Pending',
            avatarColor: colors[colorIndex],
            baseDailyPay: (item.daily_pay || 0) - (item.daily_allowances || 0) + (item.daily_deductions || 0)
          };
        });
        setDailyPayroll(formatted);
      }
    } catch (error) {
      console.error('Error fetching daily payroll:', error);
    }
  };

  const fetchPayrollData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          employees (
            full_name,
            role,
            nic_number,
            phone,
            start_date
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map((item: any) => {
          const empName = item.employees?.full_name || 'Unknown';
          const initials = empName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          
          const colors = ['bg-blue-500/20 text-blue-400', 'bg-purple-500/20 text-purple-400', 'bg-emerald-500/20 text-emerald-400', 'bg-rose-500/20 text-rose-400', 'bg-amber-500/20 text-amber-400'];
          const colorIndex = empName.length % colors.length;

          return {
            id: item.id,
            payroll_id: item.id,
            employee_id: item.employee_id,
            initials,
            name: empName,
            roleTitle: item.employees?.role || 'Employee',
            roleLevel: 'Staff',
            basic: item.basic_salary || 0,
            allowances: item.allowances || 0,
            deductions: item.deductions || 0,
            netPay: item.net_pay || 0,
            paymentDate: item.payment_date || '-',
            status: item.status === 'paid' ? 'Paid' : 'Pending',
            avatarColor: colors[colorIndex],
            nic: item.employees?.nic_number || '',
            phone: item.employees?.phone || '',
            startDate: item.employees?.start_date || ''
          };
        });
        setEmployees(formatted);
      }
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async (payrollId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('payroll')
        .update({ status: 'paid', payment_date: today })
        .eq('id', payrollId);
      
      if (error) throw error;

      setEmployees(prev => prev.map(emp => 
        emp.payroll_id === payrollId 
          ? { ...emp, status: 'Paid', paymentDate: today } 
          : emp
      ));
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status.');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Paid') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (status === 'Pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const totalPayroll = employees.reduce((sum, emp) => sum + emp.netPay, 0);
  const totalEmployees = employees.length;
  const paidThisMonth = employees.filter(emp => emp.status === 'Paid').length;
  const pendingThisMonth = totalEmployees - paidThisMonth;
  const avgSalary = totalEmployees > 0 ? Math.round(totalPayroll / totalEmployees) : 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payroll Management</h1>
          <p className="text-sm text-slate-400 mt-1">Employee salaries & records</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="hidden sm:block text-sm font-medium text-slate-400 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
            Thu, 09 Apr 2026
          </div>
          <button 
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-500">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Total Payroll</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">LKR {(totalPayroll / 1000).toFixed(1)}K</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm relative">
            <span className="text-slate-500">Current Month</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Employees</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">{totalEmployees}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm relative">
            <span className="text-emerald-400">Active</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Paid This Month</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">{paidThisMonth}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm relative">
            <span className="text-yellow-500">{pendingThisMonth} pending</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Avg. Salary</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">LKR {(avgSalary / 1000).toFixed(1)}K</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm relative">
            <span className="text-slate-500">Per employee</span>
          </div>
        </div>
      </div>

      {/* Payroll Table Section */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-white">Payroll — March 2026</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setIsAddEmployeeModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium border border-slate-700"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
            <button 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-[0_0_15px_rgba(234,179,8,0.2)]"
            >
              Finalize Payroll
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium text-right">Basic (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Allowances (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Deductions (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Net Pay (LKR)</th>
                <th className="px-6 py-4 font-medium text-center">Payment Date</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", emp.avatarColor)}>
                        {emp.initials}
                      </div>
                      <div>
                        <div className="font-medium text-white">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.roleTitle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 whitespace-nowrap">{emp.roleLevel}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-400 whitespace-nowrap">{emp.basic.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400/80 whitespace-nowrap">+{emp.allowances.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono text-red-400/80 whitespace-nowrap">-{emp.deductions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-white whitespace-nowrap">
                    <span className="bg-slate-800/50 px-2 py-1 rounded-md">
                      {emp.netPay.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-400 whitespace-nowrap">{emp.paymentDate}</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusBadge(emp.status))}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {emp.status === 'Pending' && (
                        <button 
                          onClick={() => handlePay(emp.id)}
                          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Pay
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setEmployeeToEdit(emp);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Payroll Table Section */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col mt-6">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-white">
            Payroll — {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium text-right">Daily Allowances (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Daily Deductions (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Daily Pay (LKR)</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {dailyPayroll.map((record) => (
                <tr key={record.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", record.avatarColor)}>
                        {record.initials}
                      </div>
                      <div>
                        <div className="font-medium text-white">{record.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 whitespace-nowrap">{record.roleTitle}</td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400/80 whitespace-nowrap">+{record.dailyAllowances.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono text-red-400/80 whitespace-nowrap">-{record.dailyDeductions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-white whitespace-nowrap">
                    <span className="bg-slate-800/50 px-2 py-1 rounded-md">
                      {record.dailyPay.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusBadge(record.status))}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setDailyRecordToEdit(record);
                          setIsEditDailyModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {dailyPayroll.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No daily payroll records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onAdd={fetchPayrollData}
      />

      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEmployeeToEdit(null);
        }}
        employee={employeeToEdit}
        onSave={(updatedEmployee) => {
          // Update local state only (UI mock)
          setEmployees(prev => prev.map(emp => 
            emp.id === updatedEmployee.id ? updatedEmployee : emp
          ));
        }}
      />

      <EditDailyPayrollModal
        isOpen={isEditDailyModalOpen}
        onClose={() => {
          setIsEditDailyModalOpen(false);
          setDailyRecordToEdit(null);
        }}
        record={dailyRecordToEdit}
        onSave={(updatedRecord) => {
          // Update local state only (UI mock)
          setDailyPayroll(prev => prev.map(rec => 
            rec.id === updatedRecord.id ? updatedRecord : rec
          ));
        }}
      />
    </div>
  );
}
