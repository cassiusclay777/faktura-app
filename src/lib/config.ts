import { z } from "zod";

// Environment variable schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // API keys
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  
  // Ollama configuration
  OLLAMA_VISION_MODEL: z.string().default("llava"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  
  // DeepSeek configuration
  DEEPSEEK_WEB_SEARCH_PROVIDER: z.enum(["perplexity", "tavily"]).optional(),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  
  // Gemini configuration
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  
  // Security
  API_RATE_LIMIT: z.coerce.number().default(100),
  API_RATE_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  ALLOWED_FILE_TYPES: z.string().default("txt,pdf,jpg,jpeg,png,webp,gif"),
  
  // Application
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("Faktura z podkladu"),
  
  // iDoklad (if integrated in the future)
  IDOKLAD_CLIENT_ID: z.string().optional(),
  IDOKLAD_CLIENT_SECRET: z.string().optional(),
  IDOKLAD_REDIRECT_URI: z.string().url().optional(),
});

// Parse environment variables
function parseEnv() {
  try {
    return envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      TAVILY_API_KEY: process.env.TAVILY_API_KEY,
      OLLAMA_VISION_MODEL: process.env.OLLAMA_VISION_MODEL,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
      DEEPSEEK_WEB_SEARCH_PROVIDER: process.env.DEEPSEEK_WEB_SEARCH_PROVIDER,
      DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      API_RATE_LIMIT: process.env.API_RATE_LIMIT,
      API_RATE_WINDOW_MS: process.env.API_RATE_WINDOW_MS,
      MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB,
      ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES,
      APP_URL: process.env.APP_URL,
      APP_NAME: process.env.APP_NAME,
      IDOKLAD_CLIENT_ID: process.env.IDOKLAD_CLIENT_ID,
      IDOKLAD_CLIENT_SECRET: process.env.IDOKLAD_CLIENT_SECRET,
      IDOKLAD_REDIRECT_URI: process.env.IDOKLAD_REDIRECT_URI,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:");
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      throw new Error("Invalid environment variables");
    }
    throw error;
  }
}

// Export validated environment variables
export const env = parseEnv();

// Configuration object
export const config = {
  // Environment
  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  
  // API configuration
  api: {
    rateLimit: env.API_RATE_LIMIT,
    rateWindowMs: env.API_RATE_WINDOW_MS,
    maxFileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert to bytes
    allowedFileTypes: env.ALLOWED_FILE_TYPES.split(",").map(ext => ext.trim()),
  },
  
  // AI providers configuration
  providers: {
    gemini: {
      enabled: !!env.GEMINI_API_KEY,
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
    },
    deepseek: {
      enabled: !!env.DEEPSEEK_API_KEY,
      apiKey: env.DEEPSEEK_API_KEY,
      model: env.DEEPSEEK_MODEL,
      webSearch: {
        enabled: !!env.PERPLEXITY_API_KEY || !!env.TAVILY_API_KEY,
        provider: env.DEEPSEEK_WEB_SEARCH_PROVIDER,
        perplexityKey: env.PERPLEXITY_API_KEY,
        tavilyKey: env.TAVILY_API_KEY,
      },
    },
    ollama: {
      enabled: true, // Ollama is always enabled (local)
      visionModel: env.OLLAMA_VISION_MODEL,
      baseUrl: env.OLLAMA_BASE_URL,
    },
  },
  
  // Application
  app: {
    name: env.APP_NAME,
    url: env.APP_URL,
    version: "0.1.0",
  },
  
  // iDoklad (future integration)
  idoklad: {
    enabled: !!env.IDOKLAD_CLIENT_ID && !!env.IDOKLAD_CLIENT_SECRET,
    clientId: env.IDOKLAD_CLIENT_ID,
    clientSecret: env.IDOKLAD_CLIENT_SECRET,
    redirectUri: env.IDOKLAD_REDIRECT_URI,
    apiUrl: "https://api.idoklad.cz/v3",
    authUrl: "https://identity.idoklad.cz/server/connect/authorize",
    tokenUrl: "https://identity.idoklad.cz/server/connect/token",
  },
  
  // Security
  security: {
    corsOrigins:
      env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://localhost:3001"]
      : [env.APP_URL],
    sessionSecret: process.env.SESSION_SECRET || "default-session-secret-change-in-production",
    encryptionKey: process.env.ENCRYPTION_KEY || "default-encryption-key-change-in-production",
  },
  
  // Logging
  logging: {
    level: env.NODE_ENV === "development" ? "debug" : "info",
    format: env.NODE_ENV === "development" ? "pretty" : "json",
    enableConsole: true,
    enableFile: env.NODE_ENV === "production",
    logFile: "logs/app.log",
  },
  
  // Features flags
  features: {
    enableFileUpload: true,
    enablePasteProcessing: true,
    enableCorrection: true,
    enableHistory: true,
    enableExport: true,
    enableTemplates: true,
    enableAresLookup: true,
  },
} as const;

// Helper functions
export function getProviderConfig(provider: "gemini" | "deepseek" | "ollama") {
  return config.providers[provider];
}

export function isProviderEnabled(provider: "gemini" | "deepseek" | "ollama"): boolean {
  return config.providers[provider].enabled;
}

export function getWebSearchConfig() {
  return config.providers.deepseek.webSearch;
}

export function isWebSearchEnabled(): boolean {
  return config.providers.deepseek.webSearch.enabled;
}

export function getAllowedFileTypes(): string[] {
  return config.api.allowedFileTypes;
}

export function isFileTypeAllowed(filename: string): boolean {
  const extension = filename.toLowerCase().split(".").pop() || "";
  return config.api.allowedFileTypes.includes(`.${extension}`) || 
         config.api.allowedFileTypes.includes(extension);
}

export function getMaxFileSize(): number {
  return config.api.maxFileSize;
}

// Type exports
export type Config = typeof config;
export type Env = typeof env;