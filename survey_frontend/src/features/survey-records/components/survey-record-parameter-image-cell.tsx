"use client";

import { ImagePreviewDialog } from "@/components/authenticated-image/authenticated-image";
import { Button } from "@/components/ui/button";
import surveyRecordsService from "@/services/survey-records.service";
import {
  CHUNKED_IMAGE_MAX_BYTES,
  type ChunkedUploadHandle,
  uploadImageInChunks,
} from "../chunked-image-upload";
import { Camera, Eye, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { SurveyRecordParameter } from "../types";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

const getFilename = (imagePath: string) => {
  const withoutQuery = imagePath.split("?")[0].split("#")[0];
  const filename = withoutQuery.split("/").filter(Boolean).pop() ?? "";
  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
};

const isDirectExternalUrl = (imagePath: string) =>
  /^(https?:|data:|blob:)/i.test(imagePath) &&
  !imagePath.includes("/survey-record-parameters/images/");

export default function SurveyRecordParameterImageCell({
  parameter,
  onChanged,
  readOnly = false,
}: {
  parameter: SurveyRecordParameter;
  onChanged: () => Promise<unknown>;
  readOnly?: boolean;
}) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const uploadHandle = useRef<ChunkedUploadHandle>({ uploadId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const imagePath = parameter.result_image_path?.trim() ?? "";
  const filename = imagePath ? getFilename(imagePath) : "";
  const directImageUrl =
    imagePath && isDirectExternalUrl(imagePath) ? imagePath : "";
  const viewerSrc =
    directImageUrl ||
    (filename
      ? `/survey-record-parameters/images/${encodeURIComponent(filename)}`
      : "");

  const uploadImage = async (file?: File, resume = false) => {
    if (readOnly || !file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Ảnh phải có định dạng JPG, PNG, WEBP hoặc GIF.");
      return;
    }
    if (file.size > CHUNKED_IMAGE_MAX_BYTES) {
      toast.error("Dung lượng ảnh tối đa là 40 MB.");
      return;
    }
    if (!resume) uploadHandle.current = { uploadId: null };

    setIsUploading(true);
    setProgress(0);
    try {
      await uploadImageInChunks({
        parameterId: parameter.id,
        file,
        handle: uploadHandle.current,
        onProgress: setProgress,
      });
      toast.success("Đã lưu ảnh kết quả (chất lượng gốc).");
      await onChanged();
    } catch (error) {
      const canResume = Boolean(uploadHandle.current.uploadId);
      toast.error(
        getErrorMessage(
          error,
          canResume
            ? "Mạng bị gián đoạn, ảnh chưa tải xong."
            : "Không thể tải ảnh kết quả lên.",
        ),
        canResume
          ? {
              duration: 30_000,
              action: {
                label: "Thử lại",
                onClick: () => void uploadImage(file, true),
              },
            }
          : undefined,
      );
    } finally {
      setIsUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const deleteImage = async () => {
    if (readOnly) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh kết quả này?")) return;

    setIsDeleting(true);
    try {
      await surveyRecordsService.deleteParameterImage(
        parameter.id,
      );
      setIsViewerOpen(false);
      toast.success("Đã xóa ảnh kết quả.");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa ảnh kết quả."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex min-h-10 items-center justify-center p-1 font-sans">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          className="hidden"
          onChange={(event) => void uploadImage(event.target.files?.[0])}
        />
        {imagePath ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-blue-700 hover:bg-blue-50"
            onClick={() => setIsViewerOpen(true)}
            title="Xem ảnh kết quả"
            aria-label={`Xem ảnh kết quả ${parameter.parameter_name}`}
          >
            <Eye className="size-4" />
          </Button>
        ) : readOnly ? (
          <span className="text-sm text-slate-400">—</span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-700 hover:bg-slate-100"
            disabled={isUploading}
            onClick={() => cameraInputRef.current?.click()}
            title="Chụp ảnh kết quả"
            aria-label={`Chụp ảnh kết quả ${parameter.parameter_name}`}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
          </Button>
        )}
        {isUploading ? (
          <span
            className="ml-1 text-[11px] tabular-nums text-blue-700"
            role="status"
            aria-label={`Đang tải ảnh ${progress}%`}
          >
            {progress}%
          </span>
        ) : null}
      </div>

      {viewerSrc && isViewerOpen ? (
        <ImagePreviewDialog
          key={viewerSrc}
          open={isViewerOpen}
          onOpenChange={setIsViewerOpen}
          src={viewerSrc}
          direct={Boolean(directImageUrl)}
          alt={`Ảnh kết quả ${parameter.parameter_name}`}
          title="Ảnh kết quả"
          description={parameter.parameter_name}
          footer={
            !readOnly ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={() => void deleteImage()}
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {isDeleting ? "Đang xóa..." : "Xóa ảnh"}
              </Button>
            ) : null
          }
        />
      ) : null}
    </>
  );
}
