"use client";

import { useEffect, useState } from "react";

export default function useTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth >= 1025 && window.innerWidth < 1200);
    };

    checkTablet();
    window.addEventListener("resize", checkTablet);

    return () => window.removeEventListener("resize", checkTablet);
  }, []);

  return isTablet;
}
