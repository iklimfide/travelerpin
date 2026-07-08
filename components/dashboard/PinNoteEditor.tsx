"use client";

import { useEffect, useRef, useState } from "react";
import { formatMessage } from "@/lib/i18n/client-messages";

type PinNoteEditorProps = {
  value: string;
  onChange: (value: string) => void;
  triggerLabel: string;
  placeholder: string;
  saveLabel: string;
  countLabel: string;
  maxLength: number;
};

export function PinNoteEditor({
  value,
  onChange,
  triggerLabel,
  placeholder,
  saveLabel,
  countLabel,
  maxLength,
}: PinNoteEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setDraft(value);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  function saveNote() {
    onChange(draft.slice(0, maxLength));
    setOpen(false);
  }

  return (
    <div className="pin-note-editor" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="pin-note-editor__trigger pin-form-actions__btn pin-form-actions__btn--primary"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="pin-note-editor__panel"
          role="dialog"
          aria-modal="false"
          aria-label={triggerLabel}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, maxLength))}
            rows={5}
            placeholder={placeholder}
            className="pin-note-editor__textarea"
          />
          <p className="pin-note-editor__count">
            {formatMessage(countLabel, { count: draft.length, max: maxLength })}
          </p>
          <button type="button" className="pin-note-editor__save" onClick={saveNote}>
            {saveLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
