import { GET } from './route';

describe('GET /api/config', () => {
  it('returns configuration with expected structure', async () => {
    const response = await GET();
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Check response structure based on actual API
    expect(data).toHaveProperty('tavilyConfigured');
    expect(data).toHaveProperty('perplexityConfigured');
    expect(data).toHaveProperty('deepSeekWebSearchConfigured');
    
    // All properties should be booleans
    expect(typeof data.tavilyConfigured).toBe('boolean');
    expect(typeof data.perplexityConfigured).toBe('boolean');
    expect(typeof data.deepSeekWebSearchConfigured).toBe('boolean');
    
    // deepSeekWebSearchConfigured should be true if either tavily or perplexity is configured
    expect(data.deepSeekWebSearchConfigured).toBe(
      data.tavilyConfigured || data.perplexityConfigured
    );
  });

  it('handles environment variables correctly', async () => {
    // Temporarily set environment variables for test
    const originalEnv = { ...process.env };
    
    process.env.TAVILY_API_KEY = 'test-tavily-key';
    process.env.PERPLEXITY_API_KEY = '';
    
    try {
      const response = await GET();
      const data = await response.json();
      
      // With TAVILY_API_KEY set, tavilyConfigured should be true
      expect(data.tavilyConfigured).toBe(true);
      expect(data.perplexityConfigured).toBe(false);
      expect(data.deepSeekWebSearchConfigured).toBe(true);
    } finally {
      // Restore original environment
      process.env = originalEnv;
    }
  });

  it('returns false when no environment variables are set', async () => {
    // Temporarily clear environment variables
    const originalEnv = { ...process.env };
    
    delete process.env.TAVILY_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    
    try {
      const response = await GET();
      const data = await response.json();
      
      expect(data.tavilyConfigured).toBe(false);
      expect(data.perplexityConfigured).toBe(false);
      expect(data.deepSeekWebSearchConfigured).toBe(false);
    } finally {
      // Restore original environment
      process.env = originalEnv;
    }
  });
});