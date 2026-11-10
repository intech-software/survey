"use client";

import { Button } from "@/components/ui/button";
import surveyRecordsService from "@/services/survey-records.service";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { SurveyRecord } from "../types";
import { formatRecordDateTime, getPersonLabel } from "../utils";

type ApprovalRole = "checker" | "approver";

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  "Không thể ký duyệt phiếu khảo sát.";

function ApprovalColumn({
  title,
  approvedAt,
  approvedBy,
  isSubmitting,
  onApprove,
  disabledReason,
  actionLabel,
}: {
  title: string;
  disabledReason?: string;
  actionLabel: string;
  approvedAt?: string | null;
  approvedBy: string;
  isSubmitting: boolean;
  onApprove: () => void;
}) {
  const isApproved = Boolean(approvedAt);

  return (
    <div className="flex min-h-64 flex-col items-center px-6 py-5 text-center">
      <h3 className="font-bold">{title}</h3>

      <Button
        type="button"
        variant="ghost"
        className="mt-10 h-auto gap-2 px-3 py-2 font-serif font-normal text-black hover:bg-gray-100"
        disabled={isSubmitting || isApproved || Boolean(disabledReason)}
        aria-pressed={isApproved}
        title={
          isApproved
            ? `${title} đã ký`
            : (disabledReason ?? `Ký với vai trò ${title}`)
        }
        onClick={onApprove}
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <span
            className={`flex size-4 items-center justify-center border ${
              isApproved ? "border-emerald-700 bg-emerald-700 text-white" : "border-black bg-white"
            }`}
            aria-hidden="true"
          >
            {isApproved ? <Check className="size-3.5" strokeWidth={3} /> : null}
          </span>
        )}
        {actionLabel}
      </Button>

      <dl className="mt-9 w-full space-y-5">
        <div>
          <dt>Tên</dt>
          <dd className="mt-1 min-h-6 font-semibold">{approvedBy || "—"}</dd>
        </div>
        <div>
          <dt>Thời điểm ký</dt>
          <dd className="mt-1 min-h-6 font-semibold">
            {approvedAt ? formatRecordDateTime(approvedAt) : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function SurveyRecordApprovals({
  record,
  onChanged,
}: {
  record: SurveyRecord;
  onChanged: () => Promise<unknown>;
}) {
  const [submittingRoles, setSubmittingRoles] = useState<ApprovalRole[]>([]);
  const checkedBy = getPersonLabel(record.checkedBy);
  const approvedBy = getPersonLabel(record.approvedBy);

  const sign = async (role: ApprovalRole) => {
    const message =
      role === "checker"
        ? "Xác nhận kiểm tra phiếu? Sau khi ký, thông tin phiếu và cấu trúc giai đoạn/bước/thông số sẽ bị khoá và bắt đầu cho phép nhập kết quả."
        : "Xác nhận phê duyệt phiếu? Sau khi ký, toàn bộ kết quả sẽ bị khoá và không thể chỉnh sửa.";
    if (!window.confirm(message)) return;

    setSubmittingRoles((current) => [...current, role]);
    try {
      if (role === "checker") {
        await surveyRecordsService.check(record.id);
      } else {
        await surveyRecordsService.approve(record.id);
      }
      toast.success(
        role === "checker"
          ? "Người kiểm tra đã ký phiếu."
          : "Người phê duyệt đã ký phiếu.",
      );
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingRoles((current) => current.filter((item) => item !== role));
    }
  };

  return (
    <section className="mt-6" aria-label="Ký duyệt phiếu khảo sát">
      <div className="grid grid-cols-2">
        <ApprovalColumn
          title="Người kiểm tra"
          actionLabel="Đã kiểm tra"
          approvedAt={record.checked_at}
          approvedBy={checkedBy}
          isSubmitting={submittingRoles.includes("checker")}
          onApprove={() => void sign("checker")}
        />
        <ApprovalColumn
          title="Người phê duyệt"
          actionLabel="Đã phê duyệt"
          approvedAt={record.approved_at}
          approvedBy={approvedBy}
          disabledReason={
            record.checked_at ? undefined : "Phiếu cần được kiểm tra trước"
          }
          isSubmitting={submittingRoles.includes("approver")}
          onApprove={() => void sign("approver")}
        />
      </div>
    </section>
  );
}
