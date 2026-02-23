'use client';

import * as React from 'react';
import { Upload, X, File, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Progress } from './progress';
import { formatFileSize } from '../../lib/format';

export type FileUploadFile = {
  file: File;
  preview?: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
};

export type FileUploadProps = {
  value?: File[] | FileUploadFile[];
  onChange?: (files: File[] | FileUploadFile[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  onError?: (error: string) => void;
  showPreview?: boolean;
  showProgress?: boolean;
  className?: string;
  dropzoneClassName?: string;
  placeholder?: string;
  uploadText?: string;
};

function FileUpload({
  value = [],
  onChange,
  accept,
  multiple = false,
  maxSize,
  maxFiles,
  disabled = false,
  onError,
  showPreview = true,
  showProgress = false,
  className,
  dropzoneClassName,
  placeholder,
  uploadText,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  // Helper to check if item is a File object
  const isFile = (item: File | FileUploadFile): item is File => {
    return (
      item &&
      typeof item === 'object' &&
      'name' in item &&
      'size' in item &&
      'type' in item &&
      'lastModified' in item &&
      !('file' in item)
    );
  };

  const [files, setFiles] = React.useState<FileUploadFile[]>(() => {
    if (!value || value.length === 0) return [];
    return value.map((item) => {
      if (isFile(item)) {
        return {
          file: item,
          preview: item.type.startsWith('image/') ? URL.createObjectURL(item) : undefined,
          status: 'success' as const,
        };
      }
      return item;
    });
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const filesRef = React.useRef<FileUploadFile[]>(files);

  // Keep ref in sync
  React.useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      filesRef.current.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  // Sync with value prop
  React.useEffect(() => {
    if (!value || value.length === 0) {
      // Cleanup previews when clearing
      const currentFiles = filesRef.current;
      currentFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      if (filesRef.current.length > 0) {
        setFiles([]);
      }
      return;
    }

    // Check if value actually changed to prevent infinite loops
    const valueFiles = value.map((item) => (isFile(item) ? item : item.file));
    const currentFiles = filesRef.current.map((f) => f.file);

    // Compare by name and size to detect changes
    const valueKey = valueFiles.map((f) => `${f.name}-${f.size}`).join(',');
    const currentKey = currentFiles.map((f) => `${f.name}-${f.size}`).join(',');

    if (valueKey === currentKey && valueFiles.length === currentFiles.length) {
      return; // No change, skip update
    }

    // Cleanup old previews first
    filesRef.current.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });

    const newFiles = value.map((item) => {
      if (isFile(item)) {
        return {
          file: item,
          preview: item.type.startsWith('image/') ? URL.createObjectURL(item) : undefined,
          status: 'success' as const,
        };
      }
      return item;
    });
    setFiles(newFiles);
  }, [value]); // Only depend on value to prevent loop

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`;
    }
    if (accept) {
      const acceptedTypes = accept.split(',').map((type) => type.trim());
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      const isValid =
        acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return fileName.endsWith(type.toLowerCase());
          }
          if (type.endsWith('/*')) {
            return fileType.startsWith(type.slice(0, -1));
          }
          return fileType === type || fileType.match(type.replace('*', '.*'));
        }) || acceptedTypes.some((type) => fileName.endsWith(type.toLowerCase()));
      if (!isValid) {
        return `File type not allowed. Accepted types: ${accept}`;
      }
    }
    return null;
  };

  const processFiles = (newFiles: File[]) => {
    const errors: string[] = [];
    const validFiles: FileUploadFile[] = [];

    // Check max files limit
    if (maxFiles && files.length + newFiles.length > maxFiles) {
      const error = `Maximum ${maxFiles} file(s) allowed`;
      errors.push(error);
      onError?.(error);
      return;
    }

    newFiles.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        onError?.(error);
      } else {
        const fileUploadFile: FileUploadFile = {
          file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          status: 'success',
        };
        validFiles.push(fileUploadFile);
      }
    });

    if (errors.length > 0 && validFiles.length === 0) {
      return;
    }

    const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
    setFiles(updatedFiles);
    onChange?.(updatedFiles.map((f) => f.file));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onChange?.(updatedFiles.map((f) => f.file));
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-muted-foreground" />;
    }
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div className={cn('w-full space-y-4', className)} data-slot="file-upload">
      {/* Dropzone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragging && !disabled && 'border-primary bg-primary/5',
          !isDragging && !disabled && 'border-input hover:border-primary/50 hover:bg-accent/50',
          disabled && 'cursor-not-allowed opacity-50',
          dropzoneClassName,
        )}
        data-slot="file-upload-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleFileInputChange}
          className="hidden"
          data-slot="file-upload-input"
        />
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className={cn('h-8 w-8 mb-2', disabled ? 'text-muted-foreground' : 'text-primary')} />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">{uploadText || 'Click to upload'}</span>
            {!disabled && ' or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">
            {placeholder || accept || 'Any file'}
            {multiple && ' (multiple files allowed)'}
            {maxSize && ` (max ${formatFileSize(maxSize)})`}
          </p>
        </div>
      </div>

      {/* File List */}
      {showPreview && files.length > 0 && (
        <div className="space-y-2" data-slot="file-upload-list">
          {files.map((fileUploadFile, index) => {
            const { file, preview, progress, status, error } = fileUploadFile;
            const isImage = file.type.startsWith('image/');

            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                data-slot="file-upload-item"
              >
                {/* Preview/Icon */}
                <div className="flex-shrink-0">
                  {isImage && preview ? (
                    <img
                      src={preview}
                      alt={file.name}
                      className="h-12 w-12 object-cover rounded"
                      data-slot="file-upload-preview"
                    />
                  ) : (
                    <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                      {getFileIcon(file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" data-slot="file-upload-name">
                      {file.name}
                    </p>
                    {status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    {status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground" data-slot="file-upload-size">
                    {formatFileSize(file.size)}
                  </p>
                  {error && (
                    <p className="text-xs text-destructive mt-1" data-slot="file-upload-error">
                      {error}
                    </p>
                  )}
                  {showProgress && progress !== undefined && (
                    <div className="mt-2" data-slot="file-upload-progress">
                      <Progress value={progress} className="h-1" />
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    data-slot="file-upload-remove"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { FileUpload };

