import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Sparkles, Trash2, UploadCloud, Wand2 } from 'lucide-react';
import { categoryService, productService } from '../../services';
import { apiError, mediaUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../common/Button';
import { Checkbox, Input, Select, Textarea } from '../common/Form';
import { InlineAlert, Skeleton } from '../common/Feedback';
import Badge from '../common/Badge';
import { CONDITION_OPTIONS } from '../../constants';
import { inr } from '../../utils/format';

const LocationPicker = lazy(() => import('../location/LocationPicker'));

const empty = {
  title: '',
  description: '',
  category_id: '',
  price: '',
  original_price: '',
  condition: 'good',
  brand: '',
  location: '',
  location_details: '',
  latitude: null,
  longitude: null,
  age_months: '',
  image_urls: [],
  save_as_draft: false,
  submit_for_verification: false,
};

export default function ListingForm({ initial, mode = 'create', onSubmit, busy = false, onDelete }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(() => ({ ...empty, ...(initial || {}) }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [guide, setGuide] = useState(null);
  const [guideBusy, setGuideBusy] = useState(false);

  useEffect(() => {
    categoryService
      .list()
      .then(setCategories)
      .catch(() => setErrors((current) => ({ ...current, category_id: 'Could not load categories. Refresh the page.' })));
  }, []);

  const flatCategories = useMemo(
    () =>
      categories.flatMap((category) => [
        { id: category.id, name: category.name, depth: 0 },
        ...(category.children || []).map((child) => ({ id: child.id, name: child.name, depth: 1 })),
      ]),
    [categories],
  );

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadImages = async (files) => {
    const list = Array.from(files || []).slice(0, 6 - form.image_urls.length);
    if (!list.length) {
      toast.info('Image limit reached', 'You can upload up to 6 images per listing.');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      for (const file of list) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error('Image too large', `${file.name} is over 8 MB.`);
          continue;
        }
        const result = await productService.uploadImage(file, setProgress);
        setForm((current) => ({ ...current, image_urls: [...current.image_urls, result.url] }));
      }
    } catch (err) {
      toast.error('Upload failed', apiError(err, 'Use a PNG, JPG or WebP image under 8 MB.').message);
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = (url) => {
    setForm((current) => ({ ...current, image_urls: current.image_urls.filter((item) => item !== url) }));
  };

  const getGuide = async () => {
    if (!form.category_id) {
      toast.info('Pick a category first', 'The price guide needs a category and condition.');
      return;
    }
    setGuideBusy(true);
    try {
      const data = await productService.priceRecommendation({
        category_id: form.category_id,
        condition: form.condition,
        original_price: form.original_price ? Number(form.original_price) : null,
        asking_price: form.price ? Number(form.price) : null,
        age_months: form.age_months ? Number(form.age_months) : null,
        brand: form.brand || null,
      });
      setGuide(data);
    } catch (err) {
      toast.error('Price guide unavailable', apiError(err).message);
    } finally {
      setGuideBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    setErrors({});
    setMessage('');
    const nextErrors = {};
    if (form.title.trim().length < 3) nextErrors.title = 'Give your listing a clear title (3+ characters).';
    if (form.description.trim().length < 10) nextErrors.description = 'Describe the item in at least 10 characters.';
    if (!form.category_id) nextErrors.category_id = 'Choose a category.';
    if (!form.price || Number(form.price) <= 0) nextErrors.price = 'Enter a valid price.';
    if (form.original_price && Number(form.original_price) <= Number(form.price)) {
      nextErrors.original_price = 'Original price should be higher than your asking price.';
    }
    if (form.image_urls.length === 0) {
      // Images are strongly recommended but not required by the API.
      toast.info('No photos added', 'Listings with photos get far more responses.');
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setMessage('Please fix the highlighted fields.');
      return;
    }
    onSubmit?.({
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: form.category_id,
      price: Number(form.price),
      original_price: form.original_price ? Number(form.original_price) : null,
      condition: form.condition,
      brand: form.brand.trim() || null,
      location: form.location.trim() || null,
      location_details: form.location_details?.trim() || null,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      age_months: form.age_months ? Number(form.age_months) : null,
      image_urls: form.image_urls,
      ...(mode === 'create'
        ? { save_as_draft: form.save_as_draft }
        : { submit_for_verification: form.submit_for_verification }),
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        {message ? <InlineAlert tone="danger">{message}</InlineAlert> : null}

        <section className="surface-card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-ink">Item details</h2>
          <Input
            label="Listing title"
            name="title"
            value={form.title}
            error={errors.title}
            onChange={update('title')}
            placeholder="e.g. Dell Inspiron 15 · 8GB RAM · 512GB SSD"
            maxLength={140}
            required
          />
          <Textarea
            label="Description"
            name="description"
            value={form.description}
            error={errors.description}
            onChange={update('description')}
            rows={6}
            maxLength={5000}
            placeholder="Condition, age, what's included, any faults, and why you're selling."
            hint={`${form.description.length}/5000 characters`}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" name="category_id" value={form.category_id} error={errors.category_id} onChange={update('category_id')} required>
              <option value="">Select a category</option>
              {flatCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.depth ? `— ${category.name}` : category.name}
                </option>
              ))}
            </Select>
            <Select label="Condition" name="condition" value={form.condition} error={errors.condition} onChange={update('condition')}>
              {CONDITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <Input label="Brand (optional)" name="brand" value={form.brand} error={errors.brand} onChange={update('brand')} placeholder="Dell, Apple, Pearson…" />
            <Input
              label="Approximate age (months)"
              name="age_months"
              type="number"
              min="0"
              max="400"
              value={form.age_months}
              error={errors.age_months}
              onChange={update('age_months')}
              placeholder="e.g. 18"
            />
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold text-ink">Photos</h2>
          <p className="mt-0.5 text-xs text-muted">Up to 6 images. The first image becomes your cover photo.</p>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {form.image_urls.map((url, index) => (
              <div key={url} className="group relative overflow-hidden rounded-control border border-line">
                <img src={mediaUrl(url)} alt={`Listing image ${index + 1}`} className="aspect-square w-full object-cover" />
                {index === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-white">Cover</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-surface/90 p-1 text-danger shadow-sm transition hover:bg-danger hover:text-white"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {form.image_urls.length < 6 ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-control border border-dashed border-line bg-canvas text-muted transition hover:border-brand-300 hover:text-brand-600"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                <span className="text-[11px] font-medium">{uploading ? `${progress}%` : 'Add photo'}</span>
              </button>
            ) : null}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(event) => uploadImages(event.target.files)}
          />
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            <UploadCloud size={13} /> PNG, JPG or WebP · max 8 MB each · validated on the server.
          </div>
          {uploading ? (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold text-ink">Transaction</h2>
          <div className="mt-3">
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-control" />}>
              <LocationPicker
                value={{
                  label: form.location,
                  details: form.location_details,
                  latitude: form.latitude,
                  longitude: form.longitude,
                }}
                error={errors.location}
                onChange={(place) =>
                  setForm((current) => ({
                    ...current,
                    location: place.label ?? '',
                    location_details: place.details ?? '',
                    latitude: place.latitude ?? null,
                    longitude: place.longitude ?? null,
                  }))
                }
              />
            </Suspense>
          </div>
          <p className="mt-3 rounded-control bg-canvas p-3 text-[12px] text-muted">
            CampusLoop does not process payments. Buyers inspect the item in person and pay you directly.
          </p>
        </section>
      </div>

      <div className="space-y-5">
        <section className="surface-card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-ink">Pricing</h2>
          <Input
            label="Your asking price (₹)"
            name="price"
            type="number"
            min="1"
            value={form.price}
            error={errors.price}
            onChange={update('price')}
            placeholder="0"
            required
          />
          <Input
            label="Original price (optional)"
            name="original_price"
            type="number"
            min="1"
            value={form.original_price}
            error={errors.original_price}
            onChange={update('original_price')}
            placeholder="What did it cost new?"
          />
          <Button type="button" variant="outline" block icon={Wand2} loading={guideBusy} onClick={getGuide}>
            Get a fair price estimate
          </Button>

          {guide ? (
            <div className="rounded-control border border-brand-200 bg-brand-50 p-3.5 dark:border-brand-800 dark:bg-brand-900/30">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 text-xs font-semibold text-brand-800 dark:text-brand-200">
                  <Sparkles size={12} /> Suggested price
                </p>
                <Badge tone="brand" size="xs">{guide.method}</Badge>
              </div>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{inr(guide.suggested_price)}</p>
              <p className="text-xs text-brand-800 dark:text-brand-200">
                Range {inr(guide.min_price)} – {inr(guide.max_price)} · confidence {guide.confidence}
              </p>
              <ul className="mt-2 space-y-0.5 text-[11.5px] text-brand-900/80 dark:text-brand-200/80">
                {guide.factors.map((factor) => (
                  <li key={factor}>· {factor}</li>
                ))}
              </ul>
              <p className="mt-2 text-[10.5px] text-brand-900/70 dark:text-brand-200/70">
                Rule-based estimate, not AI. {guide.explanation}
              </p>
              <Button
                type="button"
                size="xs"
                className="mt-2"
                onClick={() => setForm((current) => ({ ...current, price: String(guide.suggested_price) }))}
              >
                Use this price
              </Button>
            </div>
          ) : null}
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold text-ink">Visibility</h2>
          {mode === 'create' ? (
            <Checkbox
              className="mt-3"
              label="Save as draft"
              description="Draft listings are private until you submit them for review."
              checked={form.save_as_draft}
              onChange={update('save_as_draft')}
            />
          ) : (
            <Checkbox
              className="mt-3"
              label="Submit for moderator review"
              description="Use this when a rejected or draft listing is ready to go live again."
              checked={form.submit_for_verification}
              onChange={update('submit_for_verification')}
            />
          )}
          <p className="mt-3 text-[12px] text-muted">
            New and edited listings are reviewed by a moderator before appearing publicly. Approval is usually quick.
          </p>
        </section>

        <div className="space-y-2">
          <Button type="submit" block size="lg" loading={busy}>
            {mode === 'create' ? (form.save_as_draft ? 'Save draft' : 'Submit listing') : 'Save changes'}
          </Button>
          {onDelete ? (
            <Button type="button" variant="ghost" block className="text-danger" onClick={onDelete}>
              <Trash2 size={15} /> Delete listing
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
