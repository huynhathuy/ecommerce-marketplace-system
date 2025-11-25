# UploadImages — wiring guide

This document explains how to wire the `UploadImages` UI component (client-side) to your backend upload endpoint, what the backend endpoint should expect and return, and recommended error handling and testing steps.

Where this component lives
- `src/components/UploadImages.jsx` — UI-only React component that handles file selection, drag/drop, previews and basic client-side validation. It does NOT perform any network requests.

High-level flow
1. `UploadImages` emits selected `File[]` objects via the `onFilesChange(files)` callback.
2. The parent component (for example `AddProductPage.jsx`) keeps the selected files in state and decides when to upload them (typically after the product is created or updated successfully).
3. The parent calls a network service (e.g. `sellerProductService.uploadSellerProductImages(barCode, files)`) to POST the files to the server.

Expected backend route and behavior
- Route (example): `POST /api/seller/products/:barCode/images`
- Authentication: protected — expects the same auth used by other seller endpoints (cookie with JWT or Authorization header). Frontend uses `credentials: 'include'`.
- Form field name: `images` (the UI/service appends each File with `form.append('images', file)`).
- Multiple files: allowed — the backend should accept an array (multer with `array('images')` or equivalent).
- Response on success: JSON containing the saved image records or their public URLs, for example:
  - `{ images: ['/uploads/BC123/1.jpg', '/uploads/BC123/2.jpg'] }` or `[{ imageUrl: '/uploads/...' }, ...]`
- Error responses: return non-2xx status with a JSON `{ message: '...' }`.

Frontend: example wiring

1) Import and state in parent (already done in `AddProductPage.jsx`):

```jsx
import UploadImages from '../../components/UploadImages';
import sellerProductService from '../../services/sellerProductService';

const [selectedFiles, setSelectedFiles] = useState([]);
// initialImages: any existing public URLs returned by GET product

<UploadImages
  initialImages={initial?.images || []}
  onFilesChange={(files) => setSelectedFiles(files)}
  maxFiles={10}
  maxSizeMB={10}
  disabled={viewOnly}
/>
```

2) Upload after product create/update

```js
// Example inside handleSave after product creation / update succeeded
if (selectedFiles && selectedFiles.length) {
  try {
    await sellerProductService.uploadSellerProductImages(barCode, selectedFiles);
    // Optionally re-fetch product to get saved image URLs
  } catch (err) {
    // Show a user-friendly warning and log details for debugging
    console.warn('Image upload failed', err);
    // Consider showing non-blocking toast/warning to the user
  }
}
```

Server-side notes and gotchas
- Field length: the project's DB historically used `IMAGES.IMAGE_URL VARCHAR(100)` which is too short for some generated paths. If you see SQL truncation errors, enlarge the column (e.g. `VARCHAR(1000)` or `NVARCHAR(MAX)`).
- Naming/paths: the backend commonly stores a public path like `/uploads/<barCode>/<filename>`. Make sure the constructed string fits the DB column.
- Atomicity: prefer inserting image DB rows in the same transaction that stores metadata about the product images, and clean up files on disk if DB insert fails.
- Validation: check file MIME type and size on server-side as a second defense.
- Clean filenames: to avoid very long paths, the backend can rename files to a fixed-length key (e.g. timestamp + short hash) before saving.

Response shape and client expectations
- The client-side helper (`sellerProductService.uploadSellerProductImages`) expects the server to return JSON. `sellerProductService` will call `res.json()` and throw on non-OK responses.
- The parent should re-fetch the product (or accept the response) to update `initialImages` so `UploadImages` shows persisted images.

Error handling and UX
- Do not block the main product save if image upload fails (unless you explicitly want to). Surface a clear, non-blocking warning and let the user retry.
- Provide progress indicators and retries if you want robust uploads for large files. `UploadImages` does not implement progress — you can add a dedicated uploader component or hook to handle chunked uploads/progress.

Testing tips
- Test with long filenames to reproduce truncation issues.
- Confirm `IMAGES.IMAGE_URL` column length with a DB query:

```sql
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'IMAGES' AND COLUMN_NAME = 'IMAGE_URL';
```

- Test with multiple files and mixed types (non-image) to ensure server validation rejects invalid files.

Recommended quick fixes for truncation
- Short-term: backend can rename files to short keys before storing and insert shorter public paths.
- Long-term: run a DB migration to increase `IMAGE_URL` length and optionally move storage to object storage (S3/GCS) and store keys/URLs.

Advanced: progress & background uploads
- If you want to upload while the user composes the product (background upload), implement a dedicated uploader that accepts files and returns temporary URLs or IDs. Save those IDs with the product when the user finishes.

Summary
- Use `UploadImages` for UI only; let the parent call `sellerProductService.uploadSellerProductImages(barCode, files)` after the product is created/updated.
- Ensure the backend route matches the expected path/field names and returns JSON with the saved image URLs.
- Watch out for DB column length and long filenames — increase column size or normalize filenames server-side.

If you want, I can:
- Add a small `Uploader` helper that performs the upload with progress and retries,
- Or re-enable automatic upload on `AddProductPage` (call upload after successful save) and show a progress indicator.
