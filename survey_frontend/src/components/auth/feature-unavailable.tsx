import { Info } from "lucide-react";

export default function FeatureUnavailable({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="mb-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
    >
      <Info className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
