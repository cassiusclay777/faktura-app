import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers middleware
export function middleware(request: NextRequest) {
  // Clone the response to add headers
  const response = NextResponse.next();

  // Security headers
  const securityHeaders = {
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    
    // Basic XSS protection (legacy but still useful)
    "X-XSS-Protection": "1; mode=block",
    
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    
    // Referrer policy
    "Referrer-Policy": "strict-origin-when-cross-origin",
    
    // Permissions policy (formerly Feature-Policy)
    "Permissions-Policy": 
      "camera=(), microphone=(), geolocation=(), payment=()",
    
    // Content Security Policy (dev: allow https fonts + blob scripts for browser extensions; prod: strict)
    "Content-Security-Policy":
      process.env.NODE_ENV === "production"
        ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.deepseek.com https://generativelanguage.googleapis.com https://api.openai.com; frame-ancestors 'none';"
        : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; font-src 'self' data: https:; connect-src *;",
    
    // Strict Transport Security (HTTPS only in production)
    ...(process.env.NODE_ENV === "production" && {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    }),
  };

  // Add security headers to response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", 
      process.env.NODE_ENV === "development" 
        ? "*" 
        : "https://faktura-app.vercel.app" // Update with your production domain
    );
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  // Rate limiting for API routes (basic implementation)
  if (request.nextUrl.pathname.startsWith("/api/") && request.method === "POST") {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";
    const rateLimitKey = `rate-limit:${ip}:${request.nextUrl.pathname}`;

    // In a real application, you would use Redis or similar for rate limiting
    // This is a simple in-memory implementation for demonstration
    console.log(`Rate limit check for ${rateLimitKey}`);
    
    // You would implement actual rate limiting logic here
    // For now, just log and continue
  }

  // Block suspicious requests
  const userAgent = request.headers.get("user-agent") || "";
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /metasploit/i,
    /nmap/i,
    /wget/i,
    /curl/i,
    /python-requests/i,
    /libwww-perl/i,
    /winhttp/i,
    /zgrab/i,
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious && request.nextUrl.pathname.startsWith("/api/")) {
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    console.warn(`Blocked suspicious request from ${clientIp} with User-Agent: ${userAgent}`);
    return new NextResponse("Access denied", { status: 403 });
  }

  // Validate request size for API endpoints
  if (request.nextUrl.pathname.startsWith("/api/") && request.method === "POST") {
    const contentLength = request.headers.get("content-length");
    
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      return new NextResponse("Request too large", { status: 413 });
    }
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};