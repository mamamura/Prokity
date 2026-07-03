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
    deliveryZones: [],
    outsideFee: 120,
  });
  const [deliveryArea, setDeliveryArea] = useState('');
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
          deliveryZones: Array.isArray(data.deliveryZones) ? data.deliveryZones : [],
          outsideFee: data.outsideFee ?? 120,
        });
      } catch (_) {}
    })();
  }, []);

  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const key = (p) => `${p.id}::${p.variantLabel || ''}`;
      const incomingKey = key(product);
      const exist = prev.find((p) => key(p) === incomingKey);
      if (exist) return prev.map((p) => (key(p) === incomingKey ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { id: product.id, slug: product.slug, name: product.name, image: product.image, price: product.price, oldPrice: product.oldPrice, unit: product.unit, variantLabel: product.variantLabel || null, qty }];
    });
  };
  const updateQty = (id, qty, variantLabel = null) => setCart((p) => p.map((i) => (i.id === id && (i.variantLabel || null) === (variantLabel || null) ? { ...i, qty: Math.max(1, qty) } : i)));
  const removeFromCart = (id, variantLabel = null) => setCart((p) => p.filter((i) => !(i.id === id && (i.variantLabel || null) === (variantLabel || null))));
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

  // Zone-based delivery: if deliveryArea matches any admin-configured zone
  // (case-insensitive substring or vice-versa), use that zone's fee (with its
  // own freeAbove threshold if provided). Otherwise use outsideFee for typed
  // areas, or global deliveryFee when no area is typed yet.
  const matchedZone = useMemo(() => {
    if (!deliveryArea || !rules.deliveryZones?.length) return null;
    const a = deliveryArea.trim().toLowerCase();
    if (!a) return null;
    return rules.deliveryZones.find((z) => {
      const n = (z?.name || '').trim().toLowerCase();
      if (!n) return false;
      return n === a || a.includes(n) || n.includes(a);
    }) || null;
  }, [deliveryArea, rules.deliveryZones]);

  const delivery = useMemo(() => {
    if (taxableSubtotal <= 0) return 0;
    // If admin configured zones and user typed an area, use zone logic.
    if (rules.deliveryZones?.length && deliveryArea) {
      if (matchedZone) {
        const fee = Number(matchedZone.fee || 0);
        const freeAbove = matchedZone.freeAbove != null ? Number(matchedZone.freeAbove) : null;
        if (freeAbove != null && taxableSubtotal >= freeAbove) return 0;
        return fee;
      }
      return Number(rules.outsideFee || rules.deliveryFee || 0);
    }
    // No zones configured or no area typed — fall back to global settings.
    if (taxableSubtotal >= rules.freeDeliveryAbove) return 0;
    return rules.deliveryFee;
  }, [taxableSubtotal, rules, deliveryArea, matchedZone]);
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
      deliveryZones: rules.deliveryZones || [],
      outsideFee: rules.outsideFee || 0,
      deliveryArea, setDeliveryArea, matchedZone,
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
