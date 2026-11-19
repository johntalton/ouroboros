import resolve from '@rollup/plugin-node-resolve'

export default {
  input: 'worker-entry.js', // The entry point pulling in your ESM libraries
  output: {
    file: 'public/dist/worker.bundle.js',
    format: 'es',               // Outputs pure, flattened ESM for the worker
    sourcemap: true,
  },
  plugins: [
    resolve({
      browser: true,            // Tells plugins to prefer browser-friendly versions
    }),
  ],
}