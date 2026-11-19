
"use client";

import { useCallback, useEffect, useState } from "react";

import type { DocumentItem } from "@/src/features/documents/utils/types";
import { documentService } from "@/src/features/services/document.service";
import { modelService } from "@/src/features/services/model.service";

import type { AIModelOption } from "../types";

/**
 * Loads reference documents, resumes and AI models
 * required by the Create Session form.
 */
export function useSessionFormOptions() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [resumes, setResumes] = useState<DocumentItem[]>([]);
  const [models, setModels] = useState<AIModelOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [docResult, resumeResult, modelResult] =
          await Promise.allSettled([
            documentService.list("reference"),
            documentService.list("resume"),
            modelService.list()
          ]);

        if (cancelled) return;

        if (docResult.status === "fulfilled") {
          setDocuments(docResult.value.data.documents);
        }

        if (resumeResult.status === "fulfilled") {
          setResumes(resumeResult.value.data.documents);
        }

        if (modelResult.status === "fulfilled") {
          setModels(modelResult.value.data.models);
        } else {
          setError(
            "We couldn't load the available AI models. Refresh the page to try again."
          );
        }

        if (
          docResult.status === "rejected" ||
          resumeResult.status === "rejected"
        ) {
          setError(
            "We couldn't load your documents. Please refresh the page and try again."
          );
        }
      } catch {
        if (!cancelled) {
          setError(
            "Something went wrong while loading the session form. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Add a newly uploaded reference document.
   */
  const addDocument = useCallback((doc: DocumentItem) => {
    setDocuments((current) => [
      doc,
      ...current.filter(
        (item) => item._id !== doc._id
      )
    ]);
  }, []);

  /**
   * Add a newly uploaded resume.
   */
  const addResume = useCallback((doc: DocumentItem) => {
    setResumes((current) => [
      doc,
      ...current.filter(
        (item) => item._id !== doc._id
      )
    ]);
  }, []);

  return {
     documents,
  resumes,
  models,
  loading,
  error,
  addDocument,
  addResume
  };
}
