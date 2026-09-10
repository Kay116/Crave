// Dynamic Expo config. `app.json` is the source of truth and is passed in as
// `config`; this only layers in a web base URL when EXPO_BASE_URL is set (the
// GitHub Pages build sets it to "/<repo>" so assets resolve under a project
// subpath). Local dev and native builds don't set it and are unaffected.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    experiments: { ...(config.experiments ?? {}), baseUrl },
  };
};
