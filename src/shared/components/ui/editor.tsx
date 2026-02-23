'use client';

import * as React from 'react';
import ReactQuillComponent from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

type ReactQuillProps = React.ComponentProps<typeof ReactQuillComponent>;

import { Label } from './label';
import { type FormSize } from '../../constants/form-sizes';
import { cn } from '../../lib/utils';

export interface EditorProps extends Omit<ReactQuillProps, 'modules' | 'formats'> {
  label?: string | React.ReactNode;
  error?: string;
  required?: boolean;
  size?: FormSize;
  modules?: ReactQuillProps['modules'];
  formats?: string[];
}

const defaultModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    [{ color: [] }, { background: [] }],
    ['link', 'image', 'code-block'],
    ['blockquote'],
    [{ script: 'sub' }, { script: 'super' }],
    ['clean'],
  ],
  clipboard: {
    matchVisual: false,
  },
  history: {
    delay: 1000,
    maxStack: 50,
    userOnly: true,
  },
};

const defaultFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'align',
  'color',
  'background',
  'link',
  'image',
  'code-block',
  'blockquote',
  'script',
];

function Editor({
  className,
  label,
  error,
  required,
  id,
  size = 'md',
  modules,
  formats,
  placeholder,
  value,
  onChange,
  readOnly,
  ...props
}: EditorProps) {
  const generatedId = React.useId();
  const editorId = id || generatedId;
  const hasLabelOrError = label || error;

  const editorModules = modules || defaultModules;
  const editorFormats = formats || defaultFormats;

  const editorElement = (
    <div className="relative w-full">
      <ReactQuillComponent
        id={editorId}
        data-slot="editor"
        data-size={size}
        aria-invalid={!!error}
        theme="snow"
        modules={editorModules}
        formats={editorFormats}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={cn(
          'editor-wrapper',
          '[&_.ql-container]:border-input [&_.ql-container]:dark:bg-input/30 [&_.ql-container]:rounded-b-md [&_.ql-container]:border [&_.ql-container]:shadow-xs',
          '[&_.ql-toolbar]:border-input [&_.ql-toolbar]:dark:bg-input/30 [&_.ql-toolbar]:rounded-t-md [&_.ql-toolbar]:border [&_.ql-toolbar]:border-b-0 [&_.ql-toolbar]:bg-transparent',
          '[&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-foreground',
          '[&_.ql-editor.ql-blank::before]:text-muted-foreground [&_.ql-editor.ql-blank::before]:italic',
          '[&_.ql-stroke]:stroke-foreground [&_.ql-fill]:fill-foreground',
          '[&_.ql-picker-label]:text-foreground [&_.ql-picker-options]:bg-popover [&_.ql-picker-options]:text-popover-foreground [&_.ql-picker-options]:border-border',
          '[&_.ql-snow.ql-toolbar_button:hover]:bg-accent [&_.ql-snow.ql-toolbar_button.ql-active]:bg-accent',
          '[&_.ql-snow.ql-toolbar]:dark:bg-input/30',
          error &&
            '[&_.ql-container]:border-destructive [&_.ql-container]:focus-within:border-destructive [&_.ql-container]:focus-within:ring-destructive [&_.ql-container]:focus-within:ring-[3px] [&_.ql-toolbar]:border-destructive',
          !error &&
            '[&_.ql-container]:focus-within:border-ring [&_.ql-container]:focus-within:ring-ring/50 [&_.ql-container]:focus-within:ring-[3px]',
          readOnly &&
            '[&_.ql-toolbar]:pointer-events-none [&_.ql-toolbar]:opacity-50 [&_.ql-toolbar_button]:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    </div>
  );

  if (!hasLabelOrError) {
    return editorElement;
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <Label htmlFor={editorId}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {editorElement}
      {error && (
        <div className="text-destructive text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export { Editor };

