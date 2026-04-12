import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeWithOpenRouter } from "./openRouterVision.js";

describe("transcribeWithOpenRouter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pošle OCR request na OpenRouter a vrátí text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "  Přepis podkladu  ",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await transcribeWithOpenRouter({
      apiKey: "or-test",
      mimeType: "image/png",
      base64: "AAA",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(text).toBe("Přepis podkladu");
  });
});
