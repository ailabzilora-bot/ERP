import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Save, FileText, TrendingUp, Package, Activity, Edit2, Eye, EyeOff, DollarSign, Users, CreditCard, ShoppingCart, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

export default function GRNEntry() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [invoiceNo, setInvoiceNo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [lines, setLines] = useState([{ id: Date.now().toString(), purchase_item_id: '', description: '', qty: 0, unitPrice: 0 }]);
  
  const [viewingGrn, setViewingGrn] = useState<any>(null);
  const [payingGrn, setPayingGrn] = useState<any>(null);
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
  const [purchaseItems, setPurchaseItems] = useState<any[]>([]);
  const [recentGrns, setRecentGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });
  const [summaryStats, setSummaryStats] = useState({
    thisMonthPurchases: 0,
    grnsProcessed: 0,
    paidAmount: 0,
    settledPercentage: 0,
    outstanding: 0,
    suppliersWithOutstanding: 0,
    activeSuppliers: 0,
    newSuppliersThisMonth: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch suppliers
      const { data: suppliersData } = await supabase.from('suppliers').select('*');
      if (suppliersData) setSuppliers(suppliersData);

      // Fetch purchase items
      const { data: itemsData } = await supabase.from('purchase_items').select('*');
      if (itemsData) setPurchaseItems(itemsData);

      // Fetch recent GRNs
      const { data: grnsData } = await supabase
        .from('grn_entries')
        .select(`
          *,
          suppliers (company_name),
          grn_items (
            id,
            item_name,
            qty,
            unit_price,
            total,
            purchase_items (item_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (grnsData) {
        const formattedGrns = grnsData.map(grn => ({
          id: grn.id,
          grnNo: grn.grn_no,
          invoiceNo: grn.supplier_invoice_no || 'N/A',
          date: grn.grn_date,
          supplier: grn.suppliers?.company_name || 'Unknown',
          items: grn.grn_items?.length || 0,
          total: Number(grn.total_amount) || 0,
          paid: Number(grn.paid_amount) || 0,
          balance: (Number(grn.total_amount) || 0) - (Number(grn.paid_amount) || 0),
          status: grn.status === 'paid' ? 'Paid' : grn.status === 'partial' ? 'Partial' : 'Unpaid',
          lines: (grn.grn_items || []).map((item: any) => ({
            id: item.id,
            description: item.purchase_items?.item_name || item.item_name,
            qty: Number(item.qty),
            unitPrice: Number(item.unit_price),
            total: Number(item.total)
          }))
        }));
        setRecentGrns(formattedGrns);
        
        // Calculate summary stats
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        let thisMonthTotal = 0;
        let thisMonthCount = 0;
        let totalPaidAll = 0;
        let totalPurchasedAll = 0;
        let outstandingTotal = 0;
        const suppliersWithOutstandingSet = new Set();
        
        grnsData.forEach(grn => {
          const grnDate = new Date(grn.grn_date);
          if (grnDate.getMonth() === currentMonth && grnDate.getFullYear() === currentYear) {
            thisMonthTotal += Number(grn.total_amount) || 0;
            thisMonthCount++;
          }
          
          totalPurchasedAll += Number(grn.total_amount) || 0;
          totalPaidAll += Number(grn.paid_amount) || 0;
          
          const balance = (Number(grn.total_amount) || 0) - (Number(grn.paid_amount) || 0);
          if (balance > 0) {
            outstandingTotal += balance;
            suppliersWithOutstandingSet.add(grn.supplier_id);
          }
        });
        
        let newSuppliersCount = 0;
        if (suppliersData) {
          suppliersData.forEach(s => {
            const sDate = new Date(s.created_at);
            if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
              newSuppliersCount++;
            }
          });
        }

        setSummaryStats({
          thisMonthPurchases: thisMonthTotal,
          grnsProcessed: thisMonthCount,
          paidAmount: totalPaidAll,
          settledPercentage: totalPurchasedAll > 0 ? Math.round((totalPaidAll / totalPurchasedAll) * 100) : 0,
          outstanding: outstandingTotal,
          suppliersWithOutstanding: suppliersWithOutstandingSet.size,
          activeSuppliers: suppliersData?.length || 0,
          newSuppliersThisMonth: newSuppliersCount
        });
      }
    } catch (error) {
      console.error('Error fetching GRN data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.companyName) {
      alert('Company Name is required.');
      return;
    }

    try {
      setSavingSupplier(true);
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          company_name: newSupplier.companyName,
          contact_person: newSupplier.contactPerson,
          phone: newSupplier.phone,
          email: newSupplier.email,
          address: newSupplier.address
        })
        .select()
        .single();

      if (error) throw error;

      await fetchData(); // Refresh suppliers list
      setSupplier(data.id); // Auto-select the new supplier
      setShowAddSupplierModal(false);
      setNewSupplier({
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
      setSavingSupplier(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { id: Date.now().toString(), purchase_item_id: '', description: '', qty: 0, unitPrice: 0 }]);
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  const handleLineChange = (id: string, field: string, value: any) => {
    setLines(lines.map(line => line.id === id ? { ...line, [field]: value } : line));
  };

  const grandTotal = useMemo(() => lines.reduce((sum, line) => sum + ((Number(line.qty) || 0) * (Number(line.unitPrice) || 0)), 0), [lines]);

  const handleSave = async () => {
    if (!supplier) {
      alert('Please select a supplier.');
      return;
    }
    if (lines.some(l => (!l.purchase_item_id && !l.description) || l.qty <= 0 || l.unitPrice < 0)) {
      alert('Please fill all item fields correctly. Select an item or enter description, Quantity must be > 0 and Unit Price >= 0.');
      return;
    }

    try {
      setSaving(true);
      
      // Generate GRN number
      const grnNo = `GRN-${format(new Date(), 'yyyy')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      
      // Insert GRN Entry
      const { data: grnEntry, error: grnError } = await supabase
        .from('grn_entries')
        .insert({
          grn_no: grnNo,
          supplier_id: supplier,
          grn_date: date,
          supplier_invoice_no: invoiceNo,
          total_amount: grandTotal,
          paid_amount: 0,
          status: 'unpaid'
        })
        .select()
        .single();
        
      if (grnError) throw grnError;
      
      // Insert GRN Items
      const grnItemsToInsert = lines.map(line => ({
        grn_id: grnEntry.id,
        purchase_item_id: line.purchase_item_id || null,
        item_name: line.purchase_item_id ? null : line.description,
        qty: Number(line.qty),
        unit_price: Number(line.unitPrice),
        total: Number(line.qty) * Number(line.unitPrice)
      }));
      
      const { error: itemsError } = await supabase
        .from('grn_items')
        .insert(grnItemsToInsert);
        
      if (itemsError) throw itemsError;
      
      // Update inventory items
      for (const line of lines) {
        if (line.purchase_item_id) {
          // Fetch current inventory item
          const { data: invData, error: invFetchError } = await supabase
            .from('inventory_items')
            .select('id, current_stock')
            .eq('purchase_item_id', line.purchase_item_id)
            .single();
            
          if (invData) {
            // Update existing
            await supabase
              .from('inventory_items')
              .update({ current_stock: (Number(invData.current_stock) || 0) + Number(line.qty) })
              .eq('id', invData.id);
          } else if (invFetchError && invFetchError.code === 'PGRST116') {
            // Not found, insert new
            await supabase
              .from('inventory_items')
              .insert({
                purchase_item_id: line.purchase_item_id,
                current_stock: Number(line.qty)
              });
          }
        }
      }
      
      // Send data to webhook
      try {
        console.log('Sending data to webhook...', { grnEntry, grnItems: grnItemsToInsert });
        const webhookResponse = await fetch('https://n8n.srv843245.hstgr.cloud/webhook/c2e7ee23-1932-49a1-b00d-8034a3ac0c81', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            grnEntry,
            grnItems: grnItemsToInsert
          }),
        });
        
        console.log('Webhook response status:', webhookResponse.status);
        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error('Webhook failed with status:', webhookResponse.status, 'Response:', errorText);
          // If it's a 404 on a webhook URL, it usually means the n8n workflow is not active
          if (webhookResponse.status === 404 && webhookResponse.url.includes('webhook')) {
            console.warn('Note: n8n webhook returned 404. Ensure the workflow is active in the n8n UI.');
          }
        } else {
          console.log('Webhook sent successfully!');
        }
      } catch (webhookError) {
        console.error('Error sending data to webhook (Network/CORS issue):', webhookError);
        // We don't throw here because the GRN was saved successfully
      }
      
      await fetchData(); // Refresh data
      
      // Reset form
      setLines([{ id: Date.now().toString(), purchase_item_id: '', description: '', qty: 0, unitPrice: 0 }]);
      setInvoiceNo('');
      setSupplier('');
      alert('GRN saved successfully!');
    } catch (error) {
      console.error('Error saving GRN:', error);
      alert('Failed to save GRN. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePaySubmit = async () => {
    if (!payingGrn) return;
    
    // Calculate total payment amount based on method
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
      const paymentRef = paymentDetails.paymentRef || `PMT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      
      // Insert payment
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          grn_id: payingGrn.id,
          amount: paymentAmount,
          payment_method: paymentMethod === 'partial' ? 'Cash & Cheque' : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
          payment_date: currentDate,
          notes: paymentRef
        });
        
      if (insertError) throw insertError;
      
      // Update GRN
      const newPaidAmount = payingGrn.paid + paymentAmount;
      const newStatus = newPaidAmount >= payingGrn.total ? 'paid' : 'partial';
      
      const { error: updateError } = await supabase
        .from('grn_entries')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus
        })
        .eq('id', payingGrn.id);
        
      if (updateError) throw updateError;
      
      await fetchData(); // Refresh data
      
      setPayingGrn(null);
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

  return (
    <div className="space-y-6 pb-12">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-sm font-medium text-slate-400">This Month Purchases</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">LKR {summaryStats.thisMonthPurchases.toLocaleString()}</div>
          <div className="text-sm text-slate-500">{summaryStats.grnsProcessed} GRNs processed</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-sm font-medium text-slate-400">Paid Amount</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">LKR {summaryStats.paidAmount.toLocaleString()}</div>
          <div className="text-sm text-slate-500">{summaryStats.settledPercentage}% settled</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-sm font-medium text-slate-400">Outstanding</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">LKR {summaryStats.outstanding.toLocaleString()}</div>
          <div className="text-sm text-slate-500">Across {summaryStats.suppliersWithOutstanding} suppliers</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-sm font-medium text-slate-400">Active Suppliers</h3>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{summaryStats.activeSuppliers}</div>
          <div className="text-sm text-slate-500">+{summaryStats.newSuppliersThisMonth} new this month</div>
        </div>
      </div>

      {/* GRN Form */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-500" />
            New Goods Received Note
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Supplier</label>
              <div className="flex gap-2">
                <select 
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="flex-1 bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.company_name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddSupplierModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-lg transition-colors border border-slate-700"
                  title="Add New Supplier"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">GRN Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Supplier Invoice No</label>
              <input 
                type="text" 
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="INV-XXXX"
                className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Items</h3>
            <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                    <th className="px-4 py-3 w-[40%]">Item Description</th>
                    <th className="px-4 py-3 w-[15%]">Qty</th>
                    <th className="px-4 py-3 w-[20%]">Unit Price (LKR)</th>
                    <th className="px-4 py-3 w-[20%] text-right">Total (LKR)</th>
                    <th className="px-4 py-3 w-[5%] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <select
                            value={line.purchase_item_id}
                            onChange={(e) => handleLineChange(line.id, 'purchase_item_id', e.target.value)}
                            className="w-1/2 bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                          >
                            <option value="">Custom Item...</option>
                            {purchaseItems.map(item => (
                              <option key={item.id} value={item.id}>{item.item_name}</option>
                            ))}
                          </select>
                          {!line.purchase_item_id && (
                            <input 
                              type="text" 
                              value={line.description}
                              onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                              className="w-1/2 bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                              placeholder="Item name"
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          min="0"
                          value={line.qty || ''}
                          onChange={(e) => handleLineChange(line.id, 'qty', Number(e.target.value))}
                          className="w-full bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" 
                          min="0"
                          value={line.unitPrice || ''}
                          onChange={(e) => handleLineChange(line.id, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">
                        {((Number(line.qty) || 0) * (Number(line.unitPrice) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleRemoveLine(line.id)}
                          disabled={lines.length === 1}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <button 
                onClick={handleAddLine}
                className="text-sm font-medium text-yellow-500 hover:text-yellow-400 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-yellow-500/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
              
              <div className="flex items-center gap-4 bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 font-medium">TOTAL AMOUNT:</span>
                <span className="text-2xl font-bold text-yellow-500 font-mono">
                  LKR {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save GRN'}
          </button>
        </div>
      </div>

      {/* Recent GRNs Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-yellow-500" />
            Recent GRN Records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                <th className="px-6 py-4">GRN No</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4 text-center">Items</th>
                <th className="px-6 py-4 text-right">Total (LKR)</th>
                <th className="px-6 py-4 text-right">Paid (LKR)</th>
                <th className="px-6 py-4 text-right">Balance (LKR)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    Loading GRNs...
                  </td>
                </tr>
              ) : recentGrns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    No GRN records found
                  </td>
                </tr>
              ) : (
                recentGrns.map((grn) => {
                  return (
                    <tr key={grn.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-white font-mono">{grn.grnNo}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{format(new Date(grn.date), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{grn.supplier}</td>
                      <td className="px-6 py-4 text-sm text-slate-400 text-center">{grn.items}</td>
                      <td className="px-6 py-4 text-sm text-white text-right font-mono">{grn.total.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-green-400 text-right font-mono">{grn.paid.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-red-400 text-right font-mono">{grn.balance.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border",
                          grn.status === 'Paid' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          grn.status === 'Partial' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {grn.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          {grn.status !== 'Paid' && (
                            <button 
                              onClick={() => setPayingGrn(grn)}
                              className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Pay
                            </button>
                          )}
                          <button 
                            onClick={() => setViewingGrn(grn)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View GRN Details Modal */}
      {viewingGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewingGrn(null)}
          />
          <div className="relative w-full max-w-2xl bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">{viewingGrn.id} — Details</h2>
                <p className="text-slate-400 mt-1">{viewingGrn.supplier} — {format(new Date(viewingGrn.date), 'dd MMM yyyy')}</p>
              </div>
              <button 
                onClick={() => setViewingGrn(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-slate-500 mb-1">GRN No.</div>
                  <div className="text-white font-medium font-mono">{viewingGrn.grnNo}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Supplier Invoice</div>
                  <div className="text-white font-medium font-mono">{viewingGrn.invoiceNo}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Date Received</div>
                  <div className="text-white font-medium">{format(new Date(viewingGrn.date), 'dd MMM yyyy')}</div>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price (LKR)</th>
                      <th className="px-4 py-3 text-right">Total (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {viewingGrn.lines.map((line: any) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-sm text-white">{line.description}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">{line.qty.toLocaleString()} units</td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right font-mono">LKR {line.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-white text-right font-mono">LKR {(line.qty * line.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900/50 border-t border-slate-800">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-slate-400 text-right">TOTAL</td>
                      <td className="px-4 py-3 text-sm font-bold text-yellow-500 text-right font-mono">LKR {viewingGrn.total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    viewingGrn.status === 'Paid' ? "bg-green-500" :
                    viewingGrn.status === 'Partial' ? "bg-yellow-500" :
                    "bg-red-500"
                  )} />
                  <span className="text-sm text-slate-300">
                    <span className="font-medium text-white">{viewingGrn.status}</span> — LKR {viewingGrn.balance.toLocaleString()} outstanding
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay GRN Modal */}
      {payingGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPayingGrn(null)}
          />
          <div className="relative w-full max-w-md bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Make Payment
              </h2>
              <button 
                onClick={() => setPayingGrn(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500 mb-1">GRN Reference</div>
                  <div className="text-white font-medium font-mono">{payingGrn.grnNo}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Payment Date</div>
                  <div className="text-white font-medium">{format(new Date(payingGrn.date), 'dd MMM yyyy')}</div>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-sm text-slate-400">Outstanding Balance</span>
                <span className="text-lg font-bold text-red-400 font-mono">LKR {payingGrn.balance.toLocaleString()}</span>
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
                onClick={() => setPayingGrn(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={handlePaySubmit}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-green-500 hover:bg-green-400 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
              >
                <DollarSign className="w-4 h-4" />
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-500" />
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
                  value={newSupplier.companyName}
                  onChange={(e) => setNewSupplier({...newSupplier, companyName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter company name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Contact Person</label>
                <input 
                  type="text" 
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier({...newSupplier, contactPerson: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter contact person name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                <input 
                  type="text" 
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input 
                  type="email" 
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Address / Location</label>
                <textarea 
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all resize-none"
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddSupplierModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                disabled={savingSupplier}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSupplier}
                disabled={savingSupplier || !newSupplier.companyName}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                {savingSupplier ? 'Saving...' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
