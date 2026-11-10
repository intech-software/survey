export default function FieldDisplay({
  lable,
  value,
}: {
  lable: string;
  value: ReactNode;
}) {
  return (
    <div className="flex w-full justify-start gap-3 md:gap-4">
      <div className="m-0.5 w-[170px] shrink-0 pr-1 text-left font-semibold text-gray-600 wrap-anywhere md:m-1 md:w-[220px] md:pr-2">
        {lable}
      </div>

      <div className="min-w-0 flex-1 text-left text-gray-800">
        <p className="whitespace-pre-line wrap-anywhere">{value}</p>
      </div>
    </div>
  );
}
import type { ReactNode } from "react";
