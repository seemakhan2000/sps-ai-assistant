
"use client";

import { useCallback, useEffect, useState } from "react";

import type { DocumentItem } from "@/src/features/documents/utils/types";
import { documentService } from "@/src/features/services/document.service";
import { modelService } from "@/src/features/services/model.service";

import type { AIModelOption } from "../types";

/** Loads reference documents, resumes, and AI models for Create Session. */
export function useSessionFormOptions() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [resumes, setResumes] = useState<DocumentItem[]>([]);
  const [models, setModels] = useState<AIModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");

        const [documentResult, resumeResult, modelResult] =
          await Promise.allSettled([
            documentService.list("reference"),
            documentService.list("resume"),
            modelService.list()
          ]);

        if (cancelled) return;

        if (documentResult.status === "fulfilled") {
          setDocuments(documentResult.value.data.documents);
        } else {
          setError("We couldn't load your documents. Please refresh the page.");
        }

        if (resumeResult.status === "fulfilled") {
          setResumes(resumeResult.value.data.documents);
        } else {
          setError("We couldn't load your resumes. Please refresh the page.");
        }

        if (modelResult.status === "fulfilled") {
          setModels(modelResult.value.data.models);
        } else {
          setError("We couldn't load the available AI models. Please refresh the page.");
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load session form options. Please refresh the page.");
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

  const addDocument = useCallback((doc: DocumentItem) => {
    setDocuments((current) => {
      if (current.some((item) => item._id === doc._id)) {
        return current;
      }

      return [doc, ...current];
    });
  }, []);

  const addResume = useCallback((resume: DocumentItem) => {
    setResumes((current) => {
      if (current.some((item) => item._id === resume._id)) {
        return current;
      }

      return [resume, ...current];
    });
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
