'use client';

import { CheckIcon, ChevronDown, Plus, XCircle } from 'lucide-react';
import * as React from 'react';

import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { type FormSize } from '../../constants/form-sizes';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';

type ComboboxBaseOption = {
  id: string;
  code?: string | number;
  name: string;
  disabled?: boolean;
};

type ComboboxValue = string | number;

type ComboboxOnChange<T extends ComboboxBaseOption> = (
  value: string,
  option: T | undefined,
) => void;

type ComboboxOnCreate = (searchValue: string) => void;

type ComboboxProps<TOptions extends readonly ComboboxBaseOption[]> = {
  options: TOptions;
  value?: ComboboxValue;
  onChange?: ComboboxOnChange<TOptions[number]>;
  label?: string | React.ReactNode;
  error?: string;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  readonly?: boolean;
  size?: FormSize;
  showClearIcon?: boolean;
  showArrowIcon?: boolean;
  showSearch?: boolean;
  showCreate?: boolean;
  onCreate?: ComboboxOnCreate;
  createLabel?: string | ((searchValue: string) => string);
  suffix?: React.ReactNode;
  className?: ComponentProps<'div'>['className'];
  triggerClassName?: ComponentProps<typeof Button>['className'];
  popoverClassName?: ComponentProps<typeof PopoverContent>['className'];
};

// Backward compatibility type alias
type ComboboxOption = ComboboxBaseOption;

function Combobox<TOptions extends readonly ComboboxBaseOption[]>({
  options,
  value,
  onChange,
  label,
  error,
  required,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  readonly = false,
  size = 'md',
  showClearIcon = true,
  showArrowIcon = true,
  showSearch = true,
  showCreate = false,
  onCreate,
  createLabel,
  suffix,
  className,
  triggerClassName,
  popoverClassName,
}: ComboboxProps<TOptions>) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  // Reset search value when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchValue('');
    }
  }, [open]);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.id === value) as TOptions[number] | undefined,
    [options, value],
  );

  const canClear = !disabled && !readonly && !!value;

  const handleSelect = (option: TOptions[number]) => {
    onChange?.(option.id, option);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canClear) {
      onChange?.('', undefined);
    }
  };

  const triggerElement = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          size={size}
          className={cn(
            'w-full justify-between group/combobox',
            !value && 'text-muted-foreground',
            error && 'border-destructive',
            triggerClassName,
          )}
        >
          <span className="flex-1 text-left truncate">
            {selectedOption ? selectedOption.name : placeholder}
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && canClear ? (
              <span
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={handleClear}
                className="cursor-pointer"
              >
                {showClearIcon && (
                  <XCircle className="text-muted-foreground hidden group-hover/combobox:block h-4 w-4" />
                )}
                {showArrowIcon && (
                  <ChevronDown className="text-muted-foreground block group-hover/combobox:hidden h-4 w-4" />
                )}
              </span>
            ) : (
              showArrowIcon && <ChevronDown className="text-muted-foreground h-4 w-4" />
            )}
            {suffix}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-(--radix-popover-trigger-width) p-0', popoverClassName)}
        align="start"
      >
        <Command>
          {showSearch && (
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
          )}
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <span className="text-sm text-muted-foreground">{emptyMessage}</span>
                {showCreate && searchValue.trim() && onCreate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onCreate(searchValue.trim());
                      setSearchValue('');
                      setOpen(false);
                    }}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {typeof createLabel === 'function'
                      ? createLabel(searchValue.trim())
                      : createLabel || `Create "${searchValue.trim()}"`}
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  disabled={option.disabled}
                  onSelect={() => handleSelect(option)}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex-1 truncate">{option.name}</span>
                  <CheckIcon
                    className={cn(
                      'h-4 w-4 shrink-0 text-primary',
                      value === option.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (!label && !error) {
    return <div className={cn('w-full', className)}>{triggerElement}</div>;
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <Label className="text-foreground leading-5 block">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className={label ? 'mt-1' : ''}>{triggerElement}</div>
      {error && (
        <div className={`text-destructive text-sm mt-1.5`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export {
  Combobox,
  type ComboboxBaseOption,
  type ComboboxOnChange,
  type ComboboxOnCreate,
  type ComboboxOption,
  type ComboboxProps,
  type ComboboxValue
};

