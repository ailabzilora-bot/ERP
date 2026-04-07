import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Printer, Eye, CreditCard, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import InvoiceDetailModal from '../../components/InvoiceDetailModal';
import CreateInvoiceModal from '../../components/CreateInvoiceModal';
import { supabase } from '../../lib/supabase';

interface Invoice {
  id: string;
  invoice_no: string;
  date: string;
  customer: string;
  amount: number;
  paid: number;
  balance: number;
  paymentType: string;
  status: string;
}

export default function Invoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_no,
          invoice_date,
          total_amount,
          cash_amount,
          cheque_amount,
          payment_method,
          status,
          customers (
            customer_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedInvoices: Invoice[] = data.map((inv: any) => {
          const paid = (inv.cash_amount || 0) + (inv.cheque_amount || 0);
          const balance = inv.total_amount - paid;
          
          let paymentType = 'Cash';
          if (inv.payment_method === 'cash') paymentType = 'Cash';
          else if (inv.payment_method === 'cheque') paymentType = 'Cheque';
          else if (inv.payment_method === 'credit') paymentType = 'Credit';
          else if (inv.payment_method === 'partial') paymentType = 'Partial';

          let status = inv.status;
          if (status === 'paid') status = 'Paid';
          else if (status === 'partial') status = 'Partial';
          else if (status === 'pending') status = 'Pending';
          else if (status === 'overdue') status = 'Overdue';

          return {
            id: inv.id,
            invoice_no: inv.invoice_no,
            date: inv.invoice_date,
            customer: inv.customers?.customer_name || 'Unknown',
            amount: inv.total_amount,
            paid: paid,
            balance: balance,
            paymentType: paymentType,
            status: status
          };
        });
        setInvoices(formattedInvoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalInvoices = invoices.length;
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid, 0);
  const totalPending = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Partial').reduce((sum, inv) => sum + inv.balance, 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.balance, 0);

  const summaryCards = [
    { title: 'Total Invoices', value: totalInvoices.toString(), icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Paid', value: `LKR ${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Pending / Partial', value: `LKR ${totalPending.toLocaleString()}`, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { title: 'Overdue', value: `LKR ${totalOverdue.toLocaleString()}`, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Partial':
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Overdue': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'Cash': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Cheque': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Credit': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Cheque+Cash': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Multi-Cheque': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-[#111827] border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-3 rounded-xl", card.bg)}>
                  <Icon className={cn("w-6 h-6", card.color)} />
                </div>
                <h3 className="text-base font-medium text-slate-400">{card.title}</h3>
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 w-full sm:w-auto gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
            />
          </div>
          <select className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all">
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
          </select>
          <select className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all">
            <option value="all">All Customers</option>
            <option value="acme">Acme Corp</option>
            <option value="global">Global Traders</option>
          </select>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium border border-slate-700 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice #</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium text-right">Amount (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Paid (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Balance</th>
                <th className="px-6 py-4 font-medium text-center">Payment Type</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white">{invoice.invoice_no || invoice.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-slate-300">{invoice.date}</td>
                    <td className="px-6 py-4 text-slate-300">{invoice.customer}</td>
                    <td className="px-6 py-4 text-right font-mono text-white">{invoice.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-green-400">{invoice.paid.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-yellow-500">{invoice.balance.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getPaymentTypeColor(invoice.paymentType))}>
                        {invoice.paymentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(invoice.status))}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="View"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Print">
                          <Printer className="w-4 h-4" />
                        </button>
                        {invoice.balance > 0 && (
                          <button className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg transition-colors text-xs font-medium border border-yellow-500/20 hover:border-yellow-500">
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay
                          </button>
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

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <CreateInvoiceModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}