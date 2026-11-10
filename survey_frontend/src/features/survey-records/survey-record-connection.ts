import type { ManagerOptions, Socket, SocketOptions } from "socket.io-client";

type ConnectionOptions = {
  recordId: string | number;
  createSocket: (options: Partial<ManagerOptions & SocketOptions>) => Socket;
  getAccessToken: () => string | null;
  subscribeTokenCache: (listener: () => void) => () => void;
  refreshAccessToken: () => Promise<string>;
  revalidate: () => Promise<unknown>;
  onDeleted: () => void;
  onConnectionChange: (connected: boolean) => void;
};

// No interval: sync only on a change, an explicit refresh, or a ready event.
export function createSurveyRecordConnection(options: ConnectionOptions) {
  const { recordId } = options;
  let disposed = false;
  let refreshing = false;
  let refreshedSinceConnect = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  let fetching = false;
  let token = options.getAccessToken();
  const socket = options.createSocket({
    transports: ["websocket"],
    autoConnect: false,
    auth: (callback) =>
      callback({ accessToken: options.getAccessToken(), recordId }),
    reconnectionDelayMax: 10_000,
  });

  const sync = async () => {
    timer = undefined;
    if (disposed || fetching || !pending) return;
    pending = false;
    fetching = true;
    try {
      await options.revalidate();
    } catch {
      /* SWR displays REST errors. */
    } finally {
      fetching = false;
      if (pending && !disposed) timer = setTimeout(() => void sync(), 250);
    }
  };
  const scheduleSync = () => {
    pending = true;
    if (!fetching && !timer) timer = setTimeout(() => void sync(), 250);
  };
  const renewToken = async () => {
    if (disposed || refreshing || refreshedSinceConnect) return;
    refreshing = true;
    refreshedSinceConnect = true;
    try {
      await options.refreshAccessToken();
      if (!disposed) socket.disconnect().connect();
    } catch {
      /* The shared refresh flow clears the session on failure. */
    } finally {
      refreshing = false;
    }
  };

  socket.on("survey-record:ready", (event: { recordId: number }) => {
    if (String(event.recordId) !== String(recordId)) return;
    refreshedSinceConnect = false;
    options.onConnectionChange(true);
    scheduleSync();
  });
  socket.on(
    "survey-record:changed",
    (event: { recordId: number; deleted?: boolean }) => {
      if (String(event.recordId) !== String(recordId)) return;
      if (event.deleted) options.onDeleted();
      else scheduleSync();
    },
  );
  socket.on("disconnect", () => options.onConnectionChange(false));
  socket.on("auth:expired", () => {
    void renewToken();
  });
  socket.on("connect_error", (error: Error & { data?: { code?: string } }) => {
    options.onConnectionChange(false);
    if (
      ["AUTH_EXPIRED", "AUTH_REFRESH_REQUIRED"].includes(error.data?.code ?? "")
    )
      void renewToken();
    if (error.data?.code === "RECORD_NOT_FOUND") options.onDeleted();
  });
  const unsubscribe = options.subscribeTokenCache(() => {
    const nextToken = options.getAccessToken();
    if (nextToken === token) return;
    token = nextToken;
    socket.disconnect();
    if (nextToken && !disposed && !refreshing) socket.connect();
  });
  if (token) socket.connect();
  return {
    requestRefresh: scheduleSync,
    dispose: () => {
      disposed = true;
      unsubscribe();
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
