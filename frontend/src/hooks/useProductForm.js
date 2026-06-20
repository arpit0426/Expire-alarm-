import { useState, useCallback } from "react";

const EMPTY = {
  product_name: "",
  batch_number: "",
  mfg_date: "",
  exp_date: "",
  quantity: 0,
  category: "general",
  notes: "",
};

/**
 * Encapsulates the small bit of state-management around the product form
 * used by ProductModal & co.
 */
export function useProductForm(initial) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...(initial
      ? {
          product_name: initial.product_name || "",
          batch_number: initial.batch_number || "",
          mfg_date: initial.mfg_date || "",
          exp_date: initial.exp_date || "",
          quantity: initial.quantity ?? 0,
          category: initial.category || "general",
          notes: initial.notes || "",
        }
      : {}),
  }));

  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isValid = Boolean(form.product_name && form.batch_number && form.exp_date);

  return { form, update, isValid, setForm };
}
