"use client";

import * as React from "react";
import {
  Download,
  ImageOff,
  Loader2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAuthenticatedImage } from "@/lib/authenticated-image";
import { cn } from "@/lib/utils";

type ImageRequestState = {
  key: string;
  status: "idle" | "loading" | "loaded" | "error";
  url: string;
};

const isLocalImageSource = (src: string) => /^(?:blob:|data:)/i.test(src);
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

const clampZoom = (zoom: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

const getImageDownloadName = (src: string, fallback: string) => {
  try {
    const url = new URL(src, "http://localhost");
    const filename = url.pathname.split("/").filter(Boolean).pop();
    if (filename) {
      return decodeURIComponent(filename);
    }
  } catch {
    // Use the accessible image label as a safe fallback below.
  }

  const safeFallback = fallback
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");
  return safeFallback || "image";
};

function useAuthenticatedImageUrl({
  enabled,
  original = false,
  requestVersion = 0,
  src,
}: {
  enabled: boolean;
  original?: boolean;
  requestVersion?: number;
  src?: string | null;
}) {
  const requestKey = `${src ?? ""}:${original ? "original" : "thumbnail"}:${requestVersion}`;
  const [state, setState] = React.useState<ImageRequestState>({
    key: requestKey,
    status: "idle",
    url: "",
  });

  React.useEffect(() => {
    if (!enabled || !src || isLocalImageSource(src)) {
      return;
    }

    const controller = new AbortController();
    let objectUrl = "";
    let active = true;

    queueMicrotask(() => {
      if (active) {
        setState({ key: requestKey, status: "loading", url: "" });
      }
    });

    void fetchAuthenticatedImage(src, {
      original,
      signal: controller.signal,
    })
      .then((blob) => {
        if (!active) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setState({ key: requestKey, status: "loaded", url: objectUrl });
      })
      .catch(() => {
        if (!active || controller.signal.aborted) {
          return;
        }

        setState({ key: requestKey, status: "error", url: "" });
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [enabled, original, requestKey, src]);

  if (src && isLocalImageSource(src)) {
    return { status: "loaded" as const, url: src };
  }

  if (state.key !== requestKey) {
    return { status: "idle" as const, url: "" };
  }

  return { status: state.status, url: state.url };
}

export type ImagePreviewDialogProps = {
  alt: string;
  description?: string;
  direct?: boolean;
  footer?: React.ReactNode;
  open: boolean;
  src: string;
  thumbnailUrl?: string;
  title?: string;
  onOpenChange: (open: boolean) => void;
};

export function ImagePreviewDialog({
  alt,
  description,
  direct = false,
  footer,
  open,
  src,
  thumbnailUrl = "",
  title,
  onOpenChange,
}: ImagePreviewDialogProps) {
  const [retryVersion, setRetryVersion] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [viewportSize, setViewportSize] = React.useState({
    height: 0,
    width: 0,
  });
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const thumbnail = useAuthenticatedImageUrl({
    enabled: open && !thumbnailUrl && !direct,
    src,
  });
  const original = useAuthenticatedImageUrl({
    enabled: open && !direct,
    original: true,
    requestVersion: retryVersion,
    src,
  });
  const previewUrl = direct
    ? src
    : original.url || thumbnailUrl || thumbnail.url;
  const dialogTitle = title || alt || "Xem ảnh";
  const downloadUrl = direct ? src : original.url;
  const layoutZoom = Math.max(zoom, 1);
  const isQuarterTurn = rotation % 180 !== 0;
  const isPannable = zoom > 1;

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        height: viewport.clientHeight,
        width: viewport.clientWidth,
      });
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [open]);

  const updateZoom = React.useCallback((nextZoom: number) => {
    const viewport = viewportRef.current;
    const centerX = viewport
      ? (viewport.scrollLeft + viewport.clientWidth / 2) /
        Math.max(viewport.scrollWidth, 1)
      : 0.5;
    const centerY = viewport
      ? (viewport.scrollTop + viewport.clientHeight / 2) /
        Math.max(viewport.scrollHeight, 1)
      : 0.5;

    setZoom(clampZoom(nextZoom));

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollLeft =
          centerX * viewport.scrollWidth - viewport.clientWidth / 2;
        viewport.scrollTop =
          centerY * viewport.scrollHeight - viewport.clientHeight / 2;
      });
    }
  }, []);

  const handleDownload = () => {
    if (!downloadUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = getImageDownloadName(src, alt);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleRotate = React.useCallback(() => {
    setRotation((currentRotation) => (currentRotation + 90) % 360);
  }, []);

  const handleReset = React.useCallback(() => {
    updateZoom(1);
    setRotation(0);
  }, [updateZoom]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setZoom(1);
      setRotation(0);
      dragRef.current = null;
    }

    onOpenChange(nextOpen);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="grid h-[calc(100dvh-1rem)] max-h-[900px] max-w-[calc(100vw-1rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 overflow-hidden p-3 sm:h-[90dvh] sm:max-w-6xl sm:p-5"
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            updateZoom(zoom + ZOOM_STEP);
          } else if (event.key === "-") {
            event.preventDefault();
            updateZoom(zoom - ZOOM_STEP);
          } else if (event.key === "0") {
            event.preventDefault();
            handleReset();
          } else if (event.key.toLocaleLowerCase() === "r") {
            event.preventDefault();
            handleRotate();
          }
        }}
      >
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle className="truncate">{dialogTitle}</DialogTitle>
          <DialogDescription className={description ? undefined : "sr-only"}>
            {description || "Xem ảnh nghiệp vụ kích thước đầy đủ"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={zoom <= MIN_ZOOM}
              title="Thu nhỏ (-)"
              aria-label="Thu nhỏ ảnh"
              onClick={() => updateZoom(zoom - ZOOM_STEP)}
            >
              <ZoomOut className="size-4" />
            </Button>
            <span
              className="min-w-14 text-center text-sm font-medium tabular-nums text-gray-700"
              aria-live="polite"
            >
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={zoom >= MAX_ZOOM}
              title="Phóng to (+)"
              aria-label="Phóng to ảnh"
              onClick={() => updateZoom(zoom + ZOOM_STEP)}
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={zoom === 1 && rotation === 0}
              title="Đặt lại ảnh (0)"
              aria-label="Đặt lại kích thước và hướng ảnh"
              onClick={handleReset}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              title="Xoay ảnh 90° (R)"
              aria-label="Xoay ảnh sang phải 90 độ"
              onClick={handleRotate}
            >
              <RotateCw className="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={!downloadUrl}
            title={downloadUrl ? "Tải ảnh gốc xuống" : "Đang tải ảnh gốc"}
            aria-label={downloadUrl ? "Tải ảnh gốc xuống" : "Đang tải ảnh gốc"}
            onClick={handleDownload}
          >
            {downloadUrl ? (
              <Download className="size-4" />
            ) : (
              <Loader2 className="size-4 animate-spin" />
            )}
          </Button>
        </div>

        <div
          ref={viewportRef}
          role="region"
          aria-label="Khung xem ảnh; kéo để di chuyển khi đã phóng to"
          className={cn(
            "relative min-h-0 overflow-auto rounded-md bg-black/5 overscroll-contain",
            isPannable && "cursor-grab select-none active:cursor-grabbing",
          )}
          style={{ touchAction: isPannable ? "none" : "pan-y" }}
          onDoubleClick={() => updateZoom(zoom === 1 ? 2 : 1)}
          onWheel={(event) => {
            if (!event.ctrlKey && !event.metaKey) {
              return;
            }
            event.preventDefault();
            updateZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
          }}
          onPointerDown={(event) => {
            if (!isPannable) {
              return;
            }

            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              scrollLeft: event.currentTarget.scrollLeft,
              scrollTop: event.currentTarget.scrollTop,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) {
              return;
            }

            event.currentTarget.scrollLeft =
              drag.scrollLeft - (event.clientX - drag.startX);
            event.currentTarget.scrollTop =
              drag.scrollTop - (event.clientY - drag.startY);
          }}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          <div
            className="flex min-h-full min-w-full items-center justify-center"
            style={{
              height: `${layoutZoom * 100}%`,
              width: `${layoutZoom * 100}%`,
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={alt}
                draggable={false}
                className="block object-contain transition-transform duration-150"
                style={{
                  height:
                    isQuarterTurn && viewportSize.width > 0
                      ? `${viewportSize.width}px`
                      : `${100 / layoutZoom}%`,
                  width:
                    isQuarterTurn && viewportSize.height > 0
                      ? `${viewportSize.height}px`
                      : `${100 / layoutZoom}%`,
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin:
                    rotation !== 0
                      ? "center"
                      : zoom > 1
                        ? "top left"
                        : "center",
                }}
              />
            ) : (
              <Skeleton className="h-full min-h-64 w-full" />
            )}
          </div>

          {!direct && original.status === "loading" ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/60 px-3 py-2 text-sm text-white">
              <Loader2 className="size-4 animate-spin" />
              Đang tải ảnh gốc…
            </div>
          ) : null}

          {!direct && original.status === "error" ? (
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 bg-black/70 px-3 py-2 text-sm text-white">
              <span>Không thể tải ảnh gốc.</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setRetryVersion((version) => version + 1)}
              >
                Thử lại
              </Button>
            </div>
          ) : null}
        </div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export type AuthenticatedImageProps = {
  alt: string;
  className?: string;
  fallbackSrc?: string;
  height?: number;
  loading?: "eager" | "lazy";
  objectFit?: "contain" | "cover";
  preview?: boolean;
  previewTitle?: string;
  src?: string | null;
  width?: number;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
};

export default function AuthenticatedImage({
  alt,
  className,
  fallbackSrc,
  height = 480,
  loading = "lazy",
  objectFit = "contain",
  preview = true,
  previewTitle,
  src,
  width = 640,
  onClick,
  onError,
  onLoad,
}: AuthenticatedImageProps) {
  const containerRef = React.useRef<HTMLDivElement | HTMLButtonElement>(null);
  const [isInView, setIsInView] = React.useState(loading === "eager");
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [retryVersion, setRetryVersion] = React.useState(0);
  const [decodeErrorKey, setDecodeErrorKey] = React.useState("");
  const thumbnail = useAuthenticatedImageUrl({
    enabled: Boolean(src) && (loading === "eager" || isInView),
    requestVersion: retryVersion,
    src,
  });
  const isInteractive = Boolean(src) && (preview || onClick);
  const currentImageKey = `${src ?? ""}:${retryVersion}`;
  const hasImageError =
    thumbnail.status === "error" || decodeErrorKey === currentImageKey;

  React.useEffect(() => {
    if (loading === "eager") {
      return;
    }

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [loading, src]);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onClick?.(event);

    if (hasImageError) {
      setRetryVersion((version) => version + 1);
      return;
    }

    if (preview && thumbnail.url) {
      setIsPreviewOpen(true);
    }
  };

  const content =
    thumbnail.url && !hasImageError ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbnail.url}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className="h-full w-full"
        style={{ objectFit }}
        onError={(event) => {
          setDecodeErrorKey(currentImageKey);
          onError?.(event);
        }}
        onLoad={onLoad}
      />
    ) : hasImageError ? (
      fallbackSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          className="h-full w-full"
          style={{ objectFit }}
          onError={onError}
          onLoad={onLoad}
        />
      ) : (
        <span className="flex h-full min-h-20 flex-col items-center justify-center gap-1 bg-gray-100 p-2 text-center text-xs text-gray-500">
          <ImageOff className="size-5" />
          Không thể tải ảnh · Thử lại
        </span>
      )
    ) : (
      <Skeleton className="h-full min-h-20 w-full rounded-none" />
    );

  const containerClassName = cn(
    "relative block overflow-hidden rounded border bg-gray-50",
    isInteractive && "cursor-zoom-in",
    className,
  );
  const style = { aspectRatio: `${width} / ${height}` };

  return (
    <>
      {isInteractive ? (
        <button
          ref={containerRef as React.Ref<HTMLButtonElement>}
          type="button"
          className={containerClassName}
          style={style}
          aria-label={`Xem ${alt}`}
          onClick={handleClick}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {content}
        </button>
      ) : (
        <div
          ref={containerRef as React.Ref<HTMLDivElement>}
          className={containerClassName}
          style={style}
        >
          {content}
        </div>
      )}

      {preview && src && isPreviewOpen ? (
        <ImagePreviewDialog
          key={src}
          alt={alt}
          open={isPreviewOpen}
          src={src}
          thumbnailUrl={thumbnail.url}
          title={previewTitle}
          onOpenChange={setIsPreviewOpen}
        />
      ) : null}
    </>
  );
}
