import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  category_name: string;
  incomeorexpense: string;
}

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteCategory: () => void;
}

export default function DeleteCategoryModal({ isOpen, onClose, onDeleteCategory }: DeleteCategoryModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      fetchCategories();
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('id, category_name, incomeorexpense')
        .order('category_name');
      
      if (error) throw error;

      if (data) {
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategoryId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible && !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategoryId) {
      alert('Please select a category to delete.');
      return;
    }

    const categoryToDelete = categories.find(c => c.id === selectedCategoryId);
    if (!categoryToDelete) return;

    try {
      setIsSubmitting(true);
      
      const response = await fetch('https://n8n.srv843245.hstgr.cloud/webhook/37fc1ce3-90e2-4e02-8196-56ac8efa346a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: categoryToDelete.id,
          category_name: categoryToDelete.category_name,
          incomeorexpense: categoryToDelete.incomeorexpense
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send webhook');
      }

      onDeleteCategory();
      onClose();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          "relative w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Delete Category</h2>
              <p className="text-xs text-slate-400">Remove an existing category</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form id="delete-category-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Select Category *
              </label>
              <select 
                required
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={isLoading || categories.length === 0}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <option value="">Loading categories...</option>
                ) : categories.length === 0 ? (
                  <option value="">No categories found</option>
                ) : (
                  categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name} ({cat.incomeorexpense})
                    </option>
                  ))
                )}
              </select>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="delete-category-form"
            disabled={isSubmitting || categories.length === 0}
            className="bg-red-500 hover:bg-red-400 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Deleting...' : 'Delete Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
