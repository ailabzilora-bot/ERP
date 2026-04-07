import React, { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Phone, History, Edit2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import CreateCustomerModal from '../../components/CreateCustomerModal';

interface CustomerData {
  id: string;
  name: string;
  location: string;
  phone: string;
  defaultPayment: string;
  totalPurchases: number;
  outstanding: number;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) throw customersError;

      // Fetch invoices to calculate totals
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('customer_id, total_amount, cash_amount, cheque_amount');

      if (invoicesError) throw invoicesError;

      if (customersData) {
        const formattedCustomers: CustomerData[] = customersData.map((customer: any) => {
          // Filter invoices for this customer
          const customerInvoices = invoicesData?.filter(inv => inv.customer_id === customer.id) || [];
          
          // Calculate total purchases
          const totalPurchases = customerInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
          
          // Calculate outstanding amount
          const outstanding = customerInvoices.reduce((sum, inv) => {
            const paid = (inv.cash_amount || 0) + (inv.cheque_amount || 0);
            return sum + ((inv.total_amount || 0) - paid);
          }, 0);

          return {
            id: customer.id,
            name: customer.customer_name || 'Unknown',
            location: customer.address || 'N/A',
            phone: customer.phone || 'N/A',
            defaultPayment: customer.default_payment || 'N/A',
            totalPurchases,
            outstanding
          };
        });

        setCustomers(formattedCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('cash')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (lowerType.includes('cheque')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (lowerType.includes('credit')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const handleAddCustomer = () => {
    // Re-fetch customers to get the newly added customer with accurate totals (which will be 0 initially)
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111827] border border-slate-800 rounded-xl p-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search customers..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-medium w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Name</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium text-center">Default Payment</th>
                <th className="px-6 py-4 font-medium text-right">Total Purchases (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Outstanding (LKR)</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-yellow-500 font-bold shrink-0">
                          {customer.name.charAt(0)}
                        </div>
                        <span className="font-medium text-white">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {customer.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getPaymentTypeColor(customer.defaultPayment))}>
                        {customer.defaultPayment}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-white">{customer.totalPurchases.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-yellow-500">{customer.outstanding.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-700">
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCustomerModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddCustomer={handleAddCustomer}
      />
    </div>
  );
}
