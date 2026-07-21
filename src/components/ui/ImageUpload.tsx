import React, { useState, useEffect } from 'react';
import { Upload, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { storage } from '@/lib/supabase';
import { Button } from './Button';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  restaurantId: string;
  pathPrefix: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  restaurantId,
  pathPrefix
}: ImageUploadProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value);

  // Sync internal state with prop value
  useEffect(() => {
    setUrlInput(value);
    if (value && !value.includes('supabase.co/storage')) {
      setMode('url');
    } else {
      setMode('upload');
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5 MB limit.');
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
      alert('Unsupported file format. Please upload jpg, jpeg, png, or webp.');
      return;
    }

    setUploading(true);
    try {
      // Delete old uploaded image if replacing
      if (value && value.includes('supabase.co/storage')) {
        await storage.deleteImage(value);
      }
      const publicUrl = await storage.uploadImage(file, restaurantId, pathPrefix);
      onChange(publicUrl);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    onChange(val);
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to delete this image?')) {
      if (value && value.includes('supabase.co/storage')) {
        setUploading(true);
        try {
          await storage.deleteImage(value);
        } catch (err) {
          console.error(err);
        } finally {
          setUploading(false);
        }
      }
      onChange('');
      setUrlInput('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
              mode === 'upload'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
              mode === 'url'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Image URL
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="flex items-center gap-4">
          {value ? (
            <div className="relative h-20 w-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 group">
              <img
                src={value}
                alt="Preview"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={handleClear}
                disabled={uploading}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-20 w-24 rounded-lg border-2 border-dashed border-slate-200 hover:border-emerald-500 dark:border-slate-800 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-950/10 cursor-pointer transition-colors">
              {uploading ? (
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
              ) : (
                <>
                  <Upload className="h-5 w-5 text-slate-400" />
                  <span className="text-[9px] text-slate-400 font-bold mt-1">Upload</span>
                </>
              )}
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          )}

          <div className="flex-1 text-xs text-slate-400">
            {value ? (
              <div className="flex flex-col gap-1">
                <span className="font-bold text-slate-600 dark:text-slate-350">Image uploaded successfully</span>
                <span className="truncate max-w-[200px] text-[10px] font-mono">{value}</span>
              </div>
            ) : (
              <span>Supports PNG, JPG, JPEG, WEBP. Max 5 MB.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder="https://example.com/image.png"
              className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          {value && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleClear}
              disabled={uploading}
              className="rounded-xl px-3 cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
