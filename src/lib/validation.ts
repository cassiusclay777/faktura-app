import { z } from "zod";

// Czech IČO validation (8 digits)
export const icoSchema = z.string()
  .regex(/^\d{8}$/, "IČO musí mít přesně 8 číslic")
  .refine((ico) => {
    // Basic IČO validation algorithm
    const digits = ico.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += digits[i] * (8 - i);
    }
    const remainder = sum % 11;
    const checkDigit = remainder === 0 ? 1 : remainder === 1 ? 0 : 11 - remainder;
    return digits[7] === checkDigit;
  }, "Neplatné IČO");

// Czech DIČ validation (CZ + 8-10 digits)
export const dicSchema = z.string()
  .regex(/^CZ\d{8,10}$/, "DIČ musí být ve formátu CZ + 8-10 číslic (např. CZ12345678)")
  .refine((dic) => {
    const digits = dic.slice(2).split('').map(Number);
    return digits.length >= 8 && digits.length <= 10;
  }, "DIČ musí mít 8-10 číslic za CZ");

// Czech bank account number validation (format: XXXXXX-YYYYYYYYYY/ZZZZ)
export const bankAccountSchema = z.string()
  .regex(/^\d{1,6}-\d{1,10}\/\d{4}$/, "Číslo účtu musí být ve formátu XXXXXX-YYYYYYYYYY/ZZZZ")
  .refine((account) => {
    const [prefix, base, bankCode] = account.split(/[-\/]/);
    return prefix.length <= 6 && base.length <= 10 && bankCode.length === 4;
  }, "Neplatný formát čísla účtu");

// IBAN validation (CZ + 22 digits)
export const ibanSchema = z.string()
  .regex(/^CZ\d{22}$/, "IBAN musí být ve formátu CZ + 22 číslic")
  .refine((iban) => {
    // Basic IBAN validation
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const numeric = rearranged.split('').map(c => {
      const code = c.toUpperCase().charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : c;
    }).join('');
    
    let remainder = 0;
    for (let i = 0; i < numeric.length; i++) {
      remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
    }
    return remainder === 1;
  }, "Neplatný IBAN");

// SWIFT/BIC validation
export const swiftSchema = z.string()
  .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, "SWIFT/BIC musí mít 8 nebo 11 znaků (velká písmena a číslice)");

// Email validation
export const emailSchema = z.string()
  .email("Neplatný email")
  .optional()
  .or(z.literal(""));

// Phone number validation (Czech format)
export const phoneSchema = z.string()
  .regex(/^(\+420)? ?\d{3} ?\d{3} ?\d{3}$/, "Telefon musí být ve formátu +420 123 456 789 nebo 123 456 789")
  .optional()
  .or(z.literal(""));

// Date validation (YYYY-MM-DD)
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum musí být ve formátu RRRR-MM-DD")
  .refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime()) && d <= new Date();
  }, "Datum musí být platné a nesmí být v budoucnosti");

// Invoice header schema
export const invoiceHeaderSchema = z.object({
  supplierName: z.string().min(1, "Název dodavatele je povinný").max(200, "Název je příliš dlouhý"),
  supplierIco: icoSchema,
  supplierAddress: z.string().min(1, "Adresa dodavatele je povinná").max(500, "Adresa je příliš dlouhá"),
  supplierPaymentMethod: z.string().max(100, "Způsob platby je příliš dlouhý"),
  supplierBankLabel: z.string().max(100, "Popis banky je příliš dlouhý").optional().or(z.literal("")),
  supplierAccountNumber: bankAccountSchema.optional().or(z.literal("")),
  supplierIban: ibanSchema.optional().or(z.literal("")),
  supplierSwift: swiftSchema.optional().or(z.literal("")),
  
  customerName: z.string().min(1, "Název odběratele je povinný").max(200, "Název je příliš dlouhý"),
  customerIco: icoSchema,
  customerDic: dicSchema.optional().or(z.literal("")),
  customerReliableVatPayer: z.boolean(),
  customerAddress: z.string().min(1, "Adresa odběratele je povinná").max(500, "Adresa je příliš dlouhá"),
  
  issueDate: dateSchema,
  dueDate: dateSchema,
  variableSymbol: z.string()
    .regex(/^\d{1,10}$/, "Variabilní symbol musí obsahovat pouze číslice (max 10)")
    .optional()
    .or(z.literal("")),
  note: z.string().max(1000, "Poznámka je příliš dlouhá").optional().or(z.literal("")),
});

// Invoice line schema
export const invoiceLineSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Popis je povinný").max(500, "Popis je příliš dlouhý"),
  liters: z.number()
    .min(0, "Množství nesmí být záporné")
    .max(999999, "Množství je příliš velké")
    .refine(val => !isNaN(val), "Množství musí být číslo"),
  rate: z.number()
    .min(0, "Cena nesmí být záporná")
    .max(999999, "Cena je příliš vysoká")
    .refine(val => !isNaN(val), "Cena musí být číslo"),
  baseAmount: z.number()
    .min(0, "Základ nesmí být záporný")
    .max(99999999, "Základ je příliš vysoký")
    .refine(val => !isNaN(val), "Základ musí být číslo"),
  dateIso: dateSchema,
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, "Soubor je příliš velký (max 10MB)")
    .refine(file => {
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ];
      return allowedTypes.includes(file.type) || file.name.endsWith('.txt');
    }, "Nepodporovaný formát souboru. Povolené: .txt, .pdf, .jpg, .png, .webp, .gif"),
});

// API request validation
export const processRequestSchema = z.object({
  rawText: z.string().max(100000, "Text je příliš dlouhý").optional(),
  file: z.instanceof(File).optional(),
  provider: z.enum(["ollama", "deepseek"]),
  fixNames: z.boolean(),
  userInstructions: z.string().max(5000, "Instrukce jsou příliš dlouhé").optional(),
  fixNamesIdokladStyle: z.boolean(),
  styleReference: z.string().max(8000, "Reference stylu je příliš dlouhá").optional(),
}).refine(data => data.rawText || data.file, {
  message: "Musí být zadán buď text nebo soubor",
  path: ["rawText"],
});

// ARES lookup validation
export const aresLookupSchema = z.object({
  ico: icoSchema,
});

// Helper functions
export function validateIco(ico: string): { valid: boolean; error?: string } {
  try {
    icoSchema.parse(ico);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      return { valid: false, error: firstError?.message || "Neplatné IČO" };
    }
    return { valid: false, error: "Neplatné IČO" };
  }
}

export function validateDic(dic: string): { valid: boolean; error?: string } {
  try {
    dicSchema.parse(dic);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      return { valid: false, error: firstError?.message || "Neplatné DIČ" };
    }
    return { valid: false, error: "Neplatné DIČ" };
  }
}

export function validateBankAccount(account: string): { valid: boolean; error?: string } {
  try {
    bankAccountSchema.parse(account);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      return { valid: false, error: firstError?.message || "Neplatné číslo účtu" };
    }
    return { valid: false, error: "Neplatné číslo účtu" };
  }
}

export function formatIco(ico: string): string {
  return ico.replace(/\D/g, '').slice(0, 8);
}

export function formatDic(dic: string): string {
  const clean = dic.toUpperCase().replace(/\s/g, '').replace(/^CZ/, '');
  return `CZ${clean}`;
}

export function formatBankAccount(account: string): string {
  const clean = account.replace(/\D/g, '');
  if (clean.length <= 10) {
    return `${clean.slice(0, 6)}-${clean.slice(6)}/0100`;
  }
  return `${clean.slice(0, 6)}-${clean.slice(6, 16)}/${clean.slice(16, 20)}`;
}

// Type exports
export type InvoiceHeaderInput = z.input<typeof invoiceHeaderSchema>;
export type InvoiceHeaderOutput = z.output<typeof invoiceHeaderSchema>;
export type InvoiceLineInput = z.input<typeof invoiceLineSchema>;
export type InvoiceLineOutput = z.output<typeof invoiceLineSchema>;
export type ProcessRequestInput = z.input<typeof processRequestSchema>;
export type ProcessRequestOutput = z.output<typeof processRequestSchema>;