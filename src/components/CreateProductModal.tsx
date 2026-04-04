import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { useAppContext } from '../store';
import { ProductType } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export default function CreateProductModal() {
  const { products, setProducts, isCreateProductModalOpen, setIsCreateProductModalOpen } = useAppContext();

  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('Finished Good');
  const [sku, setSku] = useState('');
  const [bagSize, setBagSize] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [lowStockAlert, setLowStockAlert] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Handle animation state
  useEffect(() => {
    if (isCreateProductModalOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isCreateProductModalOpen]);

  if (!isVisible && !isCreateProductModalOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!type) newErrors.type = 'Product type is required';
    if (!sku.trim()) newErrors.sku = 'SKU code is required';
    else if (products.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
      newErrors.sku = 'SKU code must be unique';
    }
    
    if (bagSize !== '' && bagSize < 0) newErrors.bagSize = 'Cannot be negative';
    if (unitPrice !== '' && unitPrice < 0) newErrors.unitPrice = 'Cannot be negative';
    if (lowStockAlert !== '' && lowStockAlert < 0) newErrors.lowStockAlert = 'Cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        product_name: name.trim(),
        product_type: type,
        sku_code: sku.trim(),
        bag_size_kg: bagSize,
        unit_price_lkr: unitPrice,
        low_stock_alert_kg: lowStockAlert,
        notes: notes
      };

      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/3aeccbd3-e484-4a20-895d-50ebf8a1fbf4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send data to webhook');
      }

      // Optimistically add to UI
      const newProduct = {
        id: `temp-${Date.now()}`,
        name: name.trim(),
        type: type,
        sku: sku.trim(),
        bagSize: Number(bagSize) || 0,
        unitPrice: Number(unitPrice) || 0,
        stock: 0,
        status: 'Active' as const,
        lowStockAlert: lowStockAlert !== '' ? Number(lowStockAlert) : null,
        notes: notes.trim() || null
      };

      setProducts([newProduct, ...products]);
      handleClose();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsCreateProductModalOpen(false);
    // Reset form after animation
    setTimeout(() => {
      setName('');
      setType('Finished Good');
      setSku('');
      setBagSize('');
      setUnitPrice('');
      setLowStockAlert('');
      setNotes('');
      setErrors({});
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isCreateProductModalOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className={cn(
          "relative w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
          isCreateProductModalOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Create New Product</h2>
              <p className="text-xs text-slate-400">Add a finished good or by-product to the catalogue</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
          <form id="create-product-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Split Red Lentil"
                  className={cn(
                    "w-full bg-[#0a0f1c] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors",
                    errors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                />
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>

              {/* Product Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Product Type <span className="text-red-400">*</span>
                </label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as ProductType)}
                  className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors appearance-none"
                >
                  <option value="Finished Good">Finished Good</option>
                  <option value="By-product">By-product</option>
                </select>
              </div>

              {/* SKU Code */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  SKU Code <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text" 
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SRL-50"
                  className={cn(
                    "w-full bg-[#0a0f1c] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors font-mono",
                    errors.sku ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                />
                {errors.sku && <p className="text-xs text-red-400">{errors.sku}</p>}
              </div>

              {/* Bag Size */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Bag Size (kg)
                </label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={bagSize}
                  onChange={(e) => setBagSize(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 50"
                  className={cn(
                    "w-full bg-[#0a0f1c] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors",
                    errors.bagSize ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                />
                {errors.bagSize && <p className="text-xs text-red-400">{errors.bagSize}</p>}
              </div>

              {/* Unit Price */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Unit Price (LKR)
                </label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 14500"
                  className={cn(
                    "w-full bg-[#0a0f1c] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors",
                    errors.unitPrice ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                />
                {errors.unitPrice && <p className="text-xs text-red-400">{errors.unitPrice}</p>}
              </div>

              {/* Low Stock Alert */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Low Stock Alert (kg)
                </label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={lowStockAlert}
                  onChange={(e) => setLowStockAlert(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 500"
                  className={cn(
                    "w-full bg-[#0a0f1c] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors",
                    errors.lowStockAlert ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                />
                {errors.lowStockAlert && <p className="text-xs text-red-400">{errors.lowStockAlert}</p>}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Notes
              </label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional product description or notes..."
                rows={3}
                className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="create-product-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
