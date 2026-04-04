import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Phone, Edit2, DollarSign, ChevronRight, Building2, Download, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

export default function Suppliers() {
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);
  const [payingSupplier, setPayingSupplier] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState({
    cashAmount: '',
    chequeAmount: '',
    chequeNo: '',
    bankBranch: '',
    chequeDate: '',
    paymentRef: ''
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [addSupplierForm, setAddSupplierForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });
  const [updatingSupplier, setUpdatingSupplier] = useState(false);
  const [editSupplierForm, setEditSupplierForm] = useState({
    id: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [editForm, setEditForm] = useState({
    description: '',
    debit: '',
    credit: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);

      // Fetch suppliers with their GRNs and Payments to get descriptions
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select(`
          *,
          grn_entries (
            id,
            grn_no,
            grn_date,
            total_amount,
            paid_amount,
            status,
            supplier_invoice_no,
            payments (
              id,
              amount,
              payment_method,
              payment_date,
              notes
            ),
            grn_items (
              qty,
              unit_price
            )
          )
        `);

      if (suppliersError) throw suppliersError;

      // Fetch ledger data
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('supplier_transactions')
        .select('*')
        .order('transaction_date', { ascending: true });

      if (ledgerError) throw ledgerError;

      const formattedSuppliers = (suppliersData || []).map(supplier => {
        let totalPurchased = 0;
        let totalPaid = 0;
        let transactions: any[] = [];
        let recentPayments: any[] = [];

        // Create lookup maps for descriptions
        const grnDescriptions: Record<string, string> = {};
        const paymentDescriptions: Record<string, string> = {};
        const paymentMethods: Record<string, string> = {};
        
        const allGrns = supplier.grn_entries || [];
        allGrns.forEach((grn: any) => {
          grnDescriptions[grn.id] = grn.supplier_invoice_no || 'Goods Received Note';
          
          const grnPayments = grn.payments || [];
          grnPayments.forEach((payment: any) => {
            paymentDescriptions[payment.id] = payment.notes || `Payment (${payment.payment_method})`;
            paymentMethods[payment.id] = payment.payment_method;
            
            recentPayments.push({
              id: payment.id,
              ref: payment.notes || 'Payment',
              date: payment.payment_date,
              method: payment.payment_method,
              amount: Number(payment.amount) || 0
            });
          });
        });

        // Process transactions from ledger data
        const supplierLedger = ledgerData?.filter(l => l.supplier_id === supplier.id) || [];
        
        supplierLedger.forEach(l => {
          const isGrn = l.transaction_type === 'GRN';
          const refId = isGrn ? l.grn_id : l.payment_id;
          
          if (isGrn) {
            totalPurchased += Number(l.debit) || 0;
          } else {
            totalPaid += Number(l.credit) || 0;
          }

          transactions.push({
            id: isGrn ? `grn-${refId}` : `pmt-${refId}`,
            date: l.transaction_date,
            ref: l.reference,
            description: l.description || (isGrn 
              ? (grnDescriptions[refId] || 'Goods Received Note')
              : (paymentDescriptions[refId] || 'Payment')),
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            balance: Number(l.balance) || 0
          });
        });

        // Sort recent payments by date descending
        recentPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const outstanding = totalPurchased - totalPaid;
        let status = 'Paid';
        if (outstanding > 0 && totalPaid > 0) status = 'Partial';
        else if (outstanding > 0 && totalPaid === 0) status = 'Unpaid';

        return {
          id: supplier.id,
          name: supplier.company_name,
          contact_person: supplier.contact_person,
          email: supplier.email,
          location: supplier.address || 'N/A',
          phone: supplier.phone || 'N/A',
          terms: supplier.payment_terms || 'N/A',
          outstanding,
          status,
          totalPurchased,
          totalPaid,
          transactions,
          recentPayments: recentPayments.slice(0, 5) // Keep only 5 most recent
        };
      });

      setSuppliers(formattedSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaySubmit = async () => {
    if (!payingSupplier) return;
    
    let paymentAmount = 0;
    if (paymentMethod === 'cash') {
      paymentAmount = Number(paymentDetails.cashAmount) || 0;
    } else if (paymentMethod === 'cheque') {
      paymentAmount = Number(paymentDetails.chequeAmount) || 0;
    } else if (paymentMethod === 'partial') {
      paymentAmount = (Number(paymentDetails.cashAmount) || 0) + (Number(paymentDetails.chequeAmount) || 0);
    }

    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      // Find the oldest unpaid GRNs for this supplier
      const { data: grns, error: grnError } = await supabase
        .from('grn_entries')
        .select('*')
        .eq('supplier_id', payingSupplier.id)
        .neq('status', 'paid')
        .order('grn_date', { ascending: true });

      if (grnError) throw grnError;

      let remainingPayment = paymentAmount;
      
      for (const grn of (grns || [])) {
        if (remainingPayment <= 0) break;

        const grnOutstanding = Number(grn.total_amount) - Number(grn.paid_amount);
        const amountToApply = Math.min(remainingPayment, grnOutstanding);
        
        const paymentRef = paymentDetails.paymentRef || `PMT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const currentDate = format(new Date(), 'yyyy-MM-dd');

        // Insert payment
        const { error: insertError } = await supabase
          .from('payments')
          .insert({
            grn_id: grn.id,
            amount: amountToApply,
            payment_method: paymentMethod === 'partial' ? 'Cash & Cheque' : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
            payment_date: currentDate,
            notes: paymentRef
          });

        if (insertError) throw insertError;

        // Update GRN
        const newPaidAmount = Number(grn.paid_amount) + amountToApply;
        const newStatus = newPaidAmount >= Number(grn.total_amount) ? 'paid' : 'partial';

        const { error: updateError } = await supabase
          .from('grn_entries')
          .update({
            paid_amount: newPaidAmount,
            status: newStatus
          })
          .eq('id', grn.id);

        if (updateError) throw updateError;

        remainingPayment -= amountToApply;
      }

      // Refresh suppliers data
      await fetchSuppliers();

      setPayingSupplier(null);
      setPaymentMethod('cash');
      setPaymentDetails({
        cashAmount: '',
        chequeAmount: '',
        chequeNo: '',
        bankBranch: '',
        chequeDate: '',
        paymentRef: ''
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment. Please try again.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSupplierId(expandedSupplierId === id ? null : id);
  };

  const handleEditSupplierClick = (supplier: any) => {
    setEditSupplierForm({
      id: supplier.id,
      companyName: supplier.name || '',
      contactPerson: supplier.contact_person || '',
      phone: supplier.phone !== 'N/A' ? supplier.phone : '',
      email: supplier.email || '',
      address: supplier.location !== 'N/A' ? supplier.location : ''
    });
    setShowEditSupplierModal(true);
  };

  const handleAddSupplier = async () => {
    if (!addSupplierForm.companyName) {
      alert('Company Name is required.');
      return;
    }

    try {
      setAddingSupplier(true);
      const { error } = await supabase
        .from('suppliers')
        .insert([{
          company_name: addSupplierForm.companyName,
          contact_person: addSupplierForm.contactPerson,
          phone: addSupplierForm.phone,
          email: addSupplierForm.email,
          address: addSupplierForm.address
        }]);

      if (error) throw error;

      await fetchSuppliers();
      setShowAddSupplierModal(false);
      setAddSupplierForm({
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: ''
      });
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('Failed to add supplier. Please try again.');
    } finally {
      setAddingSupplier(false);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editSupplierForm.companyName) {
      alert('Company Name is required.');
      return;
    }

    try {
      setUpdatingSupplier(true);
      const { error } = await supabase
        .from('suppliers')
        .update({
          company_name: editSupplierForm.companyName,
          contact_person: editSupplierForm.contactPerson,
          phone: editSupplierForm.phone,
          email: editSupplierForm.email,
          address: editSupplierForm.address
        })
        .eq('id', editSupplierForm.id);

      if (error) throw error;

      await fetchSuppliers();
      setShowEditSupplierModal(false);
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert('Failed to update supplier. Please try again.');
    } finally {
      setUpdatingSupplier(false);
    }
  };

  const handleEditTransactionClick = (t: any) => {
    setEditingTransaction(t);
    setEditForm({
      description: t.description,
      debit: t.debit.toString(),
      credit: t.credit.toString()
    });
  };

  const handleSaveTransaction = async () => {
    if (!editingTransaction) return;
    
    try {
      setSavingTransaction(true);
      
      const originalId = editingTransaction.id.replace('grn-', '').replace('pmt-', '');
      
      const payload = {
        transactionId: originalId,
        type: editingTransaction.id.startsWith('grn-') ? 'GRN' : 'Payment',
        originalTransaction: {
          ...editingTransaction,
          id: originalId
        },
        updatedDetails: {
          description: editForm.description,
          debit: Number(editForm.debit),
          credit: Number(editForm.credit)
        }
      };

      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/5054af35-0291-431a-977f-78b7cd6f8880', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error response:', response.status, errorText);
        throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
      }
      
      setEditingTransaction(null);
      alert('Transaction edit sent successfully!');
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction. Please try again.');
    } finally {
      setSavingTransaction(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-yellow-500" />
          Supplier Directory
        </h2>
        <button
          onClick={() => setShowAddSupplierModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          New Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No suppliers found.</div>
        ) : suppliers.map(supplier => {
          const isExpanded = expandedSupplierId === supplier.id;
          
          return (
            <div key={supplier.id} className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col hover:border-slate-700 transition-colors group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-yellow-500 shrink-0">
                    {supplier.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{supplier.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {supplier.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {supplier.phone}
                      </div>
                      <div className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium">
                        {supplier.terms}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Outstanding</div>
                    <div className="text-xl font-bold text-white font-mono">
                      LKR {supplier.outstanding.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="w-24 text-right">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border inline-block",
                      supplier.status === 'Paid' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                      supplier.status === 'Partial' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {supplier.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {supplier.status !== 'Paid' && (
                      <button 
                        onClick={() => setPayingSupplier(supplier)}
                        className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Pay
                      </button>
                    )}
                    <button 
                      onClick={() => handleEditSupplierClick(supplier)}
                      className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors" 
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => toggleExpand(supplier.id)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" 
                      title="View Details"
                    >
                      <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", isExpanded && "rotate-90")} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Section */}
              {isExpanded && (
                <div className="mt-6 pt-6 border-t border-slate-800 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left side: Transaction History (70%) */}
                    <div className="lg:w-[70%]">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold">Transaction History</h4>
                        <div className="flex items-center gap-3">
                          <select className="bg-[#0a0f1c] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500">
                            <option>2026-04</option>
                            <option>2026-03</option>
                          </select>
                          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
                            <Download className="w-4 h-4" />
                            Export PDF
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Ref</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 text-right">Debit (LKR)</th>
                                <th className="px-4 py-3 text-right">Credit (LKR)</th>
                                <th className="px-4 py-3 text-right">Balance</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {supplier.transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                                  <td className="px-4 py-3 text-sm text-slate-400">{t.date}</td>
                                  <td className="px-4 py-3 text-sm text-white font-mono">{t.ref}</td>
                                  <td className="px-4 py-3 text-sm text-slate-300">{t.description}</td>
                                  <td className="px-4 py-3 text-sm text-red-400 text-right font-mono">
                                    {t.debit > 0 ? t.debit.toLocaleString() : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-green-400 text-right font-mono">
                                    {t.credit > 0 ? t.credit.toLocaleString() : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-white text-right font-mono">{t.balance.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-center">
                                    <button 
                                      onClick={() => handleEditTransactionClick(t)}
                                      className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                                      title="Edit Transaction"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Summary Panel (30%) */}
                    <div className="lg:w-[30%] space-y-6">
                      <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl p-5">
                        <h4 className="text-white font-bold mb-4">Summary</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Total Purchased</span>
                            <span className="text-sm font-bold text-white font-mono">LKR {supplier.totalPurchased.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-400">Total Paid</span>
                            <span className="text-sm font-bold text-green-400 font-mono">LKR {supplier.totalPaid.toLocaleString()}</span>
                          </div>
                          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-sm text-slate-400">Outstanding</span>
                            <span className="text-base font-bold text-red-400 font-mono">LKR {supplier.outstanding.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl p-5">
                        <h4 className="text-white font-bold mb-4">Recent Payments</h4>
                        {supplier.recentPayments.length > 0 ? (
                          <div className="space-y-3">
                            {supplier.recentPayments.map(p => (
                              <div key={p.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg border border-slate-800/50">
                                <div>
                                  <div className="text-xs font-medium text-white font-mono">{p.ref}</div>
                                  <div className="text-xs text-slate-500">{p.date} • {p.method}</div>
                                </div>
                                <div className="text-sm font-bold text-green-400 font-mono">
                                  {p.amount.toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 text-center py-4">
                            No recent payments
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pay Supplier Modal */}
      {payingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPayingSupplier(null)}
          />
          <div className="relative w-full max-w-md bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-500" />
                Make Payment
              </h2>
              <button 
                onClick={() => setPayingSupplier(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500 mb-1">Supplier</div>
                  <div className="text-white font-medium">{payingSupplier.name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Payment Date</div>
                  <div className="text-white font-medium">{format(new Date(), 'dd MMM yyyy')}</div>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-sm text-slate-400">Outstanding Balance</span>
                <span className="text-lg font-bold text-red-400 font-mono">LKR {payingSupplier.outstanding.toLocaleString()}</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Payment Method</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="partial">Partial (Cash & Cheque)</option>
                  </select>
                </div>

                {(paymentMethod === 'cash' || paymentMethod === 'partial') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Cash Amount (LKR)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={paymentDetails.cashAmount}
                      onChange={(e) => setPaymentDetails({...paymentDetails, cashAmount: e.target.value})}
                      className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {(paymentMethod === 'cheque' || paymentMethod === 'partial') && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Cheque Amount (LKR)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={paymentDetails.chequeAmount}
                        onChange={(e) => setPaymentDetails({...paymentDetails, chequeAmount: e.target.value})}
                        className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Cheque No.</label>
                      <input 
                        type="text" 
                        value={paymentDetails.chequeNo}
                        onChange={(e) => setPaymentDetails({...paymentDetails, chequeNo: e.target.value})}
                        className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        placeholder="Enter cheque number"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Bank & Branch</label>
                      <input 
                        type="text" 
                        value={paymentDetails.bankBranch}
                        onChange={(e) => setPaymentDetails({...paymentDetails, bankBranch: e.target.value})}
                        className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        placeholder="e.g. BOC - City Branch"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Cheque Date</label>
                      <input 
                        type="date" 
                        value={paymentDetails.chequeDate}
                        onChange={(e) => setPaymentDetails({...paymentDetails, chequeDate: e.target.value})}
                        className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Payment Ref (Optional)</label>
                  <input 
                    type="text" 
                    value={paymentDetails.paymentRef}
                    onChange={(e) => setPaymentDetails({...paymentDetails, paymentRef: e.target.value})}
                    className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                    placeholder="Receipt or reference number"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setPayingSupplier(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={handlePaySubmit}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                <DollarSign className="w-4 h-4" />
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Supplier Modal */}
      {showEditSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-yellow-500" />
                Edit Supplier
              </h3>
              <button 
                onClick={() => setShowEditSupplierModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Company Name *</label>
                <input 
                  type="text" 
                  value={editSupplierForm.companyName}
                  onChange={(e) => setEditSupplierForm({...editSupplierForm, companyName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter company name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label>
                <input 
                  type="text" 
                  value={editSupplierForm.contactPerson}
                  onChange={(e) => setEditSupplierForm({...editSupplierForm, contactPerson: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter contact person name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                <input 
                  type="text" 
                  value={editSupplierForm.phone}
                  onChange={(e) => setEditSupplierForm({...editSupplierForm, phone: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editSupplierForm.email}
                  onChange={(e) => setEditSupplierForm({...editSupplierForm, email: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Address / Location</label>
                <textarea 
                  value={editSupplierForm.address}
                  onChange={(e) => setEditSupplierForm({...editSupplierForm, address: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all resize-none"
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowEditSupplierModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                disabled={updatingSupplier}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateSupplier}
                disabled={updatingSupplier || !editSupplierForm.companyName}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                {updatingSupplier ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-yellow-500" />
                Edit Transaction
              </h3>
              <button 
                onClick={() => setEditingTransaction(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                  <input 
                    type="text" 
                    value={editingTransaction.date}
                    disabled
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Ref</label>
                  <input 
                    type="text" 
                    value={editingTransaction.ref}
                    disabled
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <input 
                  type="text" 
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Debit (LKR)</label>
                  <input 
                    type="number" 
                    value={editForm.debit}
                    onChange={(e) => setEditForm({...editForm, debit: e.target.value})}
                    disabled={editingTransaction.id.startsWith('pmt-')}
                    className={cn(
                      "w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all",
                      editingTransaction.id.startsWith('pmt-') && "opacity-50 cursor-not-allowed"
                    )}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Credit (LKR)</label>
                  <input 
                    type="number" 
                    value={editForm.credit}
                    onChange={(e) => setEditForm({...editForm, credit: e.target.value})}
                    disabled={editingTransaction.id.startsWith('grn-')}
                    className={cn(
                      "w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all",
                      editingTransaction.id.startsWith('grn-') && "opacity-50 cursor-not-allowed"
                    )}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Balance (Auto-calculated)</label>
                <input 
                  type="text" 
                  value={editingTransaction.balance.toLocaleString()}
                  disabled
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
              <button 
                onClick={() => setEditingTransaction(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                disabled={savingTransaction}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTransaction}
                disabled={savingTransaction}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                {savingTransaction ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-yellow-500" />
                Add New Supplier
              </h3>
              <button 
                onClick={() => setShowAddSupplierModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Company Name *</label>
                <input 
                  type="text" 
                  value={addSupplierForm.companyName}
                  onChange={(e) => setAddSupplierForm({...addSupplierForm, companyName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  placeholder="Enter company name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label>
                <input 
                  type="text" 
                  value={addSupplierForm.contactPerson}
                  onChange={(e) => setAddSupplierForm({...addSupplierForm, contactPerson: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  placeholder="Enter contact person name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={addSupplierForm.phone}
                  onChange={(e) => setAddSupplierForm({...addSupplierForm, phone: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={addSupplierForm.email}
                  onChange={(e) => setAddSupplierForm({...addSupplierForm, email: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
                <textarea 
                  value={addSupplierForm.address}
                  onChange={(e) => setAddSupplierForm({...addSupplierForm, address: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all resize-none h-24"
                  placeholder="Enter full address"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddSupplierModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                disabled={addingSupplier}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSupplier}
                disabled={addingSupplier || !addSupplierForm.companyName}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                {addingSupplier ? 'Adding...' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
