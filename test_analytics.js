import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxpkavhucbkggduuhfsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cGthdmh1Y2JrZ2dkdXVoZnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDgyNzIsImV4cCI6MjA5MDU4NDI3Mn0.7OMNbgFc4dzoaz5B3Je2FpiwZ7fEGTz8qCf-5ggQC6g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnalytics() {
  const { data: ieData } = await supabase.from('income_expense').select('*');
  const { data: invData } = await supabase.from('invoices').select('*, customers(customer_name)');

  // 1. Monthly Data
  const monthlyMap = new Map();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  ieData?.forEach(row => {
    const date = new Date(row.date);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { name: monthKey, income: 0, expense: 0, sortKey: date.getTime() });
    }
    
    const monthData = monthlyMap.get(monthKey);
    if (row.entry_type === 'income') {
      monthData.income += row.amount;
    } else if (row.entry_type === 'expense') {
      monthData.expense += row.amount;
    }
  });

  const monthlyData = Array.from(monthlyMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ name, income, expense }) => ({ name, income, expense }));

  console.log('monthlyData:', monthlyData);

  // 2. Expense Breakdown
  const expenseMap = new Map();
  ieData?.filter(r => r.entry_type === 'expense').forEach(row => {
    expenseMap.set(row.category, (expenseMap.get(row.category) || 0) + row.amount);
  });

  const colors = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
  const totalExpense = Array.from(expenseMap.values()).reduce((a, b) => a + b, 0);
  
  const expenseBreakdown = Array.from(expenseMap.entries())
    .map(([name, value], index) => ({
      name,
      value: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0,
      amount: value,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.value - a.value);

  console.log('expenseBreakdown:', expenseBreakdown);

  // 3. Top Customers
  const customerMap = new Map();
  invData?.forEach(row => {
    const customerName = row.customers?.customer_name || 'Unknown';
    customerMap.set(customerName, (customerMap.get(customerName) || 0) + row.total_amount);
  });

  const topCustomers = Array.from(customerMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  console.log('topCustomers:', topCustomers);

  // 4. Cheque Flow
  let receivable = 0;
  let deposited = 0;
  let payable = 0;

  invData?.filter(r => r.payment_method === 'cheque').forEach(row => {
    if (row.status === 'paid') {
      deposited += row.cheque_amount || 0;
    } else {
      receivable += row.cheque_amount || 0;
    }
  });

  ieData?.filter(r => r.payment_method === 'cheque' && r.entry_type === 'expense').forEach(row => {
    payable += row.amount;
  });

  const chequeFlow = [
    { name: 'Receivable', value: receivable, color: 'bg-blue-500' },
    { name: 'Deposited', value: deposited, color: 'bg-emerald-500' },
    { name: 'Payable', value: payable, color: 'bg-red-500' },
  ];

  console.log('chequeFlow:', chequeFlow);
}

testAnalytics();
