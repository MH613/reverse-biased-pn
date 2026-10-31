import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // GitHub project sites live under the repository name. Keep local development
  // and its browser tests at /; production builds and previews use the site path.
  base: command === "build" || isPreview ? "/reverse-biased-pn/" : "/",
}));
