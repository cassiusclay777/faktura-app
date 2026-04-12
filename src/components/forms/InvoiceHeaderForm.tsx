"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceHeaderSchema, type InvoiceHeaderInput } from "@/lib/validation";
import { FormInput, FormTextarea, FormCheckbox } from "./FormInput";
import { ErrorDisplay } from "@/components/ErrorBoundary";
import { Loading } from "@/components/Loading";
import { InfoIcon } from "@/components/ui/Tooltip";
import type { InvoiceHeader } from "@/lib/invoice";

interface InvoiceHeaderFormProps {
  initialData?: InvoiceHeader;
  onSubmit: (data: InvoiceHeaderInput) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
  showAresButton?: boolean;
  onAresLookup?: (type: "supplier" | "customer") => void;
  aresLoading?: "supplier" | "customer" | null;
}

export function InvoiceHeaderForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  showAresButton = true,
  onAresLookup,
  aresLoading,
}: InvoiceHeaderFormProps) {
  const methods = useForm<InvoiceHeaderInput>({
    resolver: zodResolver(invoiceHeaderSchema),
    defaultValues: initialData || {
      supplierName: "",
      supplierIco: "",
      supplierAddress: "",
      supplierPaymentMethod: "Převodem",
      supplierBankLabel: "",
      supplierAccountNumber: "",
      supplierIban: "",
      supplierSwift: "",
      customerName: "",
      customerIco: "",
      customerDic: "",
      customerReliableVatPayer: false,
      customerAddress: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      variableSymbol: "",
      note: "",
    },
    mode: "onChange",
  });

  const {
    handleSubmit,
    formState: { errors, isDirty, isValid },
    watch,
    setValue,
  } = methods;

  const supplierIco = watch("supplierIco");
  const customerIco = watch("customerIco");

  const handleSupplierAresLookup = async () => {
    if (onAresLookup && supplierIco) {
      onAresLookup("supplier");
    }
  };

  const handleCustomerAresLookup = async () => {
    if (onAresLookup && customerIco) {
      onAresLookup("customer");
    }
  };

  const formatIco = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.slice(0, 8);
  };

  const formatDic = (value: string) => {
    const clean = value.toUpperCase().replace(/\s/g, '').replace(/^CZ/, '');
    return `CZ${clean}`;
  };

  const formatBankAccount = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 10) {
      return `${clean.slice(0, 6)}-${clean.slice(6)}/0100`;
    }
    return `${clean.slice(0, 6)}-${clean.slice(6, 16)}/${clean.slice(16, 20)}`;
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <ErrorDisplay error={error} title="Chyba formuláře" />}
        
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-200">Dodavatel</h3>
          
           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
             <FormInput
               label={
                 <div className="flex items-center gap-1">
                   Název dodavatele
                   <InfoIcon content="Plný název dodavatele nebo firmy" />
                 </div>
               }
               name="supplierName"
               required
               error={errors.supplierName?.message}
               placeholder="Např. Jan Novák - živnostník"
             />
            
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                 <div className="flex-1">
                   <FormInput
                     label={
                       <div className="flex items-center gap-1">
                         IČO
                         <InfoIcon content="Identifikační číslo osoby - 8 číslic" />
                       </div>
                     }
                     name="supplierIco"
                     required
                     error={errors.supplierIco?.message}
                     placeholder="12345678"
                     onChange={(e) => {
                       const formatted = formatIco(e.target.value);
                       setValue("supplierIco", formatted, { shouldValidate: true });
                     }}
                   />
                 </div>
                {showAresButton && (
                  <button
                    type="button"
                    onClick={handleSupplierAresLookup}
                    disabled={!supplierIco || aresLoading === "supplier"}
                    className="rounded-lg bg-blue-900/30 px-3 py-2.5 text-sm font-medium text-blue-300 transition hover:bg-blue-800/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aresLoading === "supplier" ? (
                      <Loading size="sm" text="" />
                    ) : (
                      "Načíst z ARES"
                    )}
                  </button>
                )}
              </div>
            </div>
            
             <div className="md:col-span-2">
               <FormTextarea
                 label={
                   <div className="flex items-center gap-1">
                     Adresa dodavatele
                     <InfoIcon content="Úplná poštovní adresa včetně PSČ" />
                   </div>
                 }
                 name="supplierAddress"
                 required
                 error={errors.supplierAddress?.message}
                 placeholder="Ulice, č.p., město, PSČ"
                 rows={2}
               />
             </div>
            
            <FormInput
              label="Způsob platby"
              name="supplierPaymentMethod"
              error={errors.supplierPaymentMethod?.message}
              placeholder="Např. Převodem"
            />
            
            <FormInput
              label="Popis banky"
              name="supplierBankLabel"
              error={errors.supplierBankLabel?.message}
              placeholder="Např. Hlavní bankovní spojení"
            />
            
            <FormInput
              label="Číslo účtu"
              name="supplierAccountNumber"
              error={errors.supplierAccountNumber?.message}
              placeholder="123456-7890123456/0100"
              onChange={(e) => {
                const formatted = formatBankAccount(e.target.value);
                setValue("supplierAccountNumber", formatted, { shouldValidate: true });
              }}
              helperText="Formát: XXXXXX-YYYYYYYYYY/ZZZZ"
            />
            
            <FormInput
              label="IBAN"
              name="supplierIban"
              error={errors.supplierIban?.message}
              placeholder="CZ6508000000192000145399"
              helperText="Formát: CZ + 22 číslic"
            />
            
            <FormInput
              label="SWIFT/BIC"
              name="supplierSwift"
              error={errors.supplierSwift?.message}
              placeholder="KOMBCZPP"
              helperText="8 nebo 11 znaků"
            />
          </div>
        </div>
        
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-200">Odběratel</h3>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput
              label="Název odběratele"
              name="customerName"
              required
              error={errors.customerName?.message}
              placeholder="Např. ABC s.r.o."
            />
            
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormInput
                    label="IČO"
                    name="customerIco"
                    required
                    error={errors.customerIco?.message}
                    placeholder="87654321"
                    onChange={(e) => {
                      const formatted = formatIco(e.target.value);
                      setValue("customerIco", formatted, { shouldValidate: true });
                    }}
                  />
                </div>
                {showAresButton && (
                  <button
                    type="button"
                    onClick={handleCustomerAresLookup}
                    disabled={!customerIco || aresLoading === "customer"}
                    className="rounded-lg bg-blue-900/30 px-3 py-2.5 text-sm font-medium text-blue-300 transition hover:bg-blue-800/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aresLoading === "customer" ? (
                      <Loading size="sm" text="" />
                    ) : (
                      "Načíst z ARES"
                    )}
                  </button>
                )}
              </div>
            </div>
            
            <FormInput
              label="DIČ"
              name="customerDic"
              error={errors.customerDic?.message}
              placeholder="CZ12345678"
              onChange={(e) => {
                const formatted = formatDic(e.target.value);
                setValue("customerDic", formatted, { shouldValidate: true });
              }}
              helperText="Formát: CZ + 8-10 číslic"
            />
            
            <FormCheckbox
              label="Spolehlivý plátce DPH"
              name="customerReliableVatPayer"
              error={errors.customerReliableVatPayer?.message}
              helperText="Odběratel je spolehlivý plátce DPH"
            />
            
            <div className="md:col-span-2">
              <FormTextarea
                label="Adresa odběratele"
                name="customerAddress"
                required
                error={errors.customerAddress?.message}
                placeholder="Ulice, č.p., město, PSČ"
                rows={2}
              />
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-200">Fakturace</h3>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormInput
              label="Datum vystavení"
              name="issueDate"
              type="date"
              required
              error={errors.issueDate?.message}
            />
            
            <FormInput
              label="Datum splatnosti"
              name="dueDate"
              type="date"
              required
              error={errors.dueDate?.message}
            />
            
            <FormInput
              label="Variabilní symbol"
              name="variableSymbol"
              error={errors.variableSymbol?.message}
              placeholder="1234567890"
              helperText="Maximálně 10 číslic"
            />
            
            <div className="md:col-span-2">
              <FormTextarea
                label="Poznámka"
                name="note"
                error={errors.note?.message}
                placeholder="Volitelná poznámka k faktuře"
                rows={3}
                helperText="Maximálně 1000 znaků"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
          <div className="text-sm text-zinc-500">
            {isDirty && !isValid && (
              <p className="text-red-400">Opravte chyby ve formuláři</p>
            )}
            {isDirty && isValid && (
              <p className="text-green-400">Formulář je platný</p>
            )}
          </div>
          
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                disabled={isLoading}
              >
                Zrušit
              </button>
            )}
            
            <button
              type="submit"
              disabled={isLoading || !isValid}
              className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loading size="sm" text="" />
                  Ukládám...
                </span>
              ) : (
                "Uložit hlavičku"
              )}
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}