export const deleteStorageImage = async (imageUrl?: string | string[] | null) => {
  if (!imageUrl) return;
  const rawList = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
  const urls = rawList.filter((u): u is string => typeof u === 'string' && u.trim().length > 0 && (u.includes('genuine_electronics') || u.includes('/storage/v1/object/')));
  if (urls.length === 0) return;

  try {
    await fetch('/api/upload/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
  } catch (e) {
    console.warn('Failed to request deletion of previous image:', e);
  }
};

export const compressImageToBlob = (file: File, maxDim = 1600, quality = 0.85): Promise<{ blob: Blob; format: string }> => {
  return new Promise((resolve, reject) => {
    if (file.size > 20 * 1024 * 1024) {
      return reject(new Error('File size exceeds maximum 20MB limit.'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, format: 'image/webp' });
              } else {
                canvas.toBlob(
                  (fallbackBlob) => {
                    if (fallbackBlob) resolve({ blob: fallbackBlob, format: 'image/jpeg' });
                    else reject(new Error('Canvas image conversion failed'));
                  },
                  'image/jpeg',
                  quality
                );
              }
            },
            'image/webp',
            quality
          );
        } else {
          reject(new Error('Canvas context unavailable'));
        }
      };
      img.onerror = (err) => reject(err);
      img.src = (event.target?.result as string) || '';
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const compressAndResizeImage = (file: File, maxDim = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 20 * 1024 * 1024) {
      return reject(new Error('File size exceeds maximum 20MB limit.'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(img.src);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const processAndUploadImage = async (
  file: File,
  _previousUrl?: string
): Promise<string> => {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Image exceeds 20MB limit. Please choose an image under 20MB.');
  }

  // Compress first
  const { blob } = await compressImageToBlob(file);
  const compressedFile = new File(
    [blob],
    file.name.replace(/\.[^/.]+$/, '.webp'),
    { type: 'image/webp' }
  );

  if (!navigator.onLine) {
    throw new Error('Image upload requires an online connection so the image can be stored in cloud storage.');
  }

  const formData = new FormData();
  formData.append('file', compressedFile);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Upload server returned an invalid response.');
    }

    if (response.ok && typeof data.url === 'string' && data.url.trim()) {
      return data.url;
    }
    throw new Error(data.error || `Image upload failed (${response.status}).`);
  } catch (err: any) {
    console.warn('Cloud image upload failed:', err);
    throw new Error(err?.message || 'Image upload failed. Please check storage configuration and try again.');
  }
};
