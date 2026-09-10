/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [".monkeycode-ai.live", "*.monkeycode-ai.live"],
  webpack: (config, { webpack }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: false,
      util: false,
      http: false,
      https: false,
      canvas: false,
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );
    return config;
  },
};

export default nextConfig;
