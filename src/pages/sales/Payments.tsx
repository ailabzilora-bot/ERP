import React, { useState, useEffect } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface PaymentData {
  id: string;
  date: string;
  invoice: string;
  customer: string;
  cash: number | null;
  cheque: number | null;
  chequeNo: string | null;
  bank: string | null;
  chequeDate: string | null;
  total: number;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_no,
          invoice_date,
          cash_amount,
          cheque_amount,
          cheque_no,
          bank,
          cheque_date,
          status,
          customers (
            customer_name
          )
        `)
        .eq('status', 'paid')
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedPayments: PaymentData[] = data.map((inv: any) => {
          const cash = inv.cash_amount || 0;
          const cheque = inv.cheque_amount || 0;
          return {
            id: inv.id,
            date: inv.invoice_date || '-',
            invoice: inv.invoice_no || inv.id.substring(0, 8),
            customer: inv.customers?.customer_name || '-',
            cash: cash > 0 ? cash : null,
            cheque: cheque > 0 ? cheque : null,
            chequeNo: inv.cheque_no || null,
            bank: inv.bank || null,
            chequeDate: inv.cheque_date || null,
            total: cash + cheque
          };
        });
        setPayments(formattedPayments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 w-full sm:w-auto gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search payments..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
            />
          </div>
          <select className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium border border-slate-700 w-full sm:w-auto justify-center">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Invoice</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium text-right">Cash (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Cheque (LKR)</th>
                <th className="px-6 py-4 font-medium text-center">Cheque No.</th>
                <th className="px-6 py-4 font-medium text-center">Bank</th>
                <th className="px-6 py-4 font-medium text-center">Cheque Date</th>
                <th className="px-6 py-4 font-medium text-right">Total (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-300">{payment.date}</td>
                    <td className="px-6 py-4 font-medium text-white">{payment.invoice}</td>
                    <td className="px-6 py-4 text-slate-300">{payment.customer}</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400">
                      {payment.cash ? payment.cash.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-blue-400">
                      {payment.cheque ? payment.cheque.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400 font-mono">
                      {payment.chequeNo || '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400">
                      {payment.bank || '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400">
                      {payment.chequeDate || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-white">
                      {payment.total.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
