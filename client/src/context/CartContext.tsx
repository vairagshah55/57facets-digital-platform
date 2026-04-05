import { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface CartItem {
  cartId: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  carat: number;
  metalType: string | null;
  goldColour: string | null;
  diamondShape: string | null;
  diamondShade: string | null;
  diamondQuality: string | null;
  colorStoneName: string | null;
  colorStoneQuality: string | null;
  note: string | null;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "cartId">) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, qty: number) => void;
  updateNote: (cartId: string, note: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("sf_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("sf_cart", JSON.stringify(items));
  }, [items]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const addItem = useCallback((item: Omit<CartItem, "cartId">) => {
    setItems((prev) => [
      ...prev,
      { ...item, cartId: Math.random().toString(36).slice(2) },
    ]);
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const updateQuantity = useCallback((cartId: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.cartId === cartId ? { ...i, quantity: qty } : i)));
  }, []);

  const updateNote = useCallback((cartId: string, note: string) => {
    setItems((prev) => prev.map((i) => (i.cartId === cartId ? { ...i, note } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return (
    <CartContext.Provider value={{ items, totalItems, totalPrice, addItem, removeItem, updateQuantity, updateNote, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
