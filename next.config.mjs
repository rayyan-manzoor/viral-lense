const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? "/viral-lense" : "",
  assetPrefix: isGitHubPages ? "/viral-lense/" : "",
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
