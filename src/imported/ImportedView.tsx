import { useState } from "react";
export type ImportedMode = "lab" | "read";
export function ImportedView({
  mode,
  onOverview,
}: {
  mode: ImportedMode;
  onOverview: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const source =
    mode === "lab" ? "index.html?embedded=lab&scene=5" : "page.html";
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
