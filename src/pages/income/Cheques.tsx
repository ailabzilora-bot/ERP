import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Building2, ArrowRightLeft, CreditCard, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import RegisterBankModal from '../../components/RegisterBankModal';
import RescheduleChequeModal from '../../components/RescheduleChequeModal';
import DepositChequeModal from '../../components/DepositChequeModal';

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

interface BankAccount {
  id: string;
  name: string;
  accountNo: string;
  branch: string;
  balance: number | string;
  type: string;
}

export default function Cheques() {
  const [allCheques, setAllCheques] = useState<Cheque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterBankModalOpen, setIsRegisterBankModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedChequeForReschedule, setSelectedChequeForReschedule] = useState<{id: string, date: string} | null>(null);
  
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedChequeForDeposit, setSelectedChequeForDeposit] = useState<Cheque | null>(null);

  const [selectedBanks, setSelectedBanks] = useState<Record<string, string>>({});
  const [isDepositing, setIsDepositing] = useState<string | null>(null);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isBanksLoading, setIsBanksLoading] = useState(true);

  useEffect(() => {
    fetchCheques();
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setIsBanksLoading(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedBanks: BankAccount[] = data.map((item: any) => ({
          id: item.id,
          name: item.bank_name || '-',
          accountNo: item.account_number || '-',
          branch: item.branch || '-',
          balance: item.current_balance || 0,
          type: item.account_type || 'Current'
        }));
        setBankAccounts(formattedBanks);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setIsBanksLoading(false);
    }
  };

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

  const uniqueBankNames = Array.from(new Set(bankAccounts.map(b => b.name)));

  const handleBankSelect = (chequeId: string, bankName: string) => {
    setSelectedBanks(prev => ({ ...prev, [chequeId]: bankName }));
  };

  const handleInlineDeposit = async (cheque: Cheque) => {
    const selectedBankName = selectedBanks[cheque.id];
    if (!selectedBankName) {
      alert('Please allocate a bank before depositing.');
      return;
    }

    const bankAccount = bankAccounts.find(b => b.name === selectedBankName);
    if (!bankAccount) {
      alert('Selected bank account not found.');
      return;
    }

    try {
      setIsDepositing(cheque.id);

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
        .update({ status: 'paid', bank: selectedBankName })
        .eq('id', cheque.id);

      if (invoiceError) throw invoiceError;

      // Update local state
      setAllCheques(prev => prev.map(c => c.id === cheque.id ? { ...c, status: 'Deposited', bank: selectedBankName } : c));
      setBankAccounts(prev => prev.map(b => b.id === bankAccount.id ? { ...b, balance: formattedBalance } : b));
      
      // Clear selection
      setSelectedBanks(prev => {
        const newState = { ...prev };
        delete newState[cheque.id];
        return newState;
      });

    } catch (error) {
      console.error('Error depositing cheque:', error);
      alert('Failed to deposit cheque. Please try again.');
    } finally {
      setIsDepositing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Due Today': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Deposited': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6">
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
                  <select 
                    value={selectedBanks[cheque.id] || ''}
                    onChange={(e) => handleBankSelect(cheque.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  >
                    <option value="">Allocate to bank...</option>
                    {uniqueBankNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleInlineDeposit(cheque)}
                      disabled={isDepositing === cheque.id}
                      className="flex-1 sm:flex-none px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDepositing === cheque.id ? 'Depositing...' : 'Deposit'}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedChequeForReschedule({ id: cheque.id, date: cheque.dueDate });
                        setIsRescheduleModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors font-medium text-sm border border-slate-700"
                    >
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
                              <button 
                                onClick={() => {
                                  setSelectedChequeForDeposit(cheque);
                                  setIsDepositModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors" 
                                title="Deposit"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedChequeForReschedule({ id: cheque.id, date: cheque.dueDate });
                                  setIsRescheduleModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" 
                                title="Reschedule"
                              >
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
        {/* Bottom Panels: Bank Accounts & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank Accounts */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-white">Bank Accounts</h3>
              </div>
              <button 
                onClick={() => setIsRegisterBankModalOpen(true)}
                className="p-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg transition-colors"
                title="Add Bank Account"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Bank & Branch</th>
                    <th className="px-6 py-4 font-medium">Account No.</th>
                    <th className="px-6 py-4 font-medium text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {isBanksLoading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400">Loading bank accounts...</td>
                    </tr>
                  ) : bankAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400">No bank accounts found</td>
                    </tr>
                  ) : (
                    bankAccounts.map((bank) => (
                      <tr key={bank.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{bank.name}</div>
                          <div className="text-xs text-slate-500">{bank.branch}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-400">{bank.accountNo}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                          {typeof bank.balance === 'number' ? `LKR ${bank.balance.toLocaleString()}` : bank.balance}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cheque Analytics */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 p-6 border-b border-slate-800 bg-slate-900/50">
              <CreditCard className="w-5 h-5 text-slate-400" />
              <h3 className="font-semibold text-white">Cheque Analytics</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Metric</th>
                    <th className="px-6 py-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-400">Due this week</td>
                    <td className="px-6 py-4 text-right font-mono text-yellow-400 font-medium">LKR 900,000</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-400">Due next week</td>
                    <td className="px-6 py-4 text-right font-mono text-blue-400 font-medium">LKR 150,000</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-400">Deposited this month</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400 font-medium">LKR 300,000</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-400">Cheques payable</td>
                    <td className="px-6 py-4 text-right font-mono text-red-400 font-medium">LKR 0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <RegisterBankModal 
        isOpen={isRegisterBankModalOpen}
        onClose={() => setIsRegisterBankModalOpen(false)}
        onAddAccount={(newAccount) => {
          setBankAccounts(prev => [newAccount, ...prev]);
        }}
      />

      <RescheduleChequeModal 
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setSelectedChequeForReschedule(null);
        }}
        chequeId={selectedChequeForReschedule?.id || null}
        currentDate={selectedChequeForReschedule?.date || ''}
        onReschedule={(id, newDate) => {
          setAllCheques(prev => prev.map(c => c.id === id ? { ...c, dueDate: newDate } : c));
        }}
      />

      <DepositChequeModal
        isOpen={isDepositModalOpen}
        onClose={() => {
          setIsDepositModalOpen(false);
          setSelectedChequeForDeposit(null);
        }}
        cheque={selectedChequeForDeposit}
        bankAccounts={bankAccounts}
        onDeposit={(id, bankName, newBalance) => {
          setAllCheques(prev => prev.map(c => c.id === id ? { ...c, status: 'Deposited', bank: bankName } : c));
          setBankAccounts(prev => prev.map(b => b.name === bankName ? { ...b, balance: newBalance } : b));
        }}
      />
    </div>
  );
}
