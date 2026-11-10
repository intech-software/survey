"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { createSurveyRecordConnection } from "./survey-record-connection";
import { refreshAccessToken } from "@/lib/axios-client";
import { getTokenCache, subscribeTokenCache } from "@/store/token.store";

export function useSurveyRecordSocket(
  recordId: string | number,
  revalidate: () => Promise<unknown>,
  onDeleted: () => void,
) {
  const [connectedRecordId, setConnectedRecordId] = useState<string | null>(
    null,
  );
  const requestRefreshRef = useRef<() => void>(() => {});
  const requestRefresh = useCallback(
    async () => requestRefreshRef.current(),
    [],
  );
  const callbacks = useRef({ revalidate, onDeleted });
  useEffect(() => {
    callbacks.current = { revalidate, onDeleted };
  }, [revalidate, onDeleted]);

  useEffect(() => {
    const base = new URL(
      process.env.NEXT_PUBLIC_BACKEND_API_URL || window.location.origin,
      window.location.origin,
    );
    const connection = createSurveyRecordConnection({
      recordId,
      createSocket: (options) =>
        io(`${base.origin}/survey-records`, {
          ...options,
          path: `${base.pathname.replace(/\/$/, "")}/socket.io`,
        }),
      getAccessToken: () => getTokenCache().accessToken,
      subscribeTokenCache,
      refreshAccessToken,
      revalidate: () => callbacks.current.revalidate(),
      onDeleted: () => callbacks.current.onDeleted(),
      onConnectionChange: (connected) =>
        setConnectedRecordId(connected ? String(recordId) : null),
    });
    requestRefreshRef.current = connection.requestRefresh;
    return () => {
      requestRefreshRef.current = () => {};
      connection.dispose();
    };
  }, [recordId]);

  return { connected: connectedRecordId === String(recordId), requestRefresh };
}
