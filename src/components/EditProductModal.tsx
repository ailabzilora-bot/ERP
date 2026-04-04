import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { useAppContext } from '../store';
import { Product, ProductType } from '../types';
import { cn } from '../lib/utils';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
}

export default function EditProductModal({ product, onClose }: EditProductModalProps) {
  const { products, setProducts } = useAppContext();

  const [name, setName] = useState(product.name);
  const [type, setType] = useState<ProductType>(product.type);
  const [sku, setSku] = useState(product.sku);
  const [bagSize, setBagSize] = useState<number | ''>(product.bagSize || '');
  const [unitPrice, setUnitPrice] = useState<number | ''>(product.unitPrice || '');
  const [lowStockAlert, setLowStockAlert] = useState<number | ''>(product.lowStockAlert ?? '');
  const [notes, setNotes] = useState(product.notes || '');
  const [status, setStatus] = useState<'Active' | 'Inactive'>(product.status);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!type) newErrors.type = 'Product type is required';
    if (!sku.trim()) newErrors.sku = 'SKU code is required';
    else if (products.some(p => p.id !== product.id && p.sku.toLowerCase() === sku.toLowerCase())) {
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
      const updatedFields: Record<string, any> = {};
      
      if (name.trim() !== product.name) updatedFields.product_name = name.trim();
      if (type !== product.type) updatedFields.product_type = type;
      if (sku.trim() !== product.sku) updatedFields.sku_code = sku.trim();
      if ((Number(bagSize) || 0) !== product.bagSize) updatedFields.bag_size_kg = bagSize;
      if ((Number(unitPrice) || 0) !== product.unitPrice) updatedFields.unit_price_lkr = unitPrice;
      if ((lowStockAlert !== '' ? Number(lowStockAlert) : null) !== (product.lowStockAlert ?? null)) updatedFields.low_stock_alert_kg = lowStockAlert;
      if ((notes.trim() || null) !== (product.notes || null)) updatedFields.notes = notes;
      if (status !== product.status) updatedFields.status = status;

      if (Object.keys(updatedFields).length > 0) {
        // Only send if there are changes
        const payload = {
          id: product.id,
          ...updatedFields
        };

        const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/bf0dc067-72be-4394-ba2c-3781900b3743', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Failed to send data to webhook');
        }

        // Optimistically update UI
        const updatedProduct = {
          ...product,
          name: name.trim(),
          type: type,
          sku: sku.trim(),
          bagSize: Number(bagSize) || 0,
          unitPrice: Number(unitPrice) || 0,
          status: status,
          lowStockAlert: lowStockAlert !== '' ? Number(lowStockAlert) : undefined,
          notes: notes.trim() || undefined
        };

        setProducts(products.map(p => p.id === product.id ? updatedProduct : p));
      }
      
      handleClose();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />
      
      <div 
        className={cn(
          "relative w-full max-w-2xl bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Package className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Edit Product</h2>
              <p className="text-sm text-slate-400">Update product details</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto p-6 custom-scrollbar">
          <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-300">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "w-full bg-[#111827] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors",
                    errors.name ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                  placeholder="e.g., Premium Rice 5kg"
                />
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>

              {/* Product Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Product Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ProductType)}
                  className="w-full bg-[#111827] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 appearance-none"
                >
                  <option value="Finished Good">Finished Good</option>
                  <option value="By-product">By-product</option>
                </select>
              </div>

              {/* SKU Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  SKU Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className={cn(
                    "w-full bg-[#111827] border rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-1 transition-colors",
                    errors.sku ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                  placeholder="e.g., PR-5KG-001"
                />
                {errors.sku && <p className="text-xs text-red-400">{errors.sku}</p>}
              </div>

              {/* Bag Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Bag Size (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bagSize}
                  onChange={(e) => setBagSize(e.target.value ? Number(e.target.value) : '')}
                  className={cn(
                    "w-full bg-[#111827] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors",
                    errors.bagSize ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                  placeholder="0.00"
                />
                {errors.bagSize && <p className="text-xs text-red-400">{errors.bagSize}</p>}
              </div>

              {/* Unit Price */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Unit Price (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value ? Number(e.target.value) : '')}
                  className={cn(
                    "w-full bg-[#111827] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors",
                    errors.unitPrice ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                  placeholder="0.00"
                />
                {errors.unitPrice && <p className="text-xs text-red-400">{errors.unitPrice}</p>}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full bg-[#111827] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 appearance-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Low Stock Alert */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Low Stock Alert (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={lowStockAlert}
                  onChange={(e) => setLowStockAlert(e.target.value ? Number(e.target.value) : '')}
                  className={cn(
                    "w-full bg-[#111827] border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 transition-colors",
                    errors.lowStockAlert ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-slate-700 focus:border-yellow-500 focus:ring-yellow-500"
                  )}
                  placeholder="Optional"
                />
                {errors.lowStockAlert && <p className="text-xs text-red-400">{errors.lowStockAlert}</p>}
              </div>

              {/* Notes */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-300">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#111827] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors resize-none"
                  placeholder="Add any additional notes or description..."
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-product-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-900 bg-yellow-500 hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
