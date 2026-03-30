const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['satellite.js'],
  webpack(config) {
    // satellite.js v7 embeds a ~126KB WASM binary via dynamic import('#wasm-*').
    // We only use the pure-JS SGP4 functions, so stub the WASM submodule to
    // prevent webpack from hanging on the Emscripten-generated file.
    config.resolve.alias = {
      ...config.resolve.alias,
      [path.resolve(__dirname, 'node_modules/satellite.js/dist/wasm/index.js')]:
        path.resolve(__dirname, 'src/lib/satellite-wasm-stub.js'),
    };
    return config;
  },
  // Turbopack (used by `next dev` in Next.js 16 by default) also needs
  // the WASM submodule stubbed out.
  turbopack: {
    resolveAlias: {
      'satellite.js/dist/wasm/index': './src/lib/satellite-wasm-stub.js',
    },
  },
};

module.exports = nextConfig;
