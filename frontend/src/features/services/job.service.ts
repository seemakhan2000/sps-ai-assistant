
import { apiFetch } from "../lib/api";

export type ImportedJob = {
  company?: string;
  jobDescription?: string;
  title?: string;
  sourceUrl?: string;
};

type ImportJobResponse = {
  success: boolean;
  message: string;
  data: ImportedJob;
};

export const jobService = {
  importFromUrl: async (url: string): Promise<ImportedJob> => {
    const result = (await apiFetch("/jobs/import", {
      method: "POST",
      body: JSON.stringify({ url }),
    })) as ImportJobResponse;

    if (!result?.success || !result.data) {
      throw new Error(result?.message || "Unable to import job details.");
    }

    return result.data;
  },
};
