
import { LoaderCircle } from "lucide-react";

export default function Loading({
  message = "Loading SPS AI Assistant..."
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-[250px] flex-col items-center justify-center gap-3">
      <LoaderCircle className="animate-spin text-blue-600" size={32} />

      <p className="text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}