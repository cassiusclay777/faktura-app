import type { TripLine } from "../types.js";
import {
  correctTripLineDescriptionsOpenRouter,
  type CorrectNamesOpenRouterOptions,
} from "./correctNamesOpenRouter.js";

export type CorrectNamesDeepSeekOptions = CorrectNamesOpenRouterOptions;

/** @deprecated Použij `correctTripLineDescriptionsOpenRouter`. */
export async function correctTripLineDescriptionsDeepSeek(
  lines: TripLine[],
  opts: CorrectNamesDeepSeekOptions,
): Promise<TripLine[]> {
  return correctTripLineDescriptionsOpenRouter(lines, opts);
}
