/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

export interface OCRWorkerMessage {
  type: 'process' | 'cancel';
  id: string;
  data?: {
    file?: File;
    text?: string;
    provider: 'ollama' | 'deepseek';
    options?: OCRWorkerProcessOptions;
  };
}

export type OCRWorkerProcessOptions = {
  fixNames?: boolean;
  userInstructions?: string;
  fixNamesIdokladStyle?: boolean;
  styleReference?: string;
};

export interface OCRWorkerResponse {
  type: 'progress' | 'result' | 'error' | 'complete';
  id: string;
  data?: {
    progress?: number;
    text?: string;
    result?: unknown;
    error?: string;
  };
}

// Simulate OCR processing with progress updates
async function simulateOCRProcessing(
  file: File | undefined,
  text: string | undefined,
  provider: 'ollama' | 'deepseek',
): Promise<string> {
  return new Promise((resolve, reject) => {
    let progress = 0;
    
    const interval = setInterval(() => {
      progress += 10;
      self.postMessage({
        type: 'progress',
        id: 'current',
        data: { progress }
      } as OCRWorkerResponse);
      
      if (progress >= 100) {
        clearInterval(interval);
        
        // Simulate processing result
        if (text) {
          resolve(`Zpracovaný text: ${text.substring(0, 100)}...`);
        } else if (file) {
          resolve(`Soubor ${file.name} zpracován pomocí ${provider}`);
        } else {
          reject('Chyba: žádná data ke zpracování');
        }
      }
    }, 200);
  });
}

// Main worker message handler
self.addEventListener('message', async (event: MessageEvent<OCRWorkerMessage>) => {
  const { type, id, data } = event.data;
  
  if (type === 'process' && data) {
    try {
      const { file, text, provider } = data;
      
      self.postMessage({
        type: 'progress',
        id,
        data: { progress: 0 }
      } as OCRWorkerResponse);
      
      // Simulate initial processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      self.postMessage({
        type: 'progress',
        id,
        data: { progress: 20 }
      } as OCRWorkerResponse);
      
      // Process based on input type
      let result: string;
      
      if (file) {
        // Simulate file reading
        await new Promise(resolve => setTimeout(resolve, 1000));
        self.postMessage({
          type: 'progress',
          id,
          data: { progress: 50 }
        } as OCRWorkerResponse);
        
        // Simulate OCR processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        result = await simulateOCRProcessing(file, undefined, provider);
      } else if (text) {
        // Simulate text processing
        await new Promise(resolve => setTimeout(resolve, 800));
        self.postMessage({
          type: 'progress',
          id,
          data: { progress: 60 }
        } as OCRWorkerResponse);
        
        result = await simulateOCRProcessing(undefined, text, provider);
      } else {
        throw new Error('Žádná data ke zpracování');
      }
      
      self.postMessage({
        type: 'progress',
        id,
        data: { progress: 90 }
      } as OCRWorkerResponse);
      
      // Final delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      self.postMessage({
        type: 'result',
        id,
        data: { result }
      } as OCRWorkerResponse);
      
      self.postMessage({
        type: 'complete',
        id,
        data: { progress: 100 }
      } as OCRWorkerResponse);
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        data: { error: error instanceof Error ? error.message : String(error) }
      } as OCRWorkerResponse);
    }
  } else if (type === 'cancel') {
    // Handle cancellation
    self.postMessage({
      type: 'complete',
      id,
      data: { progress: 0 }
    } as OCRWorkerResponse);
  }
});

// Export empty object for TypeScript module system
export {};