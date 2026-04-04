import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductionEntry } from './types';
import { supabase } from './lib/supabase';

interface AppContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  entries: ProductionEntry[];
  setEntries: React.Dispatch<React.SetStateAction<ProductionEntry[]>>;
  isCreateProductModalOpen: boolean;
  setIsCreateProductModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch products
        console.log('Fetching products...');
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('Products data:', productsData);
        console.log('Products error:', productsError);

        if (productsError) throw productsError;
        
        if (productsData) {
          setProducts(productsData.map(p => ({
            id: p.id,
            name: p.product_name || p.name || 'Unknown Product',
            type: p.product_type || p.type || 'Finished Good',
            sku: p.sku_code || p.sku || '',
            bagSize: p.bag_size_kg || p.bag_size || 0,
            unitPrice: p.unit_price_lkr || p.unit_price || 0,
            stock: p.stock || 0,
            status: p.status || 'Active',
            lowStockAlert: p.low_stock_alert_kg || p.low_stock_alert || null,
            notes: p.notes || ''
          })));
        }

        // Fetch entries (handle errors gracefully if tables don't exist yet)
        try {
          const { data: entriesData, error: entriesError } = await supabase
            .from('product_entries')
            .select('*, product_entry_items(*)')
            .order('production_date', { ascending: false });

          if (entriesError) {
            console.warn('Could not fetch entries (tables might not exist yet):', entriesError);
          } else if (entriesData) {
            setEntries(entriesData.map(e => ({
              id: e.id,
              date: e.production_date,
              batchRef: e.batch_ref,
              status: e.status || 'Saved',
              lines: e.product_entry_items ? e.product_entry_items.map((item: any) => ({
                id: item.id,
                productId: item.product_id,
                qty: item.qty_kg,
                bags: item.bags,
                notes: item.notes
              })) : []
            })));
          }
        } catch (entriesErr) {
          console.warn('Error fetching entries:', entriesErr);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Failed to fetch data from Supabase. Please check your connection and Row Level Security (RLS) policies.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <AppContext.Provider value={{ 
      products, setProducts, 
      entries, setEntries,
      isCreateProductModalOpen, setIsCreateProductModalOpen,
      isLoading, error
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
