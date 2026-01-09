// Configuration validation utility
export function validateConfig() {
  const required = ['PORT'];
  const numeric = ['PORT', 'CACHE_TTL_SEC', 'FETCH_TIMEOUT_MS', 'MAX_RETRIES'];
  const errors = [];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  for (const key of numeric) {
    if (process.env[key] && isNaN(Number(process.env[key]))) {
      errors.push(`${key} must be a valid number, got: ${process.env[key]}`);
    }
  }

  // Validate PORT is in valid range
  const port = Number(process.env.PORT);
  if (port < 1 || port > 65535) {
    errors.push(`PORT must be between 1 and 65535, got: ${port}`);
  }

  // Validate timeouts are reasonable
  const timeout = Number(process.env.FETCH_TIMEOUT_MS);
  if (timeout < 100 || timeout > 300000) {
    errors.push(`FETCH_TIMEOUT_MS should be between 100ms and 300s, got: ${timeout}ms`);
  }

  if (errors.length > 0) {
    console.error("Configuration validation failed:");
    errors.forEach(err => console.error(`  ❌ ${err}`));
    process.exit(1);
  }

  console.log("✅ Configuration validated successfully");
}
