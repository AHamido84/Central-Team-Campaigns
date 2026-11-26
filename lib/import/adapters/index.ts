import { metaAdapter } from "./meta";
import type { PlatformAdapter } from "./types";

/** Platforms without their own adapter yet use Meta's dictionary (common English names). */
const genericAdapter: PlatformAdapter = { ...metaAdapter, key: "generic", platforms: [], postProcess: metaAdapter.postProcess };

export const ADAPTERS: PlatformAdapter[] = [metaAdapter];

export function adapterFor(platformName: string): PlatformAdapter {
  const n = platformName.trim().toLowerCase();
  return ADAPTERS.find((a) => a.platforms.includes(n)) ?? genericAdapter;
}

export type { PlatformAdapter };
