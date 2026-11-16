import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
  unit?: string;
  optionalTag?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  helper,
  error,
  unit,
  optionalTag,
  className = '',
  ...rest
}) => {
  const inputId = id || `field_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const helperId = `${inputId}_help`;
  const errorId = `${inputId}_err`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-[13px] font-medium text-[#F5F5F7]">
          {label}
        </label>
        {optionalTag ? (
          <span className="text-[12px] text-[#7C8393]">{optionalTag}</span>
        ) : null}
      </div>

      <div className="relative flex items-center">
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helper ? helperId : undefined}
          className={`w-full min-h-[48px] rounded-[14px] bg-[#090B10]/85 border px-3.5 py-2.5 text-[15px] text-[#F5F5F7] placeholder:text-[#7C8393] transition-colors ${
            error
              ? 'border-[#FF6B70]'
              : 'border-white/[0.1] focus:border-[#FF803E]/80'
          } ${unit ? 'pr-12' : ''} ${className}`}
          {...rest}
        />
        {unit ? (
          <span className="pointer-events-none absolute right-3.5 text-[13px] font-medium text-[#A2A8B5] tabular-nums">
            {unit}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-[12px] text-[#FF6B70]">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-[12px] text-[#7C8393]">
          {helper}
        </p>
      ) : null}
    </div>
  );
};

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helper?: string;
  error?: string;
  optionalTag?: string;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  id,
  label,
  helper,
  error,
  optionalTag,
  className = '',
  ...rest
}) => {
  const inputId = id || `textarea_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-[13px] font-medium text-[#F5F5F7]">
          {label}
        </label>
        {optionalTag ? (
          <span className="text-[12px] text-[#7C8393]">{optionalTag}</span>
        ) : null}
      </div>
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`w-full min-h-[96px] rounded-[14px] bg-[#090B10]/85 border px-3.5 py-2.5 text-[15px] text-[#F5F5F7] placeholder:text-[#7C8393] transition-colors ${
          error ? 'border-[#FF6B70]' : 'border-white/[0.1] focus:border-[#FF803E]/80'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p role="alert" className="text-[12px] text-[#FF6B70]">
          {error}
        </p>
      ) : helper ? (
        <p className="text-[12px] text-[#7C8393]">{helper}</p>
      ) : null}
    </div>
  );
};
