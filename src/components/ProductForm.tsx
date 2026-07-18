'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Product, Category } from '@/types';
import { ArrowLeft, Trash2, ArrowLeftRight, Upload, Sparkles, MoveLeft, MoveRight, Star, HelpCircle, Camera, Loader2, Plus, Link2 } from 'lucide-react';
import { useToast } from '@/components/ToastContainer';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { RGBA, getDominantColor, renderCompositeOnCanvas, rgbToHsl } from '@/lib/imageProcessor';

interface ProductFormProps {
  initialData?: Product | null;
  mode: 'create' | 'edit';
}

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const GENDERS = ['unisex', 'men', 'women'] as const;

export default function ProductForm({ initialData, mode }: ProductFormProps) {
  const { addToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // in Rupees (e.g., 1299)
  const [comparePrice, setComparePrice] = useState(''); // in Rupees
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [gender, setGender] = useState<typeof GENDERS[number]>('unisex');
  const [images, setImages] = useState<string[]>([]);
  const [activeSizes, setActiveSizes] = useState<string[]>(['S', 'M', 'L']);
  const [stock, setStock] = useState<Record<string, number>>({
    XS: 0,
    S: 10,
    M: 10,
    L: 10,
    XL: 0,
    XXL: 0,
  });
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{ name: string; progress: number }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Native Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // AI & SEO Tags States
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // URL paste input state
  const [urlPasteInputs, setUrlPasteInputs] = useState<string[]>(['']);
  const [urlImageErrors, setUrlImageErrors] = useState<Record<number, boolean>>({});
  
  // Camera inputs & Preview canvas refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [processingImage, setProcessingImage] = useState<File | null>(null);
  const [processingImgUrl, setProcessingImgUrl] = useState<string | null>(null);
  const [dominantColor, setDominantColor] = useState<RGBA | null>(null);
  const [activeBgOption, setActiveBgOption] = useState<'neutral' | 'dark' | 'gradient'>('neutral');
  const [bgRemovalStatus, setBgRemovalStatus] = useState<string>('');
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [hasGeneratedDescription, setHasGeneratedDescription] = useState(false);

  // Fetch categories on load
  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await db.getAllCategories();
        setCategoriesList(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, []);

  // Pre-populate if editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSlug(initialData.slug);
      
      const desc = initialData.description || '';
      if (desc.includes('\n\nTags: ')) {
        const parts = desc.split('\n\nTags: ');
        setDescription(parts[0]);
        setTags(parts[1].split(', ').map(t => t.trim()));
        setTagsInput(parts[1]);
      } else {
        setDescription(desc);
        setTags([]);
        setTagsInput('');
      }

      setPrice((initialData.price / 100).toString());
      setComparePrice(initialData.compare_price ? (initialData.compare_price / 100).toString() : '');
      setCategory(initialData.category || '');
      setSubcategory(initialData.subcategory || '');
      setGender(initialData.gender as any);
      setImages(initialData.images || []);
      setActiveSizes(initialData.sizes || []);
      
      const initialStock = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
      if (initialData.stock_quantity) {
        Object.keys(initialData.stock_quantity).forEach((size) => {
          initialStock[size as keyof typeof initialStock] = Number(initialData.stock_quantity[size]);
        });
      }
      setStock(initialStock);
      setIsFeatured(initialData.is_featured);
      setIsActive(initialData.is_active);
    }
  }, [initialData?.id]);

  // Auto-slugify name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (mode === 'create') {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSlugBlur = () => {
    const cleaned = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(cleaned);
  };

  const toggleSize = (size: string) => {
    setActiveSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleStockChange = (size: string, value: number) => {
    setStock((prev) => ({
      ...prev,
      [size]: Math.max(0, value),
    }));
  };

  // Image Upload handler with client validations & upload progress
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Client-side format and size checks
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`"${file.name}" exceeds 5MB size limit.`);
        continue;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        errors.push(`"${file.name}" has invalid format. Use JPEG, PNG, or WebP.`);
        continue;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) {
      errors.forEach((err) => addToast(err, 'error'));
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadingFiles(validFiles.map(f => ({ name: f.name, progress: 0 })));

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      addToast('Cloudinary is not configured.', 'error');
      setIsUploading(false);
      return;
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = 'drftn-products';

      try {
        const signRes = await fetch('/api/admin/cloudinary-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ params: { timestamp, folder } })
        });

        if (!signRes.ok) throw new Error('Failed to get signature');
        const signData = await signRes.json();

        // Perform XHR request to track real-time upload progress percentage
        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('file', file);
          formData.append('api_key', signData.apiKey);
          formData.append('timestamp', String(timestamp));
          formData.append('signature', signData.signature);
          formData.append('folder', folder);

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadingFiles(prev => 
                prev.map((f, idx) => idx === i ? { ...f, progress } : f)
              );
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const res = JSON.parse(xhr.responseText);
              resolve(res.secure_url);
            } else {
              reject(new Error('Cloudinary response error'));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
          xhr.send(formData);
        });

        const optimizedUrl = url.replace('/upload/', '/upload/f_auto,q_auto/');
        uploadedUrls.push(optimizedUrl);
      } catch (err) {
        console.error(err);
        addToast(`Failed to upload "${file.name}"`, 'error');
      }
    }

    if (uploadedUrls.length > 0) {
      setImages((prev) => [...prev, ...uploadedUrls]);
      addToast(`${uploadedUrls.length} image(s) uploaded successfully`, 'success');
    }
    setIsUploading(false);
    setUploadingFiles([]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    addToast('Image removed from collection', 'info');
  };

  // Reordering grid handlers (native HTML5 drag-and-drop)
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...images];
    const draggedItem = reordered[draggedIndex];
    reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    setImages(reordered);
    setDraggedIndex(null);
    addToast('Image order updated', 'info');
  };

  const handleTagsBlur = () => {
    if (!tagsInput.trim()) {
      setTags([]);
      return;
    }
    const parsed = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    setTags(parsed);
  };

  const removeTag = (tagToRemove: string) => {
    const updated = tags.filter(t => t !== tagToRemove);
    setTags(updated);
    setTagsInput(updated.join(', '));
  };

  // ── URL Paste Handlers ──────────────────────────────────────────────────
  const handleUrlInputChange = (index: number, value: string) => {
    setUrlPasteInputs(prev => prev.map((u, i) => (i === index ? value : u)));
    setUrlImageErrors(prev => ({ ...prev, [index]: false }));
  };

  const handleAddUrlRow = () => {
    if (urlPasteInputs.length >= 8) return;
    setUrlPasteInputs(prev => [...prev, '']);
  };

  const handleRemoveUrlRow = (index: number) => {
    setUrlPasteInputs(prev => prev.filter((_, i) => i !== index));
    setUrlImageErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleMoveUrlUp = (index: number) => {
    if (index === 0) return;
    setUrlPasteInputs(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const handleMoveUrlDown = (index: number) => {
    setUrlPasteInputs(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleAddUrlsToGallery = () => {
    const validUrls = urlPasteInputs.filter((u, idx) => u.trim() !== '' && !urlImageErrors[idx]);
    if (validUrls.length === 0) {
      addToast('No valid image URLs to add — enter at least one URL and ensure it loads.', 'error');
      return;
    }
    setImages(prev => [...prev, ...validUrls]);
    setUrlPasteInputs(['']);
    setUrlImageErrors({});
    addToast(`${validUrls.length} image URL(s) added to gallery`, 'success');
  };

  // Intercept uploads or camera captures to run background removal
  const processImageBackground = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      addToast(`"${file.name}" exceeds 5MB size limit.`, 'error');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast(`"${file.name}" has invalid format. Use JPEG, PNG, or WebP.`, 'error');
      return;
    }

    setProcessingImage(file);
    setIsRemovingBg(true);
    setBgRemovalStatus('Downloading AI cutout model (first load takes a few seconds)...');

    try {
      // Import @imgly and onnxruntime-web
      const [{ removeBackground }, ort] = await Promise.all([
        import('@imgly/background-removal'),
        // @ts-ignore
        import('onnxruntime-web'),
      ]);

      // Serve WASM from /public/ort-wasm/ instead of webpack's broken relative path
      ort.env.wasm.wasmPaths = '/ort-wasm/';
      
      setBgRemovalStatus('Processing clean cutout...');
      const transparentBlob = await removeBackground(file, {
        device: 'cpu',
        model: 'isnet',
        progress: (key: string, current: number, total: number) => {
          const pct = Math.round((current / total) * 100);
          setBgRemovalStatus(`Processing clean cutout... ${pct}%`);
        }
      });

      const transparentUrl = URL.createObjectURL(transparentBlob);
      setProcessingImgUrl(transparentUrl);

      setBgRemovalStatus('Analyzing garment color palette...');
      const img = new Image();
      img.src = transparentUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load cutout image element'));
      });

      const domColor = getDominantColor(img);
      setDominantColor(domColor);
      setIsRemovingBg(false);
      setBgRemovalStatus('');
    } catch (err: any) {
      console.error(err);
      addToast(`Failed to strip background: ${err.message || err}`, 'error');
      setIsRemovingBg(false);
      setBgRemovalStatus('');
      setProcessingImage(null);
    }
  };

  // Keep preview canvas updated as options toggle
  useEffect(() => {
    if (!processingImgUrl || !dominantColor || !previewCanvasRef.current) return;

    const img = new Image();
    img.src = processingImgUrl;
    img.onload = () => {
      renderCompositeOnCanvas({
        canvas: previewCanvasRef.current!,
        cutoutImg: img,
        backgroundStyle: activeBgOption,
        dominantColor,
      });
    };
  }, [processingImgUrl, activeBgOption, dominantColor]);

  const uploadRemainingImagesDirectly = async (validFiles: File[]) => {
    setIsUploading(true);
    setUploadingFiles((prev) => [
      ...prev,
      ...validFiles.map((f) => ({ name: f.name, progress: 0 })),
    ]);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      addToast('Cloudinary is not configured.', 'error');
      setIsUploading(false);
      return;
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = 'drftn-products';

      try {
        const signRes = await fetch('/api/admin/cloudinary-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ params: { timestamp, folder } })
        });

        if (!signRes.ok) throw new Error('Failed to get signature');
        const signData = await signRes.json();

        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('file', file);
          formData.append('api_key', signData.apiKey);
          formData.append('timestamp', String(timestamp));
          formData.append('signature', signData.signature);
          formData.append('folder', folder);

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadingFiles((prev) =>
                prev.map((f) => (f.name === file.name ? { ...f, progress } : f))
              );
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const res = JSON.parse(xhr.responseText);
              resolve(res.secure_url);
            } else {
              reject(new Error('Cloudinary response error'));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
          xhr.send(formData);
        });

        const optimizedUrl = url.replace('/upload/', '/upload/f_auto,q_auto/');
        uploadedUrls.push(optimizedUrl);
      } catch (err) {
        console.error(err);
        addToast(`Failed to upload "${file.name}"`, 'error');
      }
    }

    if (uploadedUrls.length > 0) {
      setImages((prev) => [...prev, ...uploadedUrls]);
      addToast(`${uploadedUrls.length} secondary image(s) uploaded successfully`, 'success');
    }
    setIsUploading(false);
    setUploadingFiles((prev) => prev.filter((pf) => !validFiles.some((vf) => vf.name === pf.name)));
  };

  // Create high-res composite, upload to Cloudinary, and trigger description pre-fill
  const handleApplyAndUpload = async () => {
    if (!previewCanvasRef.current || !processingImage || !dominantColor) return;

    setIsUploading(true);
    setBgRemovalStatus('Generating studio composition...');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1200;

      const img = new Image();
      img.src = processingImgUrl!;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      renderCompositeOnCanvas({
        canvas,
        cutoutImg: img,
        backgroundStyle: activeBgOption,
        dominantColor,
      });

      const compositeBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to output canvas blob'));
          },
          'image/jpeg',
          0.9
        );
      });

      setBgRemovalStatus('Uploading composite image...');
      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = 'drftn-products';

      const signRes = await fetch('/api/admin/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: { timestamp, folder } })
      });

      if (!signRes.ok) throw new Error('Failed to fetch Cloudinary API signature');
      const signData = await signRes.json();

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const formData = new FormData();
      formData.append('file', compositeBlob, `processed-${processingImage.name}`);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signData.signature);
      formData.append('folder', folder);

      const xhrRes = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Cloudinary response error'));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network upload failed')));
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
        xhr.send(formData);
      });

      const url = xhrRes.secure_url;
      const optimizedUrl = url.replace('/upload/', `/upload/f_auto,q_auto/`);

      setImages((prev) => [...prev, optimizedUrl]);
      addToast('Studio image generated and added successfully', 'success');

      // Auto-trigger description generation if first image
      if (!hasGeneratedDescription) {
        generateDescription(compositeBlob);
        setHasGeneratedDescription(true);
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Failed to save processed image: ${err.message || err}`, 'error');
    } finally {
      setIsUploading(false);
      setBgRemovalStatus('');
      setProcessingImage(null);
      setProcessingImgUrl(null);
      setDominantColor(null);
    }
  };

  const handleUploadOriginal = async () => {
    if (!processingImage) return;

    setIsUploading(true);
    setBgRemovalStatus('Uploading original image...');

    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = 'drftn-products';

      const signRes = await fetch('/api/admin/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: { timestamp, folder } })
      });

      if (!signRes.ok) throw new Error('Failed to fetch Cloudinary API signature');
      const signData = await signRes.json();

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const formData = new FormData();
      formData.append('file', processingImage);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signData.signature);
      formData.append('folder', folder);

      const xhrRes = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Cloudinary response error'));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network upload failed')));
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
        xhr.send(formData);
      });

      const url = xhrRes.secure_url;
      const optimizedUrl = url.replace('/upload/', `/upload/f_auto,q_auto/`);

      setImages((prev) => [...prev, optimizedUrl]);
      addToast('Original image added successfully', 'success');

      // Auto-trigger description generation if first image
      if (!hasGeneratedDescription) {
        generateDescription(processingImage);
        setHasGeneratedDescription(true);
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Upload failed: ${err.message || err}`, 'error');
    } finally {
      setIsUploading(false);
      setBgRemovalStatus('');
      setProcessingImage(null);
      setProcessingImgUrl(null);
      setDominantColor(null);
    }
  };

  const generateDescription = async (imageFile: File | Blob) => {
    setIsGeneratingDescription(true);
    setBgRemovalStatus('Generating product description with Gemini Flash...');

    try {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for description'));
      });

      // Compress preview for AI (384x384 JPEG)
      const canvasSmall = document.createElement('canvas');
      canvasSmall.width = 384;
      canvasSmall.height = 384;
      const ctxSmall = canvasSmall.getContext('2d');
      if (ctxSmall) {
        ctxSmall.drawImage(img, 0, 0, 384, 384);
        const dataUrl = canvasSmall.toDataURL('image/jpeg', 0.85);
        const compressedBase64 = dataUrl.split(',')[1];

        const genRes = await fetch('/api/admin/generate-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: compressedBase64,
            mimeType: 'image/jpeg'
          })
        });

        if (genRes.ok) {
          const genData = await genRes.json();
          if (genData.warning) {
            addToast(genData.warning, 'info');
          }
          if (genData.title) {
            setName(genData.title);
            const generatedSlug = genData.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, '');
            setSlug(generatedSlug);
          }
          if (genData.description) {
            setDescription(genData.description);
          }
          if (genData.tags && genData.tags.length > 0) {
            setTags(genData.tags);
            setTagsInput(genData.tags.join(', '));
          }
          addToast('AI title, description, and tags generated!', 'success');
        }
      }
    } catch (err: any) {
      console.error(err);
      addToast(`Failed to generate AI copywriting: ${err.message || err}`, 'error');
    } finally {
      setIsGeneratingDescription(false);
      setBgRemovalStatus('');
    }
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const reordered = [...images];
    const target = reordered[index];
    reordered.splice(index, 1);
    reordered.unshift(target);
    setImages(reordered);
    addToast('Cover image updated successfully', 'success');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return addToast('Product name is required', 'error');
    if (!slug.trim()) return addToast('Product slug is required', 'error');
    if (!description.trim()) return addToast('Product description is required', 'error');
    if (!price || isNaN(Number(price))) return addToast('Valid product price is required', 'error');
    if (images.length === 0) return addToast('Please upload at least one product image', 'error');
    if (activeSizes.length === 0) return addToast('Please select at least one active size', 'error');

    setIsSaving(true);

    try {
      // Build stock record based on active sizes, default 0 for inactive
      const finalStock: Record<string, number> = {};
      AVAILABLE_SIZES.forEach((size) => {
        finalStock[size] = activeSizes.includes(size) ? (stock[size] || 0) : 0;
      });

      const finalDescription = tags.length > 0 
        ? `${description.trim()}\n\nTags: ${tags.join(', ')}`
        : description.trim();

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: finalDescription,
        price: Math.round(Number(price) * 100), // convert to paise
        compare_price: comparePrice ? Math.round(Number(comparePrice) * 100) : undefined, // convert to paise
        category,
        subcategory: subcategory || null,
        gender,
        images,
        sizes: activeSizes,
        stock_quantity: finalStock,
        is_featured: isFeatured,
        is_active: isActive,
      };

      // [DEV] Log the exact payload being sent to the DB for verification
      console.log('[DEV] Product payload →', JSON.stringify({
        ...payload,
        price_rupees: Number(price),
        price_paise: payload.price,
        compare_price_rupees: comparePrice ? Number(comparePrice) : undefined,
        compare_price_paise: payload.compare_price,
        images_count: images.length,
        images_order: images.map((url, i) => ({ sort_order: i, url: url.slice(0, 80) + (url.length > 80 ? '…' : '') })),
      }, null, 2));

      if (mode === 'create') {
        await db.createProduct(payload as any);
        addToast('Product created successfully', 'success');
      } else {
        if (!initialData?.id) throw new Error('Missing product ID for updates');
        await db.updateProduct(initialData.id, payload as any);
        addToast('Product updated successfully', 'success');
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      console.error(err);
      addToast(mode === 'create' ? 'Failed to create product' : 'Failed to update product', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl animate-fade-in pb-16 relative">
      {/* Global progress indicator bar */}
      {(isSaving || isUploading || isGeneratingDescription) && (
        <div className="fixed top-0 left-0 w-full h-[3px] bg-zinc-100 z-[999] overflow-hidden">
          <div className="bg-zinc-900 h-full animate-infinite-loading" />
        </div>
      )}
      
      {/* Header back */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="p-2 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-widest uppercase text-zinc-900">
            {mode === 'create' ? 'New Product' : 'Edit Product'}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {mode === 'create' ? 'Create a new streetwear piece.' : `Modify details for ${initialData?.name || 'product'}.`}
          </p>
        </div>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Basic Form Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info */}
          <div className="bg-white border border-zinc-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-200/60 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-red" />
              General Details
            </h2>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Product Name</label>
              <input
                type="text"
                placeholder="e.g. Essential Black Tee"
                value={name}
                onChange={handleNameChange}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
                required
              />
            </div>
 
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Slug URL path</label>
              <input
                type="text"
                placeholder="e.g. essential-black-tee"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={handleSlugBlur}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
                required
              />
            </div>
 
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Description</label>
                {images.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsGeneratingDescription(true);
                        setBgRemovalStatus('Generating product details with Gemini...');
                        // Server-side fetch avoids CORS restrictions on Cloudinary URLs
                        const genRes = await fetch('/api/admin/generate-description', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ imageUrl: images[0] }),
                        });
                        if (!genRes.ok) {
                          const errData = await genRes.json().catch(() => ({}));
                          throw new Error(errData.error || `HTTP ${genRes.status}`);
                        }
                        const genData = await genRes.json();
                        if (genData.title) {
                          setName(genData.title);
                          setSlug(genData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                        }
                        if (genData.description) setDescription(genData.description);
                        if (genData.tags?.length > 0) {
                          setTags(genData.tags);
                          setTagsInput(genData.tags.join(', '));
                        }
                        addToast('AI title, description & tags generated!', 'success');
                      } catch (err: any) {
                        console.error(err);
                        addToast(`Failed to generate AI copy: ${err.message || err}`, 'error');
                      } finally {
                        setIsGeneratingDescription(false);
                        setBgRemovalStatus('');
                      }
                    }}
                    disabled={isGeneratingDescription || isUploading}
                    className="text-[10px] uppercase font-bold tracking-widest text-zinc-900 hover:text-zinc-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with AI
                  </button>
                )}
              </div>
              <textarea
                placeholder="Describe the product fit, fabric weight (e.g. 240 GSM heavy cotton), design aesthetic, details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all resize-none leading-relaxed"
                required
              />
            </div>
 
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">SEO Search Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. oversized, distressed, premium fleece, boxy fit"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={handleTagsBlur}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span key={tag} className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-zinc-100 text-zinc-600 border border-zinc-200/80 rounded-sm flex items-center gap-1.5">
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag)} 
                        className="text-zinc-500 hover:text-brand-red font-mono leading-none text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sizing & Stock */}
          <div className="bg-white border border-zinc-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-200/60 pb-3">
              Sizes & Inventory Levels
            </h2>
 
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Select Active Sizes</span>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_SIZES.map((size) => {
                    const isActiveSize = activeSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`w-12 h-12 font-mono font-bold text-xs border uppercase tracking-wider flex items-center justify-center transition-all ${
                          isActiveSize
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
 
              {activeSizes.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-zinc-200/60">
                  <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Quantities in Stock</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {activeSizes.map((size) => (
                      <div key={size} className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Size {size} Qty</label>
                        <input
                          type="number"
                          value={stock[size] ?? 0}
                          onChange={(e) => handleStockChange(size, parseInt(e.target.value) || 0)}
                          className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
                          min="0"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cloudinary Image Uploader */}
          <div className="bg-white border border-zinc-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                Product Media
                <span className="text-[10px] text-zinc-500 font-normal lowercase">(JPEG, PNG, WebP — max 5MB per file)</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Upload multiple product images. First image is used as main thumbnail.</p>
            </div>

            <div className="space-y-6">
              {/* ── URL Paste Panel ─────────────────────────────────────────── */}
              <div className="border border-zinc-200 bg-zinc-50/40 p-5 rounded-lg space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-brand-red" />
                    Paste Cloudinary URLs
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Paste image URLs directly. First row becomes the preview shown on the shop grid (sort_order&nbsp;0).
                  </p>
                </div>

                <div className="space-y-3">
                  {urlPasteInputs.map((url, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      {/* Live thumbnail */}
                      <div className="w-12 h-14 shrink-0 border border-zinc-200 bg-zinc-100 rounded overflow-hidden flex items-center justify-center">
                        {url.trim() ? (
                          urlImageErrors[idx] ? (
                            <span className="text-[8px] text-red-500 font-bold text-center px-0.5 leading-tight">Bad URL</span>
                          ) : (
                            <img
                              src={url}
                              alt={`url-preview-${idx}`}
                              className="w-full h-full object-cover"
                              onError={() => setUrlImageErrors(prev => ({ ...prev, [idx]: true }))}
                              onLoad={() => setUrlImageErrors(prev => ({ ...prev, [idx]: false }))}
                            />
                          )
                        ) : (
                          <Camera className="w-4 h-4 text-zinc-300" />
                        )}
                      </div>

                      {/* Input + controls */}
                      <div className="flex-1 space-y-1">
                        {idx === 0 && (
                          <span className="text-[9px] text-brand-red font-bold uppercase tracking-widest">
                            ★ Preview image — shown on shop grid (sort_order 0)
                          </span>
                        )}
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="url"
                            placeholder={idx === 0 ? 'https://res.cloudinary.com/…' : 'Additional image URL'}
                            value={url}
                            onChange={e => handleUrlInputChange(idx, e.target.value)}
                            className={`flex-1 bg-white border text-zinc-900 px-3 py-2 text-xs focus:outline-none transition-all font-mono ${
                              urlImageErrors[idx]
                                ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                                : 'border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleMoveUrlUp(idx)}
                            disabled={idx === 0}
                            className="p-1.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                            title="Move up"
                          >
                            <MoveLeft className="w-3 h-3 rotate-90" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveUrlDown(idx)}
                            disabled={idx >= urlPasteInputs.length - 1}
                            className="p-1.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                            title="Move down"
                          >
                            <MoveRight className="w-3 h-3 rotate-90" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveUrlRow(idx)}
                            disabled={urlPasteInputs.length === 1}
                            className="p-1.5 border border-zinc-200 bg-white hover:bg-red-50 hover:border-red-300 text-zinc-500 hover:text-brand-red disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {urlImageErrors[idx] && (
                          <p className="text-[10px] text-red-500">
                            Couldn’t load this URL — check for typos or access restrictions.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-zinc-200/60">
                  <button
                    type="button"
                    onClick={handleAddUrlRow}
                    disabled={urlPasteInputs.length >= 8}
                    className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add another image
                  </button>
                  <button
                    type="button"
                    onClick={handleAddUrlsToGallery}
                    disabled={urlPasteInputs.every(u => !u.trim())}
                    className="ml-auto px-5 py-2 bg-zinc-900 text-white text-[10px] uppercase font-bold tracking-widest hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded shadow-sm"
                  >
                    Add to Gallery ↓
                  </button>
                </div>
              </div>

              {/* Hidden inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  
                  // The first file goes into the AI Studio modal
                  processImageBackground(files[0]);

                  // Upload remaining files directly in the background
                  if (files.length > 1) {
                    const validFiles: File[] = [];
                    for (let i = 1; i < files.length; i++) {
                      const file = files[i];
                      if (file.size <= 5 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                        validFiles.push(file);
                      }
                    }
                    if (validFiles.length > 0) {
                      uploadRemainingImagesDirectly(validFiles);
                    }
                  }
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processImageBackground(e.target.files[0]);
                  }
                }}
              />

              {!processingImage ? (
                /* Drag and Drop Upload Area */
                <div 
                  className="border-2 border-dashed border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 p-8 text-center rounded-lg flex flex-col items-center justify-center gap-4 transition-all duration-300"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processImageBackground(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <Upload className="w-8 h-8 text-zinc-400" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 block">
                      Add Product Image
                    </span>
                    <span className="text-[10px] text-zinc-500 block">Drag & drop garment photo here, or use options below:</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-zinc-200 text-zinc-650 hover:text-zinc-900 hover:border-zinc-350 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-zinc-200 text-zinc-650 hover:text-zinc-900 hover:border-zinc-350 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5 text-brand-red" />
                      Take Photo
                    </button>
                  </div>
                </div>
              ) : (
                /* AI Studio Studio Builder */
                <div className="bg-white border border-zinc-200 p-6 rounded-lg space-y-6 shadow-md">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-amber animate-pulse" />
                        AI Streetwear Studio
                      </span>
                      <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[280px]">File: {processingImage.name}</p>
                    </div>
                    {(isRemovingBg || isUploading || isGeneratingDescription) && (
                      <span className="text-[10px] uppercase font-bold text-brand-red tracking-wider font-mono flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Active
                      </span>
                    )}
                  </div>

                  {/* Loading Progress State */}
                  {bgRemovalStatus && (
                    <div className="space-y-2 bg-zinc-50 p-4 border border-zinc-200 rounded-md">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-widest block">
                        Processing details...
                      </span>
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-red shrink-0" />
                        <span className="text-xs text-zinc-600 font-body">{bgRemovalStatus}</span>
                      </div>
                    </div>
                  )}

                  {!isRemovingBg && processingImgUrl && dominantColor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      {/* Interactive Composite Preview Canvas */}
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">Real-time studio composite</span>
                        <canvas 
                          ref={previewCanvasRef} 
                          className="w-full max-w-[220px] aspect-[3/4] border border-zinc-200 bg-zinc-50 rounded shadow-lg transition-all duration-300"
                          width={450}
                          height={600}
                        />
                      </div>

                      {/* Backdrop Choice Panels */}
                      <div className="space-y-4">
                        <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider block border-b border-zinc-150 pb-2">Select Studio Backdrop</span>
                        <div className="grid grid-cols-1 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setActiveBgOption('neutral')}
                            className={`p-3 border rounded text-left transition-all ${
                              activeBgOption === 'neutral'
                                ? 'bg-zinc-50 border-zinc-900 text-zinc-900 shadow-sm'
                                : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider">Matched Neutral</span>
                              <div className="w-3.5 h-3.5 rounded-full border border-zinc-800" style={{ backgroundColor: `hsl(${rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b).h}, 10%, 93%)` }} />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">Soft complementary desaturated tone derived from garment pixels.</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveBgOption('dark')}
                            className={`p-3 border rounded text-left transition-all ${
                              activeBgOption === 'dark'
                                ? 'bg-zinc-900 border-zinc-900 text-white'
                                : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider">Charcoal Brand Dark</span>
                              <div className="w-3.5 h-3.5 rounded-full border border-zinc-800 bg-[#121212]" />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">Standard dark studio catalog backdrop (#121212).</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveBgOption('gradient')}
                            className={`p-3 border rounded text-left transition-all ${
                              activeBgOption === 'gradient'
                                ? 'bg-zinc-50 border-zinc-900 text-zinc-900 shadow-sm'
                                : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider">Studio Soft Gradient</span>
                              <div className="w-3.5 h-3.5 rounded-full border border-zinc-800" style={{ background: `linear-gradient(135deg, hsl(${rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b).h}, 15%, 88%), hsl(${rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b).h}, 8%, 70%))` }} />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">Responsive radial light dispersion centering the product details.</p>
                          </button>
                        </div>

                        {/* Interactive triggers */}
                        <div className="flex gap-3 pt-3 flex-wrap">
                          <button
                            type="button"
                            onClick={handleApplyAndUpload}
                            disabled={isUploading}
                            className="flex-[2] bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-900 text-[11px] font-extrabold uppercase tracking-widest py-2.5 px-4 rounded shadow-sm transition-all disabled:opacity-50 disabled:bg-zinc-50 disabled:text-zinc-400 disabled:border-zinc-200 min-w-[150px]"
                          >
                            {isUploading ? 'Uploading...' : 'Apply & Add to Gallery'}
                          </button>
                          <button
                            type="button"
                            onClick={handleUploadOriginal}
                            disabled={isUploading}
                            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold uppercase tracking-widest py-2.5 px-4 rounded transition-all disabled:opacity-50 whitespace-nowrap shadow-sm disabled:bg-zinc-150 disabled:text-zinc-400"
                            title="Skip AI Cutout and use the original image"
                          >
                            Use Original
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProcessingImage(null);
                              setProcessingImgUrl(null);
                              setDominantColor(null);
                            }}
                            disabled={isUploading}
                            className="px-4 py-2.5 border border-zinc-200 hover:border-zinc-300 text-zinc-500 hover:text-zinc-900 text-[11px] font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar View */}
              {uploadingFiles.length > 0 && (
                <div className="space-y-3 bg-zinc-50 p-4 border border-zinc-200 rounded">
                  <span className="text-xs uppercase font-bold text-zinc-500 font-mono tracking-wider block">Uploading Files ({uploadingFiles.length})</span>
                  <div className="space-y-2">
                    {uploadingFiles.map((file, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <span>{file.progress}%</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-zinc-900 h-full transition-all duration-200" 
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Thumbnail Grid */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Uploaded Images ({images.length})</span>
                    <div className="group relative flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-500 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 leading-normal rounded shadow-xl hidden group-hover:block z-50 font-normal">
                        Drag thumbnails horizontally to reorder gallery. Click star to set main listing cover image.
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {images.map((url, idx) => {
                      const isDragTarget = draggedIndex !== null && draggedIndex !== idx;
                      return (
                        <div 
                          key={url} 
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(idx)}
                          className={`relative aspect-[3/4] bg-zinc-50 border border-zinc-200 group rounded-md overflow-hidden cursor-move transition-all duration-300 ${
                            draggedIndex === idx ? 'opacity-40 scale-95 border-zinc-900' : ''
                          } ${isDragTarget ? 'hover:border-zinc-400' : ''}`}
                          onClick={() => makePrimary(idx)}
                        >
                          <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover select-none pointer-events-none hover:opacity-90 transition-opacity" />
                          
                          {/* Top-left Indicator (Cover status) */}
                          {idx === 0 && (
                            <div className="absolute top-2 left-2 bg-zinc-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shadow">
                              Cover
                            </div>
                          )}

                          {/* Hover Action Controls */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="p-1.5 bg-brand-black/80 hover:bg-brand-red text-zinc-400 hover:text-white rounded transition-colors"
                                title="Delete Image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                              <button
                                type="button"
                                onClick={() => makePrimary(idx)}
                                className={`flex items-center gap-1 px-1.5 py-1 rounded transition-colors text-[9px] font-bold uppercase tracking-wider ${
                                  idx === 0
                                    ? 'bg-brand-red text-white'
                                    : 'bg-brand-black/80 hover:bg-brand-offwhite hover:text-brand-black text-zinc-400'
                                }`}
                                title={idx === 0 ? 'Primary Image' : 'Make Primary Cover'}
                              >
                                <Star className="w-3 h-3 fill-current" />
                                <span>Cover</span>
                              </button>
                              
                              <span className="font-mono text-[9px] bg-zinc-950/80 px-1 py-0.5 rounded">#{idx + 1}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-550 italic mt-2">
                    * Tip: Drag and drop preview frames to adjust sequence order on the product details page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Attributes, Publishing, and Pricing details */}
        <div className="space-y-6">
          
          {/* Pricing */}
          <div className="bg-white border border-zinc-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-200/60 pb-3">
              Pricing Details
            </h2>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block font-mono">Retail Price (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold font-mono text-zinc-400 text-sm">₹</span>
                <input
                  type="number"
                  placeholder="e.g. 1299"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 pl-9 pr-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block font-mono">Compare Price (₹ MRP)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold font-mono text-zinc-400 text-sm">₹</span>
                <input
                  type="number"
                  placeholder="e.g. 1999"
                  value={comparePrice}
                  onChange={(e) => setComparePrice(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 pl-9 pr-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all font-mono"
                  min="0"
                />
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Strikethrough price. Leave blank if the product is not on discount.
              </p>
            </div>
          </div>

          {/* Classification */}
          <div className="bg-white border border-zinc-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-200/60 pb-3">
              Classification
            </h2>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory(''); // Reset subcategory when category changes
                }}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all uppercase tracking-wider font-bold"
                required
              >
                <option value="" disabled>[Select Category]</option>
                {categoriesList.filter(c => !c.parent_id && c.is_active).map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {category && (() => {
              const currentParent = categoriesList.find(c => c.slug === category);
              const subs = currentParent ? categoriesList.filter(c => c.parent_id === currentParent.id && c.is_active) : [];
              if (subs.length === 0) return null;
              return (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Subcategory</label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all uppercase tracking-wider font-bold"
                  >
                    <option value="">[None] — No Subcategory</option>
                    {subs.map((sub) => (
                      <option key={sub.id} value={sub.slug}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block">Gender targeting</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all uppercase tracking-wider font-bold"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visibility Controls */}
          <div className="bg-white border border-zinc-200/80 shadow-sm p-6 md:p-8 space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-200/60 pb-3 mb-2">
              Publishing Options
            </h2>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs uppercase font-bold text-zinc-900">Featured piece</span>
                <p className="text-[10px] text-zinc-500">Show on homepage featured rows</p>
              </div>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-zinc-300 bg-white text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
              <div className="space-y-0.5">
                <span className="text-xs uppercase font-bold text-zinc-900">Is Active</span>
                <p className="text-[10px] text-zinc-500">Make visible to consumers immediately</p>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-zinc-300 bg-white text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-900 font-extrabold uppercase tracking-widest text-xs py-4 px-6 rounded shadow-sm disabled:opacity-50 disabled:bg-zinc-50 disabled:text-zinc-400 disabled:border-zinc-200 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />}
            {isSaving ? 'Saving Piece...' : mode === 'create' ? 'Publish Piece' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Live storefront catalog card preview */}
      <div className="border-t border-zinc-200 pt-8 mt-12 space-y-6">
        <div>
          <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-amber" />
            Live Storefront Grid Preview
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Shows exactly how this garment renders on the live COLLECTIONS store listing grid (refreshes in real-time).
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-sm sm:max-w-none">
          <div className="group flex flex-col product-card border border-zinc-200 bg-white p-4 rounded-md shadow-sm">
            {/* Image Container */}
            <div className="product-card-image bg-zinc-50 relative overflow-hidden aspect-[3/4]">
              {images[0] ? (
                <img
                  src={images[0]}
                  alt={name || 'Preview Piece'}
                  className="w-full h-full object-cover transition-transform duration-700 ease-luxury"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 text-[10px] uppercase font-bold tracking-widest font-mono p-4 text-center">
                  <span>No cover image</span>
                  <span className="text-[8px] text-zinc-500 font-normal lowercase mt-1">(upload / process image above)</span>
                </div>
              )}
              
              <div className="product-card-overlay" aria-hidden="true" />

              {/* Sale/Discount Badge */}
              {comparePrice && Number(comparePrice) > Number(price) && (
                <span className="absolute top-3 left-3 border border-zinc-200 bg-zinc-900/90 text-white text-[9px] tracking-[0.2em] font-semibold py-1 px-2.5 uppercase backdrop-blur-sm z-10">
                  Sale
                </span>
              )}
            </div>

            {/* Product Details */}
            <div className="pt-3 space-y-1">
              <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-semibold">
                {category || '[Category]'}
              </p>
              <h3 className="text-xs font-semibold text-zinc-800 tracking-wide uppercase line-clamp-1 group-hover:text-brand-red transition-colors duration-200 font-body">
                {name || 'Untitled Streetwear Piece'}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 font-body">
                  ₹{Number(price) ? Number(price).toLocaleString('en-IN') : '0'}
                </span>
                {comparePrice && Number(comparePrice) > Number(price) && (
                  <span className="text-[10px] text-zinc-400 line-through font-mono">
                    ₹{Number(comparePrice).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
