import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Search, Plus, Edit2, Trash2, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { Product, ProductType } from '../types';
import { supabase } from '../lib/supabase';
import EditProductModal from '../components/EditProductModal';

export default function ProductsManagement() {
  const { products, setProducts, setIsCreateProductModalOpen, isLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive' | 'All'>('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredProducts = products.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(searchLower) || false;
    const skuMatch = p.sku?.toLowerCase().includes(searchLower) || false;
    const matchesSearch = !searchTerm || nameMatch || skuMatch;
    const matchesType = typeFilter === 'All' || p.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook-test/4c81fd14-e027-400b-b4b2-7e3e29bd59cc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: productToDelete })
      });

      if (!response.ok) {
        throw new Error('Failed to send delete request to webhook');
      }

      setProducts(products.filter(p => p.id !== productToDelete));
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      setDeleteError('Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Products Management</h1>
        <button 
          onClick={() => setIsCreateProductModalOpen(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
        >
          <Plus className="w-4 h-4" />
          New Product
        </button>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search products or SKUs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full sm:w-40 bg-[#0a0f1c] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 appearance-none"
              >
                <option value="All">All Types</option>
                <option value="Finished Good">Finished Good</option>
                <option value="By-product">By-product</option>
              </select>
            </div>
            
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-32 bg-[#0a0f1c] border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 appearance-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/20">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Bag Size</th>
                <th className="px-6 py-4 text-right">Unit Price</th>
                <th className="px-6 py-4 text-right">Stock (kg)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      Loading products...
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    {products.length === 0 ? "No products found. Create a new product to get started." : "No products match your filters."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{product.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-slate-400">{product.sku}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border inline-block",
                      product.type === 'Finished Good' 
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                        : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    )}>
                      {product.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-300">
                    {product.bagSize} kg
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-300 font-mono">
                    Rs. {product.unitPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-sm font-mono font-medium",
                      product.stock < 1000 ? "text-red-400" : "text-white"
                    )}>
                      {product.stock.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border inline-block",
                      product.status === 'Active' 
                        ? "bg-green-500/10 text-green-400 border-green-500/20" 
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    )}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 max-w-[200px] truncate" title={product.notes || ''}>
                    {product.notes || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingProduct(product)}
                        className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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

      {editingProduct && (
        <EditProductModal 
          product={editingProduct} 
          onClose={() => setEditingProduct(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setProductToDelete(null)}
          />
          <div className="relative w-full max-w-md bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
            <h3 className="text-xl font-bold text-white mb-2">Delete Product</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            
            {deleteError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
