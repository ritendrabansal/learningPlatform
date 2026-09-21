// Wrangler's bundler imports .txt files as raw strings by default
// (developers.cloudflare.com/workers/wrangler/bundling/) — TS needs telling what that resolves to.
declare module '*.txt' {
  const content: string
  export default content
}
