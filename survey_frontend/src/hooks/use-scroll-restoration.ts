import { useCallback, useLayoutEffect, type RefObject } from "react";

type UseScrollRestorationOptions<T extends HTMLElement> = {
  ref: RefObject<T | null>;
  storageKey: string;
  restoreSignal?: unknown;
};

type SaveScrollPositionOptions = {
  restoreOnNextFrame?: boolean;
};

export function useScrollRestoration<T extends HTMLElement>({
  ref,
  storageKey,
  restoreSignal,
}: UseScrollRestorationOptions<T>) {
  const restoreScrollPosition = useCallback(() => {
    const scrollTop = sessionStorage.getItem(storageKey);
    if (scrollTop === null || !ref.current) {
      return;
    }

    const savedScrollTop = Number.parseInt(scrollTop, 10);
    if (!Number.isNaN(savedScrollTop)) {
      ref.current.scrollTop = savedScrollTop;
    }
  }, [ref, storageKey]);

  const saveScrollPosition = useCallback(
    ({ restoreOnNextFrame = false }: SaveScrollPositionOptions = {}) => {
      const container = ref.current;
      const scrollTop = container?.scrollTop || 0;
      sessionStorage.setItem(storageKey, scrollTop.toString());

      if (restoreOnNextFrame) {
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = scrollTop;
          }
        });
      }

      return scrollTop;
    },
    [ref, storageKey],
  );

  useLayoutEffect(() => {
    restoreScrollPosition();
    const frameId = requestAnimationFrame(restoreScrollPosition);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [restoreScrollPosition, restoreSignal]);

  return {
    restoreScrollPosition,
    saveScrollPosition,
  };
}
