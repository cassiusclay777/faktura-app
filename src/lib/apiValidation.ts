import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export class ValidationError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public errors?: z.ZodError["issues"]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: z.Schema<T>
): Promise<T> {
  try {
    let data: unknown;

    if (request.headers.get("content-type")?.includes("application/json")) {
      data = await request.json();
    } else if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await request.formData();
      type FormEntryVal = string | boolean | number | File;
      const entries: [string, FormEntryVal][] = [];

      for (const [key, value] of formData.entries()) {
        let processedValue: FormEntryVal = value as FormEntryVal;
        
        // Convert string booleans to actual booleans
        if (value === "true") processedValue = true;
        if (value === "false") processedValue = false;
        
        // Convert string numbers to numbers if they look like numbers
        if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) {
          const num = Number(value);
          if (!isNaN(num)) processedValue = num;
        }
        
        entries.push([key, processedValue]);
      }
      
      data = Object.fromEntries(entries);
    } else if (request.method === "GET") {
      const url = new URL(request.url);
      data = Object.fromEntries(url.searchParams.entries());
    } else {
      throw new ValidationError("Unsupported content type", 415);
    }

    const result = await schema.safeParseAsync(data);
    
    if (!result.success) {
      throw new ValidationError(
        "Validation failed",
        400,
        result.error.issues
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError("Invalid JSON", 400);
    }
    throw new ValidationError("Validation error", 400);
  }
}

export function createValidationErrorResponse(error: ValidationError): NextResponse {
  return NextResponse.json(
    {
      error: error.message,
      details: error.errors?.map(issue => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    },
    { status: error.status }
  );
}

export function createRateLimitResponse(limit: number, resetTime: number): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      limit,
      reset: new Date(resetTime).toISOString(),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": resetTime.toString(),
      },
    }
  );
}

// Rate limiting middleware
interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  request: NextRequest,
  key: string,
  config: RateLimitConfig = { limit: 100, windowMs: 15 * 60 * 1000 } // 100 requests per 15 minutes
): { limited: boolean; resetTime?: number } {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";
  const storeKey = `${ip}:${key}`;
  const now = Date.now();
  
  const entry = rateLimitStore.get(storeKey);
  
  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(storeKey, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { limited: false };
  }
  
  if (entry.count >= config.limit) {
    return { limited: true, resetTime: entry.resetTime };
  }
  
  entry.count++;
  rateLimitStore.set(storeKey, entry);
  return { limited: false };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime + 24 * 60 * 60 * 1000) { // 24 hours after reset
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .slice(0, 10000); // Limit length
}

/** Plain JSON-like objects only — never recurse into File/Blob (breaks uploads). */
function isPlainObjectForSanitize(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object") return false;
  if (Array.isArray(v)) return false;
  if (v instanceof File || v instanceof Blob) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj } as Record<string, unknown>;

  for (const key of Object.keys(sanitized)) {
    const v = sanitized[key];
    if (typeof v === "string") {
      sanitized[key] = sanitizeInput(v);
    } else if (Array.isArray(v)) {
      sanitized[key] = v.map((item) =>
        typeof item === "string" ? sanitizeInput(item) : item,
      );
    } else if (isPlainObjectForSanitize(v)) {
      sanitized[key] = sanitizeObject(v);
    }
  }

  return sanitized as T;
}

// File validation
export function validateFile(file: File, maxSizeMB = 10): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `Soubor je příliš velký (max ${maxSizeMB}MB)`,
    };
  }
  
  // Check file type
  const allowedTypes = [
    "text/plain",
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  
  const allowedExtensions = [".txt", ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"];
  
  const hasValidType = allowedTypes.includes(file.type);
  const hasValidExtension = allowedExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidType && !hasValidExtension) {
    return {
      valid: false,
      error: "Nepodporovaný formát souboru",
    };
  }
  
  return { valid: true };
}

// CORS headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === "development" 
    ? "*" 
    : "https://faktura-app.vercel.app", // Update with your production domain
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400", // 24 hours
};

// API response wrapper
export function apiResponse<T>(
  data: T,
  status = 200,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...headers,
    },
  });
}

// Error response wrapper
export function apiError(
  message: string,
  status = 500,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      details,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}