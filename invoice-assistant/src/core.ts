/**
 * Veřejné API pro import z jiných balíčků (např. Next.js faktura-app).
 */
export { parseTripText } from "./parseTripText.js";
export type { ParsedPodklad, TripLine } from "./types.js";
export {
  transcribeHandwriting,
  transcribeHandwritingFromBuffer,
} from "./ocr/visionTranscribe.js";
export type {
  VisionProvider,
  TranscribeOptions,
  TranscribeBufferOptions,
} from "./ocr/visionTranscribe.js";
export {
  hasDeepSeekVisionOcrCredentials,
  resolveDeepSeekVisionOcrApiKey,
} from "./ocr/visionTranscribe.js";
export { correctTripLineDescriptions } from "./ocr/correctNamesGemini.js";
export type { CorrectNamesOptions } from "./ocr/correctNamesGemini.js";
export { correctTripLineDescriptionsDeepSeek } from "./ocr/correctNamesDeepSeek.js";
export type { CorrectNamesDeepSeekOptions } from "./ocr/correctNamesDeepSeek.js";
export { loadImageBufferAsBase64 } from "./ocr/imageFile.js";
