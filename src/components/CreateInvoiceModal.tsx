import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Banknote, CreditCard, Receipt, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Customer {
  id: string;
  customer_name: string;
}

interface Product {
  id: string;
  product_name: string;
  unit_price_lkr: number;
}

export default function CreateInvoiceModal({ isOpen, onClose }: CreateInvoiceModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Data state
  const [dbCustomers, setDbCustomers] = useState<Customer[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Form state
  const [customer, setCustomer] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [cashAmount, setCashAmount] = useState<number>(0);
  const [chequeAmount, setChequeAmount] = useState<number>(0);
  const [chequeNo, setChequeNo] = useState('');
  const [bank, setBank] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  const [products, setProducts] = useState([
    { id: Date.now(), product: '', qty: 0, unitPrice: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      
      const [customersRes, productsRes] = await Promise.all([
        supabase.from('customers').select('id, customer_name').order('customer_name'),
        supabase.from('products').select('id, product_name, unit_price_lkr').order('product_name')
      ]);

      if (customersRes.error) throw customersRes.error;
      if (productsRes.error) throw productsRes.error;

      setDbCustomers(customersRes.data || []);
      setDbProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching data for invoice:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const subtotal = products.reduce((sum, p) => sum + (p.qty * p.unitPrice), 0);
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    if (paymentMethod === 'cash') {
      setCashAmount(total);
      setChequeAmount(0);
    } else if (paymentMethod === 'cheque') {
      setChequeAmount(total);
      setCashAmount(0);
    } else if (paymentMethod === 'credit') {
      setCashAmount(0);
      setChequeAmount(0);
    }
  }, [paymentMethod, total]);

  const totalPayment = (cashAmount || 0) + (chequeAmount || 0);
  const isPaymentExceeded = totalPayment > total;

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  const handleAddProduct = () => {
    setProducts([...products, { id: Date.now(), product: '', qty: 0, unitPrice: 0 }]);
  };

  const handleRemoveProduct = (id: number) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleProductChange = (id: number, field: string, value: string | number) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        const updatedProduct = { ...p, [field]: value };
        
        // Auto-fill unit price when product is selected
        if (field === 'product') {
          const selectedDbProduct = dbProducts.find(dp => dp.id === value);
          if (selectedDbProduct) {
            updatedProduct.unitPrice = selectedDbProduct.unit_price_lkr;
          } else {
            updatedProduct.unitPrice = 0;
          }
        }
        
        return updatedProduct;
      }
      return p;
    }));
  };

  const handleCreateInvoice = async () => {
    if (!customer || !invoiceDate || !dueDate || products.length === 0 || !products[0].product) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert into invoices table
      const invoicePayload = {
        customer_id: customer,
        invoice_date: invoiceDate,
        due_date: dueDate,
        discount: discount,
        payment_method: paymentMethod,
        cash_amount: cashAmount,
        cheque_amount: chequeAmount,
        cheque_no: chequeNo || null,
        bank: bank || null,
        cheque_date: chequeDate || null,
        total_amount: total,
        status: paymentMethod
      };

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select('id')
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData.id;

      // 2. Send invoice items to webhook
      const invoiceItemsPayload = products.map(p => ({
        invoice_id: invoiceId,
        product_id: p.product,
        qty_bags: p.qty,
        unit_price: p.unitPrice,
        total: p.qty * p.unitPrice
      }));

      const webhookResponse = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/9c6661d7-157f-4085-b99d-ef4e4f02d734', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: invoiceItemsPayload }),
      });

      if (!webhookResponse.ok) {
        console.error('Failed to send invoice items to webhook', webhookResponse.status);
      }

      console.log('Invoice created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please check the console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', label: 'Full Cash (Upfront)', icon: Banknote },
    { id: 'cheque', label: 'Full Cheque (Upfront)', icon: Receipt },
    { id: 'credit', label: 'Credit (Pay Later)', icon: CreditCard },
    { id: 'partial', label: 'Partial Payment (Cash + Cheque)', icon: Wallet },
  ];

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
          "relative w-full max-w-4xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 max-h-[90vh]",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Create New Invoice</h2>
            <p className="text-xs text-slate-400">Sales invoice for finished goods & by-products</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Customer *</label>
              <select 
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
              >
                <option value="">Select customer...</option>
                {dbCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.customer_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Invoice Date *</label>
              <input 
                type="date" 
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Due Date *</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Products</label>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium w-32">Qty (Bags)</th>
                    <th className="px-4 py-3 font-medium w-40">Unit Price</th>
                    <th className="px-4 py-3 font-medium w-40 text-right">Total</th>
                    <th className="px-4 py-3 font-medium w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {products.map((p, index) => (
                    <tr key={p.id} className="bg-slate-900/20">
                      <td className="px-4 py-3">
                        <select 
                          value={p.product}
                          onChange={(e) => handleProductChange(p.id, 'product', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                        >
                          <option value="">Select product...</option>
                          {dbProducts.map(mp => (
                            <option key={mp.id} value={mp.id}>{mp.product_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          min="0"
                          value={p.qty || ''}
                          onChange={(e) => handleProductChange(p.id, 'qty', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          min="0"
                          value={p.unitPrice || ''}
                          onChange={(e) => handleProductChange(p.id, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {(p.qty * p.unitPrice).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => handleRemoveProduct(p.id)}
                          disabled={products.length === 1}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 border-t border-slate-800 bg-slate-900/30">
                <button 
                  onClick={handleAddProduct}
                  className="flex items-center gap-2 text-sm font-medium text-yellow-500 hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-500/10"
                >
                  <Plus className="w-4 h-4" />
                  Add Product Line
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="flex flex-col md:flex-row justify-between gap-6 items-start">
            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Discount</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  placeholder="0.00"
                />
                <select className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all">
                  <option value="LKR">LKR</option>
                  <option value="%">%</option>
                </select>
              </div>
            </div>

            <div className="w-full md:w-1/2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono">LKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Discount</span>
                  <span className="font-mono text-red-400">- LKR {discount.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                  <span className="text-base font-medium text-white">Invoice Total</span>
                  <span className="text-2xl font-bold text-yellow-500 font-mono">LKR {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="space-y-4">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Payment Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {paymentMethods.map(method => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-200",
                      isSelected 
                        ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" 
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium text-center">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Details Section */}
          {paymentMethod !== 'credit' && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Payment Details</h3>
                {isPaymentExceeded && (
                  <span className="text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-md">
                    Total payment exceeds invoice total
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(paymentMethod === 'cash' || paymentMethod === 'partial') && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cash Amount (LKR)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={cashAmount || ''}
                      onChange={(e) => setCashAmount(Number(e.target.value))}
                      className={cn(
                        "w-full bg-slate-900 border rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 outline-none transition-all",
                        isPaymentExceeded ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                      )}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {(paymentMethod === 'cheque' || paymentMethod === 'partial') && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cheque Amount (LKR)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={chequeAmount || ''}
                        onChange={(e) => setChequeAmount(Number(e.target.value))}
                        className={cn(
                          "w-full bg-slate-900 border rounded-lg px-4 py-2.5 text-sm text-white focus:ring-1 outline-none transition-all",
                          isPaymentExceeded ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                        )}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cheque No.</label>
                      <input 
                        type="text" 
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                        placeholder="e.g. 123456"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Bank</label>
                      <input 
                        type="text" 
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                        placeholder="e.g. BOC"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cheque Date</label>
                      <input 
                        type="date" 
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all [color-scheme:dark]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            Save Draft
          </button>
          <button 
            onClick={handleCreateInvoice}
            disabled={isSubmitting}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]",
              isSubmitting 
                ? "bg-yellow-500/50 text-slate-900 cursor-not-allowed" 
                : "bg-yellow-500 hover:bg-yellow-400 text-slate-900"
            )}
          >
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
