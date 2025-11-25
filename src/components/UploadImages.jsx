import React, { useState, useEffect, useRef } from 'react';

// UploadImages
// - UI-only component for selecting multiple image files, showing previews,
//   validating count and size, and exposing selected File objects via `onFilesChange`.
// Props:
// - initialImages: array of existing image URLs to show as previews (read-only)
// - disabled: boolean to disable inputs
// - maxFiles: number (default 10)
// - maxSizeMB: number (default 10)
// - onFilesChange(files: File[]) callback when selected files change
const UploadImages = ({ initialImages = [], disabled = false, maxFiles = 10, maxSizeMB = 10, onFilesChange = () => {} }) => {
  const [files, setFiles] = useState([]); // File objects selected in this session
  const [previews, setPreviews] = useState([]); // preview URLs (both selected files and initialImages)
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  // Initialize previews from initialImages when component mounts or initialImages change
  useEffect(() => {
    setPreviews(prev => {
      // Preserve any generated previews for newly selected files but replace initial image block
      const selectedPreviews = prev.filter(p => p._isLocal);
      const initialPreviews = Array.isArray(initialImages) ? initialImages.map(url => ({ src: url, _isLocal: false })) : [];
      return [...selectedPreviews, ...initialPreviews];
    });
  }, [initialImages]);

  // Create preview URLs for locally selected files
  useEffect(() => {
    // revoke old previews first
    return () => {
      previews.forEach(p => { if (p._isLocal && p.src) URL.revokeObjectURL(p.src); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Build combined previews array: local file previews first, then initial images
    const local = files.map(f => ({ src: URL.createObjectURL(f), name: f.name, _isLocal: true }));
    const initial = initialImages.map(url => ({ src: url, _isLocal: false }));
    // Revoke previously generated object URLs to avoid leaks
    setPreviews(prev => {
      prev.forEach(p => { if (p._isLocal && p.src) URL.revokeObjectURL(p.src); });
      return [...local, ...initial];
    });
    // Inform parent of file list change
    onFilesChange(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, initialImages]);

  const validateAndSetFiles = (incomingFiles) => {
    const arr = Array.from(incomingFiles || []);
    const errs = [];
    if (arr.length + /* existing initial images */ 0 > maxFiles) {
      errs.push(`Maximum ${maxFiles} files allowed`);
    }
    arr.forEach(f => {
      if (!f.type.startsWith('image/')) errs.push(`${f.name} is not an image`);
      if (f.size > maxSizeMB * 1024 * 1024) errs.push(`${f.name} exceeds ${maxSizeMB}MB`);
    });
    setErrors(errs);
    if (errs.length === 0) setFiles(arr);
  };

  const handleInputChange = (e) => {
    if (!e.target.files) return;
    validateAndSetFiles(e.target.files);
  };

  // Drag & drop handlers (simple)
  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    const dt = e.dataTransfer;
    validateAndSetFiles(dt.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); };

  const removeLocalFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
      <div onDrop={handleDrop} onDragOver={handleDragOver} className={`border-2 border-dashed rounded-md p-4 ${disabled ? 'opacity-50' : ''}`}>
        <div className="mb-2">
          <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleInputChange} disabled={disabled} />
          <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF. Max {maxFiles} files, {maxSizeMB}MB each.</p>
        </div>
        {errors.length > 0 && (
          <div className="mb-2 text-sm text-red-600">
            {errors.map((err, i) => <div key={i}>{err}</div>)}
          </div>
        )}

        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mt-2">
            {previews.map((p, i) => (
              <div key={i} className="relative w-full h-24 overflow-hidden rounded-md border">
                <img src={p.src} alt={`preview-${i}`} className="w-full h-full object-cover" />
                {p._isLocal && (
                  <button onClick={() => removeLocalFile(i)} type="button" className="absolute top-1 right-1 bg-white rounded-full p-1 text-xs">Remove</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadImages;
