export type ProductType = 'Finished Good' | 'By-product';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  sku: string;
  bagSize: number;
  unitPrice: number;
  stock: number;
  status: 'Active' | 'Inactive';
  lowStockAlert?: number;
  notes?: string;
}

export interface ProductionEntryLine {
  id: string;
  productId: string;
  qty: number;
  bags: number;
  notes: string;
}

export interface ProductionEntry {
  id: string;
  date: string;
  batchRef: string;
  lines: ProductionEntryLine[];
  status: 'Today' | 'Saved';
}
