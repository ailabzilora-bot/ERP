import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Building2, ArrowRightLeft, CreditCard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface Cheque {
  id: string;
  chequeNo: string;
  party: string;
  invoice: string;
  amount: number;
  bank: string;
  dueDate: string;
  status: string;
  source: string;
}

export default function Cheques() {
  const [allCheques, setAllCheques] = useState<Cheque[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCheques();
  }, []);

  const fetchCheques = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_no,
          cheque_no,
          cheque_amount,
          bank,
          due_date,
          status,
          payment_method,
          customers (
            customer_name
          )
        `)
        .eq('payment_method', 'cheque');

      if (error) throw error;

      if (data) {
        const today = new Date().toISOString().split('T')[0];
        
        const formattedCheques: Cheque[] = data.map((item: any) => {
          const customerName = item.customers?.customer_name || 'Unknown Customer';
          
          let chequeStatus = 'Upcoming';
          if (item.status === 'paid') {
            chequeStatus = 'Deposited';
          } else if (item.due_date === today) {
            chequeStatus = 'Due Today';
          }

          return {
            id: item.id,
            chequeNo: item.cheque_no || '-',
            party: customerName,
            invoice: item.invoice_no || '-',
            amount: item.cheque_amount || 0,
            bank: item.bank || '-',
            dueDate: item.due_date || '-',
            status: chequeStatus,
            source: `${customerName} (${item.invoice_no || '-'})`
          };
        });

        setAllCheques(formattedCheques);
      }
    } catch (error) {
      console.error('Error fetching cheques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const chequesDueToday = allCheques.filter(c => c.dueDate === todayStr && c.status !== 'Deposited');

  const bankAccounts = [
    { id: '1', name: 'Commercial Bank', accountNo: '1002345678', branch: 'Colombo 01', balance: 1250000 },
    { id: '2', name: 'Bank of Ceylon', accountNo: '87654321', branch: 'Pettah', balance: 850000 },
    { id: '3', name: 'Hatton National Bank', accountNo: '003987654', branch: 'Kollupitiya', balance: 420000 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Due Today': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Deposited': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        
        {/* Alert Banner */}
        {chequesDueToday.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1">
              <p className="text-yellow-500 font-medium text-sm">
                {chequesDueToday.length} cheque{chequesDueToday.length === 1 ? '' : 's'} {chequesDueToday.length === 1 ? 'is' : 'are'} due for deposit today
              </p>
            </div>
          </div>
        )}

        {/* Cheques Due Today Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2 bg-slate-900/50">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-white">Cheques Due Today — {new Date().toLocaleDateString()}</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {isLoading ? (
              <div className="p-6 text-center text-slate-400">Loading cheques...</div>
            ) : chequesDueToday.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No cheques due today</div>
            ) : (
              chequesDueToday.map((cheque) => (
              <div key={cheque.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-white font-medium">{cheque.chequeNo}</span>
                    <span className="text-slate-500 text-sm">•</span>
                    <span className="text-slate-400 text-sm">{cheque.source}</span>
                  </div>
                  <div className="font-mono text-yellow-500 font-bold text-lg">
                    LKR {cheque.amount.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <select className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all">
                    <option value="">Allocate to bank...</option>
                    {bankAccounts.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name} - {bank.accountNo}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button className="flex-1 sm:flex-none px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm">
                      Deposit
                    </button>
                    <button className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors font-medium text-sm border border-slate-700">
                      Reschedule
                    </button>
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* All Cheques Table */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-semibold text-white">All Cheques</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Cheque No.</th>
                  <th className="px-6 py-4 font-medium">Party</th>
                  <th className="px-6 py-4 font-medium">Invoice</th>
                  <th className="px-6 py-4 font-medium text-right">Amount (LKR)</th>
                  <th className="px-6 py-4 font-medium text-center">Bank</th>
                  <th className="px-6 py-4 font-medium text-center">Due Date</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      Loading cheques...
                    </td>
                  </tr>
                ) : allCheques.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      No cheques found
                    </td>
                  </tr>
                ) : (
                  allCheques.map((cheque) => (
                    <tr key={cheque.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-4 font-mono text-white whitespace-nowrap">{cheque.chequeNo}</td>
                      <td className="px-6 py-4 text-slate-300 whitespace-nowrap">{cheque.party}</td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{cheque.invoice}</td>
                      <td className="px-6 py-4 text-right font-mono text-white whitespace-nowrap">{cheque.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center text-slate-400 whitespace-nowrap">{cheque.bank}</td>
                      <td className="px-6 py-4 text-center text-slate-300 whitespace-nowrap">{cheque.dueDate}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap", getStatusBadge(cheque.status))}>
                          {cheque.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {cheque.status !== 'Deposited' && (
                            <>
                              <button className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors" title="Deposit">
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Reschedule">
                                <Calendar className="w-4 h-4" />
                              </button>
                            </>
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
        {/* Bank Accounts */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-white">Bank Accounts</h3>
          </div>
          <div className="space-y-4">
            {bankAccounts.map((bank) => (
              <div key={bank.id} className="p-4 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-white">{bank.name}</h4>
                    <p className="text-xs text-slate-500">{bank.branch}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{bank.accountNo}</span>
                </div>
                <div className="pt-2 border-t border-slate-800/50 mt-2">
                  <p className="text-xs text-slate-500 mb-1">Current Balance</p>
                  <p className="font-mono font-bold text-emerald-400">LKR {bank.balance.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cheque Analytics */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-white">Cheque Analytics</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
              <span className="text-slate-400 text-sm">Due this week</span>
              <span className="font-mono text-yellow-400 font-medium">LKR 900,000</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
              <span className="text-slate-400 text-sm">Due next week</span>
              <span className="font-mono text-blue-400 font-medium">LKR 150,000</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
              <span className="text-slate-400 text-sm">Deposited this month</span>
              <span className="font-mono text-emerald-400 font-medium">LKR 300,000</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
              <span className="text-slate-400 text-sm">Cheques payable</span>
              <span className="font-mono text-red-400 font-medium">LKR 0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
