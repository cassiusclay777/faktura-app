import { afterEach, describe, expect, it, vi } from "vitest";
import { correctTripLineDescriptionsOpenRouter } from "./correctNamesOpenRouter.js";
import { correctTripLineDescriptionsDeepSeek } from "./correctNamesDeepSeek.js";

const sampleLines = [
  {
    dateIso: "2026-03-24",
    description: "BRNISOVICE - SEMAX",
    liters: 10,
    rate: 30,
    baseAmount: 300,
  },
];

describe("correctTripLineDescriptionsOpenRouter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("volá OpenRouter endpoint a vrátí opravené popisy", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '[{"i":0,"popis":"Branišovice - ZEMAX"}]',
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const fixed = await correctTripLineDescriptionsOpenRouter(sampleLines, {
      apiKey: "or-test",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    const [, req] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(req.body) as { model: string };
    expect(body.model).toBe("deepseek/deepseek-chat-v3-0324");
    expect(fixed[0].description).toBe("Branišovice - ZEMAX");
  });

  it("zůstává kompatibilní přes legacy DeepSeek wrapper", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '[{"i":0,"popis":"Branišovice - ZEMAX"}]',
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await correctTripLineDescriptionsDeepSeek(sampleLines, {
      apiKey: "or-test",
      baseUrl: "https://example.local/router",
      model: "deepseek/deepseek-chat-v3-0324",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.local/router/v1/chat/completions",
      expect.any(Object),
    );
  });
});
