declare module "pdfmake/build/pdfmake" {
  export function createPdf(documentDefinitions: unknown): {
    getBlob: (callback: (blob: Blob) => void) => void;
    download: (filename?: string) => void;
    getDataUrl: (callback: (dataUrl: string) => void) => void;
  };
  
  export const vfs: {
    addVirtual: (fonts: Record<string, string>) => void;
  };
}

declare module "pdfmake/build/vfs_fonts" {
  const fonts: Record<string, string>;
  export default fonts;
}