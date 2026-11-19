
import { apiFetch } from "@/src/features/lib/api";

import type { AIModelOption } from "@/src/features/sessions/types";

type Result<T> = {
  data: T;
};

export const modelService = {
  /** GET /api/models: only models that are configured and tested. */
  list: (): Promise<Result<{ models: AIModelOption[] }>> =>
    apiFetch("/models")
};
