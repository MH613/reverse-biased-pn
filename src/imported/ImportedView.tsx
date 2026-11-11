import { useEffect, useRef, useState } from "react";
import { readerRevision } from "./readerRevision";
export type ImportedMode = "lab" | "read";
export function ImportedView({
  mode,
  onOverview,
  onContinue,
}: {
  mode: ImportedMode;
  onOverview: () => void;
  onContinue: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (mode !== "lab") return;
    const complete = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        event.source === iframe.current?.contentWindow &&
        event.data?.type === "junction:lab-complete"
      )
        onContinue();
    };
    // Navigation also works while focus is in the host header.
    const navigate = (event: KeyboardEvent) => {
      if (
        !["ArrowRight", "ArrowLeft", "PageDown", "PageUp"].includes(event.key) ||
        (event.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      event.preventDefault();
      if (!event.repeat)
        iframe.current?.contentWindow?.dispatchEvent(
          new KeyboardEvent("keydown", { key: event.key }),
        );
    };
    window.addEventListener("message", complete);
    window.addEventListener("keydown", navigate);
    return () => {
      window.removeEventListener("message", complete);
      window.removeEventListener("keydown", navigate);
    };
  }, [mode, onContinue]);
  const source =
    mode === "lab"
      ? "index.html?embedded=lab&scene=5"
      : `page.html?v=${readerRevision}`;
  return (
    <section
      className="imported-view"
      aria-label={mode === "lab" ? "Question and laboratory" : "Read as a page"}
    >
      {!loaded && (
        <p className="imported-loading" role="status">
          Loading {mode === "lab" ? "laboratory" : "reading page"}…
        </p>
      )}
      <iframe
        ref={iframe}
        title={mode === "lab" ? "Question and laboratory" : "Read as a page"}
        src={`${import.meta.env.BASE_URL}teammate/guide/${source}`}
        allow="fullscreen; camera; xr-spatial-tracking"
        onLoad={(event) => {
          setLoaded(true);
          // Keep the copied reading page intact while its home link returns to our app.
          const doc = event.currentTarget.contentDocument;
          doc?.addEventListener("click", (e) => {
            const anchor = (e.target as Element).closest("a");
            if (!anchor) return;
            if (
              anchor.classList.contains("logo") &&
              anchor.getAttribute("href") === "./"
            ) {
              e.preventDefault();
              onOverview();
            } else if (anchor.origin !== location.origin) {
              anchor.target = "_blank";
              anchor.rel = "noopener noreferrer";
            }
          });
        }}
      />
    </section>
  );
}
