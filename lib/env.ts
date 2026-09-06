/**
 * Environment variable access.
 *
 * A missing variable must not take the app down unless the app genuinely
 * cannot run without it. Optional ones warn once and let the feature that
 * needs them degrade on its own. See the rule in AGENTS.md.
 */

/** Names already warned about, so a warning appears once per process. */
const warned = new Set<string>();

/**
 * Reads a variable the app can run without.
 *
 * `consequence` completes the sentence "X is not set — ...", so write it as
 * what the user will actually see happen.
 */
export function optionalEnv(name: string, consequence: string): string | undefined {
  const value = process.env[name]?.trim();
  if (value) return value;

  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`[env] ${name} is not set — ${consequence}`);
  }

  return undefined;
}

/**
 * Reads a variable the app cannot run without, throwing at the point of use.
 *
 * Deliberately not evaluated at module scope: a throw there takes down every
 * route that transitively imports the module, not just the one that needed
 * the variable.
 */
export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.local.example to .env.local and set it.`,
    );
  }

  return value;
}
