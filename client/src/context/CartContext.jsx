import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || 'guest';
  const getStorageKey = (uid) => `cafeflow_cart_${uid}`;

  // Initial load for current user
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(currentUserId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const previousUserIdRef = useRef(currentUserId);

  // When authenticated user changes (e.g. login as Customer A, switch to Customer B, or logout),
  // switch to that user's isolated cart storage immediately!
  useEffect(() => {
    if (previousUserIdRef.current !== currentUserId) {
      previousUserIdRef.current = currentUserId;
      try {
        const userSavedCart = localStorage.getItem(getStorageKey(currentUserId));
        setItems(userSavedCart ? JSON.parse(userSavedCart) : []);
      } catch {
        setItems([]);
      }
      setSelectedSlot(null); // Reset slot for new user
    }
  }, [currentUserId]);

  // Persist items under current user's isolated key
  useEffect(() => {
    localStorage.setItem(getStorageKey(currentUserId), JSON.stringify(items));
  }, [items, currentUserId]);

  const addItem = (item, qty = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => (i.menuItemId || i._id) === (item.menuItemId || item._id));
      const currentStock = item.stock !== undefined ? item.stock : 999;

      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const newQty = Math.min(currentQty + qty, currentStock);

        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          maxStock: currentStock,
        };
        return updated;
      } else {
        const initialQty = Math.min(qty, currentStock);
        return [
          ...prev,
          {
            menuItemId: item._id || item.menuItemId,
            name: item.name,
            basePrice: item.basePrice,
            gstRate: item.gstRate || 5,
            image: item.image,
            quantity: initialQty,
            maxStock: currentStock,
          },
        ];
      }
    });
  };

  const updateQuantity = (menuItemId, newQty) => {
    if (newQty <= 0) {
      removeItem(menuItemId);
      return;
    }

    setItems((prev) =>
      prev.map((i) => {
        if ((i.menuItemId || i._id) === menuItemId) {
          const clamped = Math.min(newQty, i.maxStock || 999);
          return { ...i, quantity: clamped };
        }
        return i;
      })
    );
  };

  const removeItem = (menuItemId) => {
    setItems((prev) => prev.filter((i) => (i.menuItemId || i._id) !== menuItemId));
  };

  const clearCart = () => {
    setItems([]);
    setSelectedSlot(null);
    localStorage.removeItem(getStorageKey(currentUserId));
  };

  // Calculations
  const subtotal = items.reduce((acc, i) => acc + i.basePrice * i.quantity, 0);
  const totalGst = items.reduce((acc, i) => {
    const lineGst = (i.basePrice * (i.gstRate || 5) * i.quantity) / 100;
    return acc + lineGst;
  }, 0);
  const grandTotal = subtotal + totalGst;
  const totalCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        selectedSlot,
        setSelectedSlot,
        isCartOpen,
        setIsCartOpen,
        subtotal: Number(subtotal.toFixed(2)),
        totalGst: Number(totalGst.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        totalCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
