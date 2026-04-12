import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeWithOpenRouter } from "./openrouter-vision.js";

describe("transcribeWithOpenRouter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pošle multimodální payload na OpenRouter a vrátí text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: [{ type: "text", text: "Přepsaný text" }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await transcribeWithOpenRouter({
      apiKey: "or-key",
      mimeType: "image/png",
      base64: "AAA",
    });

    expect(text).toBe("Přepsaný text");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
