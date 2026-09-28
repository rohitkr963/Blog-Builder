"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_SAVE_DELAY = 1500;

export function hasMeaningfulDraftContent(draft) {
  const textContent = (draft.content || "").replace(/<[^>]*>/g, " ").trim();
  return Boolean(draft.title.trim() || draft.excerpt.trim() || textContent);
}

export default function useDraftAutoSave({ data, enabled, save }) {
  const [status, setStatus] = useState("idle");
  const [savedAt, setSavedAt] = useState(null);
  const saveRef = useRef(save);
  const latestSignatureRef = useRef("");
  const lastObservedSignatureRef = useRef(null);
  const lastSavedSignatureRef = useRef(null);
  const queueRef = useRef(Promise.resolve());
  const timerRef = useRef(null);
  const pausedRef = useRef(false);

  const signature = JSON.stringify(data);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const enqueueSave = useCallback((snapshot) => {
    const task = queueRef.current.then(() => saveRef.current(snapshot));
    queueRef.current = task.catch(() => undefined);
    return task;
  }, []);

  const markSaved = useCallback((snapshot = data) => {
    const savedSignature = JSON.stringify(snapshot);
    lastSavedSignatureRef.current = savedSignature;
    latestSignatureRef.current = savedSignature;
    lastObservedSignatureRef.current = savedSignature;
    setSavedAt(new Date());
    setStatus("saved");
  }, [data]);

  const markFailed = useCallback(() => {
    setStatus("error");
  }, []);

  const markDirty = useCallback(() => {
    setStatus("unsaved");
  }, []);

  const runFinalAction = useCallback(async (action) => {
    pausedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    await queueRef.current;
    try {
      return await action();
    } finally {
      pausedRef.current = false;
      latestSignatureRef.current = signature;
      lastObservedSignatureRef.current = signature;
    }
  }, [signature]);

  useEffect(() => {
    latestSignatureRef.current = signature;
    if (lastObservedSignatureRef.current === signature) return;
    lastObservedSignatureRef.current = signature;

    if (!enabled || pausedRef.current || !hasMeaningfulDraftContent(data)) return;
    if (lastSavedSignatureRef.current === signature) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      if (pausedRef.current) return;

      setStatus("saving");
      try {
        await enqueueSave(data);
        lastSavedSignatureRef.current = signature;
        if (latestSignatureRef.current === signature) {
          setSavedAt(new Date());
          setStatus("saved");
        }
      } catch (error) {
        if (latestSignatureRef.current === signature) setStatus("error");
        console.error("Draft auto-save failed:", error.message);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [data, enabled, enqueueSave, signature]);

  return { status, savedAt, markDirty, markSaved, markFailed, runFinalAction };
}
