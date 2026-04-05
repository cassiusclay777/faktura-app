import { describe, expect, it, vi } from "vitest";
import { transcribeWithGemini } from "./geminiVision.js";

vi.mock("@google/generative-ai", () => {
  const generateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => "  přepis z obrázku  ",
    },
  });
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return { generateContent };
      }
    },
  };
});

describe("transcribeWithGemini (mock @google/generative-ai)", () => {
  it("vrátí ořezaný text z odpovědi modelu", async () => {
    const text = await transcribeWithGemini({
      apiKey: "test-key",
      mimeType: "image/png",
      base64: "AAA",
    });
    expect(text).toBe("přepis z obrázku");
  });
});
