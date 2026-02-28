'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wc:host-images';
const MAX_DIMENSION = 768;
const JPEG_QUALITY = 0.82;

export const MAX_HOST_IMAGES = 8;
export const IDEAL_HOST_IMAGES_MIN = 3;
export const IDEAL_HOST_IMAGES_MAX = 6;

export interface HostImage {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function compressImage(file: File): Promise<HostImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
        const tw = Math.round(w * scale);
        const th = Math.round(h * scale);

        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));
        ctx.drawImage(img, 0, 0, tw, th);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
        const sizeBytes = Math.round(base64Length * 0.75);

        resolve({
          id: generateId(),
          name: file.name,
          dataUrl,
          width: tw,
          height: th,
          sizeBytes,
        });
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function persistToStorage(imgs: HostImage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imgs));
  } catch {
    // localStorage quota exceeded — silently skip
  }
}

export function useHostImages() {
  const [images, setImages] = useState<HostImage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setImages(JSON.parse(stored) as HostImage[]);
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  const addImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const compressed = await Promise.all(fileArray.map(compressImage));
    setImages((prev) => {
      const next = [...prev, ...compressed].slice(0, MAX_HOST_IMAGES);
      persistToStorage(next);
      return next;
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      persistToStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setImages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    images,
    loaded,
    addImages,
    removeImage,
    clearAll,
    dataUrls: images.map((i) => i.dataUrl),
  };
}
