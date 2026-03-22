import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Resolves Figma-specific "figma:asset/..." imports to placeholder images
// so the project runs outside of the Figma Make environment.
// Replace the placeholder with your real image paths in src/assets/ when ready.
function figmaAssetPlugin() {
  const PLACEHOLDER =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  return {
    name: "figma-asset",
    resolveId(id: string) {
      if (id.startsWith("figma:asset/")) return "\0" + id;
    },
    load(id: string) {
      if (id.startsWith("\0figma:asset/"))
        return `export default ${JSON.stringify(PLACEHOLDER)}`;
    },
  };
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    figmaAssetPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
