import React, { useState, useEffect } from 'react';
import { X, FileText, Building2, Calendar, Hash } from 'lucide-react';
import { cn } from '../lib/utils';

interface InvoiceItem {
  product: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  date: string;
  customer: string;
  amount: number;
  paid: number;
  balance: number;
  paymentType: string;
  status: string;
}

// Mock line items per invoice
const invoiceLineItems: Record<string, InvoiceItem[]> = {
  'INV-2026-001': [
    { product: 'Split Red Lentil', qty: 20, unitPrice: 14500, total: 290000 },
    { product: 'Whole Red Lentil', qty: 10, unitPrice: 13200, total: 132000 },
    { product: 'Lentil Flour', qty: 15, unitPrice: 5200, total: 78000 },
  ],
  'INV-2026-002': [
    { product: 'Split Red Lentil', qty: 50, unitPrice: 14500, total: 725000 },
    { product: 'Lentil Husk (By-product)', qty: 5, unitPrice: 5000, total: 25000 },
  ],
  'INV-2026-003': [
    { product: 'Whole Red Lentil', qty: 8, unitPrice: 13200, total: 105600 },
    { product: 'Lentil Flour', qty: 4, unitPrice: 4850, total: 19400 },
  ],
  'INV-2026-004': [
    { product: 'Split Red Lentil', qty: 12, unitPrice: 14500, total: 174000 },
    { product: 'Whole Red Lentil', qty: 8, unitPrice: 13200, total: 105600 },
    { product: 'Lentil Husk (By-product)', qty: 4, unitPrice: 5100, total: 20400 },
  ],
  'INV-2026-005': [
    { product: 'Split Red Lentil', qty: 40, unitPrice: 14500, total: 580000 },
    { product: 'Whole Red Lentil', qty: 20, unitPrice: 13200, total: 264000 },
    { product: 'Lentil Flour', qty: 8, unitPrice: 5200, total: 41600 },
    { product: 'Lentil Husk (By-product)', qty: 3, unitPrice: 4800, total: 14400 },
  ],
};

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceDetailModal({ invoice, isOpen, onClose }: InvoiceDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;
  if (!invoice) return null;

  const lineItems = invoiceLineItems[invoice.id] || [
    { product: 'Lentil Product', qty: 1, unitPrice: invoice.amount, total: invoice.amount },
  ];

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
              <p className="text-xs text-slate-400">{invoice.id}</p>
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
                <p className="text-white font-mono font-semibold">{invoice.id}</p>
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
                  {lineItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3.5 text-white font-medium">{item.product}</td>
                      <td className="px-5 py-3.5 text-center text-slate-300 font-mono">{item.qty}</td>
                      <td className="px-5 py-3.5 text-right text-slate-300 font-mono">{item.unitPrice.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-white font-mono font-medium">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
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
