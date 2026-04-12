"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useFormContext } from "react-hook-form";

import { type ReactNode } from "react";

interface BaseInputProps {
  label: ReactNode;
  name: string;
  required?: boolean;
  helperText?: ReactNode;
  error?: string;
  className?: string;
}

interface TextInputProps extends BaseInputProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'url' | 'password';
}

interface TextareaProps extends BaseInputProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  rows?: number;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends BaseInputProps, Omit<InputHTMLAttributes<HTMLSelectElement>, 'name'> {
  options: SelectOption[];
}

export const FormInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, name, required, helperText, error, className = "", ...props }, ref) => {
    const { register } = useFormContext();
    
    return (
      <div className="space-y-2">
        <label htmlFor={name} className="block text-sm font-medium text-zinc-300">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <input
          id={name}
          {...register(name)}
          {...props}
          ref={ref}
          className={`
            block w-full rounded-lg border bg-zinc-900 px-4 py-2.5 text-sm
            placeholder:text-zinc-500 focus:outline-none focus:ring-2
            ${error 
              ? 'border-red-700 focus:border-red-600 focus:ring-red-600/30' 
              : 'border-zinc-800 focus:border-blue-600 focus:ring-blue-600/30'
            }
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
        />
        {error && (
          <p id={`${name}-error`} className="text-sm text-red-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${name}-helper`} className="text-sm text-zinc-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, name, required, helperText, error, rows = 3, className = "", ...props }, ref) => {
    const { register } = useFormContext();
    
    return (
      <div className="space-y-2">
        <label htmlFor={name} className="block text-sm font-medium text-zinc-300">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <textarea
          id={name}
          {...register(name)}
          {...props}
          ref={ref}
          rows={rows}
          className={`
            block w-full rounded-lg border bg-zinc-900 px-4 py-2.5 text-sm
            placeholder:text-zinc-500 focus:outline-none focus:ring-2
            ${error 
              ? 'border-red-700 focus:border-red-600 focus:ring-red-600/30' 
              : 'border-zinc-800 focus:border-blue-600 focus:ring-blue-600/30'
            }
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
        />
        {error && (
          <p id={`${name}-error`} className="text-sm text-red-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${name}-helper`} className="text-sm text-zinc-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = "FormTextarea";

export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, name, required, helperText, error, options, className = "", ...props }, ref) => {
    const { register } = useFormContext();
    
    return (
      <div className="space-y-2">
        <label htmlFor={name} className="block text-sm font-medium text-zinc-300">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <select
          id={name}
          {...register(name)}
          {...props}
          ref={ref}
          className={`
            block w-full rounded-lg border bg-zinc-900 px-4 py-2.5 text-sm
            focus:outline-none focus:ring-2
            ${error 
              ? 'border-red-700 focus:border-red-600 focus:ring-red-600/30' 
              : 'border-zinc-800 focus:border-blue-600 focus:ring-blue-600/30'
            }
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
        >
          <option value="">Vyberte...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${name}-error`} className="text-sm text-red-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${name}-helper`} className="text-sm text-zinc-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";

export const FormCheckbox = forwardRef<HTMLInputElement, Omit<TextInputProps, 'type'>>(
  ({ label, name, required, helperText, error, className = "", ...props }, ref) => {
    const { register } = useFormContext();
    
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            id={name}
            type="checkbox"
            {...register(name)}
            {...props}
            ref={ref}
            className={`
              mt-0.5 h-4 w-4 rounded border bg-zinc-900
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950
              ${error 
                ? 'border-red-700 text-red-600 focus:ring-red-600/30' 
                : 'border-zinc-700 text-blue-600 focus:ring-blue-600/30'
              }
              ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : helperText ? `${name}-helper` : undefined}
          />
          <div className="flex-1">
            <label htmlFor={name} className="text-sm font-medium text-zinc-300">
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {error && (
              <p id={`${name}-error`} className="mt-1 text-sm text-red-400">
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={`${name}-helper`} className="mt-1 text-sm text-zinc-500">
                {helperText}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

FormCheckbox.displayName = "FormCheckbox";

export const FormRadioGroup = forwardRef<HTMLInputElement, 
  Omit<TextInputProps, 'type'> & { options: SelectOption[] }
>(
  ({ label, name, required, helperText, error, options, className = "", ...props }, ref) => {
    const { register } = useFormContext();
    
    return (
      <div className="space-y-3">
        <div>
          <legend className="text-sm font-medium text-zinc-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </legend>
          {helperText && !error && (
            <p className="mt-1 text-sm text-zinc-500">{helperText}</p>
          )}
        </div>
        
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option.value} className="flex items-center gap-3">
              <input
                id={`${name}-${option.value}`}
                type="radio"
                value={option.value}
                {...register(name)}
                {...props}
                ref={ref}
                className={`
                  h-4 w-4 border bg-zinc-900
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950
                  ${error 
                    ? 'border-red-700 text-red-600 focus:ring-red-600/30' 
                    : 'border-zinc-700 text-blue-600 focus:ring-blue-600/30'
                  }
                  ${className}
                `}
              />
              <label 
                htmlFor={`${name}-${option.value}`}
                className="text-sm text-zinc-300"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
        
        {error && (
          <p id={`${name}-error`} className="text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormRadioGroup.displayName = "FormRadioGroup";

// Helper component for form field errors
export function FormFieldError({ error }: { error?: string }) {
  if (!error) return null;
  
  return (
    <p className="mt-1 text-sm text-red-400">
      {error}
    </p>
  );
}

// Helper component for form field description
export function FormFieldDescription({ description }: { description?: string }) {
  if (!description) return null;
  
  return (
    <p className="mt-1 text-sm text-zinc-500">
      {description}
    </p>
  );
}