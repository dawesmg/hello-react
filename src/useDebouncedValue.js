import { useEffect, useState } from "react";

/**
 * Returns a debounced version of `value` that only updates
 * after `delay` ms of no changes.
 */
export default function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}