import React, { useState, useEffect } from 'react';
import { X, FileText, Building2, Calendar, Hash } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface InvoiceItem {
  product: string;
  qty: number;
  unitPrice: number;
  total: number;
}

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

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceDetailModal({ invoice, isOpen, onClose }: InvoiceDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (invoice) {
        fetchInvoiceItems(invoice.id);
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, invoice]);

  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          qty_bags,
          unit_price,
          total,
          products (
            product_name
          )
        `)
        .eq('invoice_id', invoiceId);

      if (error) throw error;

      if (data) {
        const items = data.map((item: any) => ({
          product: item.products?.product_name || 'Unknown Product',
          qty: item.qty_bags,
          unitPrice: item.unit_price,
          total: item.total
        }));
        setLineItems(items);
      }
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      // Fallback if error
      setLineItems([{ product: 'Lentil Product', qty: 1, unitPrice: invoice?.amount || 0, total: invoice?.amount || 0 }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible && !isOpen) return null;
  if (!invoice) return null;

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Partial':
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Overdue': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-3xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Invoice Preview</h2>
              <p className="text-xs text-slate-400">{invoice.invoice_no || invoice.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Invoice Document */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
          <div className="bg-[#0d1321] border border-slate-800 rounded-xl p-8 space-y-8">

            {/* Invoice Header Info */}
            <div className="flex flex-col sm:flex-row justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white tracking-tight">MillERP</h3>
                <p className="text-sm text-slate-400">Lentil Processing & Distribution</p>
              </div>
              <div className="text-left sm:text-right space-y-1">
                <span className={cn("inline-block px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(invoice.status))}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50" />

            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium uppercase tracking-wider">
                  <Hash className="w-3 h-3" />
                  Invoice No.
                </div>
                <p className="text-white font-mono font-semibold">{invoice.invoice_no || invoice.id.substring(0, 8)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium uppercase tracking-wider">
                  <Calendar className="w-3 h-3" />
                  Date
                </div>
                <p className="text-white font-medium">
                  {new Date(invoice.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium uppercase tracking-wider">
                  <Building2 className="w-3 h-3" />
                  Customer
                </div>
                <p className="text-white font-medium">{invoice.customer}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50" />

            {/* Line Items Table */}
            <div className="overflow-hidden rounded-lg border border-slate-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Product</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Qty (bags)</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit Price</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                        Loading items...
                      </td>
                    </tr>
                  ) : lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5 text-white font-medium">{item.product}</td>
                        <td className="px-5 py-3.5 text-center text-slate-300 font-mono">{item.qty}</td>
                        <td className="px-5 py-3.5 text-right text-slate-300 font-mono">{item.unitPrice.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right text-white font-mono font-medium">{item.total.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white font-mono font-medium">LKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-700/50" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-400">Paid</span>
                  <span className="text-green-400 font-mono font-medium">LKR {invoice.paid.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-700/50" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-yellow-500">Balance Due</span>
                  <span className="text-lg font-bold text-yellow-500 font-mono">LKR {invoice.balance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border-t border-slate-700/50 pt-4">
              <p className="text-xs text-slate-500 text-center">
                Payment Method: <span className="text-slate-400 font-medium">{invoice.paymentType}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
