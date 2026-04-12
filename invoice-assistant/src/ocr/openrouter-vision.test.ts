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

  it("při invalid_request_error na custom modelu udělá retry s fallback vision modelem", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          '{"error":{"message":"Provider returned error","metadata":{"raw":"{\\"type\\":\\"invalid_request_error\\"}"}}}',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: [{ type: "text", text: "Přepis po fallbacku" }],
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const text = await transcribeWithOpenRouter({
      apiKey: "or-key",
      model: "some/provider-model-that-fails",
      mimeType: "image/png",
      base64: "AAA",
    });

    expect(text).toBe("Přepis po fallbacku");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondReq] = fetchMock.mock.calls[1] as [string, { body: string }];
    const secondBody = JSON.parse(secondReq.body) as { model: string };
    expect(secondBody.model).toBe("google/gemini-2.5-flash-lite");
  });
});
