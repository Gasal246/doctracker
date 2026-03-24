const missingMessage = (name: string) =>
  `Missing required environment variable: ${name}`;

export function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(missingMessage(name));
  }

  return value;
}

export function getOptionalEnv(name: string) {
  return process.env[name] ?? "";
}
