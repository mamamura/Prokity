import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const CartContext = createContext(null);

const load = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => load('os_cart', []));
  const [rules, setRules] = useState({
    deliveryFee: 60,
    freeDeliveryAbove: 500,
    globalDiscountPercent: 0,
    globalDiscountLabel: '',
    taxPercent: 0,
    minOrderAmount: 0,
  });
  useEffect(() => { localStorage.setItem('os_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings/site');
        setRules({
          deliveryFee: data.deliveryFee ?? 60,
          freeDeliveryAbove: data.freeDeliveryAbove ?? 500,
          globalDiscountPercent: data.globalDiscountPercent ?? 0,
          globalDiscountLabel: data.globalDiscountLabel ?? '',
          taxPercent: data.taxPercent ?? 0,
          minOrderAmount: data.minOrderAmount ?? 0,
        });
      } catch (_) {}
    })();
  }, []);

  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const exist = prev.find((p) => p.id === product.id);
      if (exist) return prev.map((p) => (p.id === product.id ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { id: product.id, slug: product.slug, name: product.name, image: product.image, price: product.price, oldPrice: product.oldPrice, unit: product.unit, qty }];
    });
  };
  const updateQty = (id, qty) => setCart((p) => p.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));
  const removeFromCart = (id) => setCart((p) => p.filter((i) => i.id !== id));
  const clearCart = () => setCart([]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const siteDiscount = useMemo(() => {
    const pct = Number(rules.globalDiscountPercent || 0);
    if (pct <= 0 || subtotal <= 0) return 0;
    return Math.round(subtotal * (pct / 100));
  }, [subtotal, rules.globalDiscountPercent]);
  const tax = useMemo(() => {
    const pct = Number(rules.taxPercent || 0);
    if (pct <= 0) return 0;
    const base = Math.max(0, subtotal - siteDiscount);
    return Math.round(base * (pct / 100));
  }, [subtotal, siteDiscount, rules.taxPercent]);
  const taxableSubtotal = useMemo(() => Math.max(0, subtotal - siteDiscount), [subtotal, siteDiscount]);
  const delivery = useMemo(() => (taxableSubtotal > 0 && taxableSubtotal < rules.freeDeliveryAbove ? rules.deliveryFee : 0), [taxableSubtotal, rules]);
  const total = Math.max(0, subtotal - siteDiscount + tax + delivery);

  return (
    <CartContext.Provider value={{
      cart, addToCart, updateQty, removeFromCart, clearCart,
      cartCount, subtotal, delivery, total,
      siteDiscount, tax,
      siteDiscountPercent: rules.globalDiscountPercent || 0,
      siteDiscountLabel: rules.globalDiscountLabel || '',
      taxPercent: rules.taxPercent || 0,
      minOrderAmount: rules.minOrderAmount || 0,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
