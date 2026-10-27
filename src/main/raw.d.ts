// Vite's "?raw" imports, for the main process and tests (the renderer gets these from vite/client).
declare module '*?raw' {
  const content: string
  export default content
}
