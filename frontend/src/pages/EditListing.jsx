import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productService } from '../services';
import { apiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import ListingForm from '../components/products/ListingForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { ErrorState, InlineAlert, LoadingPage } from '../components/common/Feedback';

export default function EditListing() {
  useDocumentTitle('Edit listing');
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    productService
      .get(id)
      .then((data) => {
        if (!active) return;
        if (!data.is_owner) {
          setError('You can only edit your own listings.');
          return;
        }
        setProduct(data);
      })
      .catch((err) => active && setError(apiError(err, 'Could not load this listing.').message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const submit = async (payload) => {
    setBusy(true);
    setError('');
    try {
      await productService.update(id, payload);
      toast.success('Listing updated', 'Changes are visible immediately unless moderation is required.');
      navigate('/my-listings');
    } catch (err) {
      const parsed = apiError(err, 'Could not update the listing.');
      setError(parsed.message);
      toast.error('Update failed', parsed.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await productService.remove(id);
      toast.success('Listing removed');
      navigate('/my-listings');
    } catch (err) {
      toast.error('Could not remove listing', apiError(err).message);
    }
  };

  if (loading) return <LoadingPage label="Loading listing…" />;
  if (error && !product) return <ErrorState message={error} onRetry={() => navigate('/my-listings')} />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Edit listing"
        description={`Update “${product.title}”. Significant edits may require another moderation pass.`}
        breadcrumb={[{ label: 'My listings', to: '/my-listings' }, { label: 'Edit' }]}
      />
      {error ? <InlineAlert tone="danger" className="mb-5">{error}</InlineAlert> : null}
      {product.rejection_reason ? (
        <InlineAlert tone="danger" title="Rejected by a moderator" className="mb-5">
          {product.rejection_reason} — fix the issue and submit for review again.
        </InlineAlert>
      ) : null}
      <ListingForm
        mode="edit"
        initial={{
          title: product.title,
          description: product.description,
          category_id: product.category?.id || '',
          price: String(product.price),
          original_price: product.original_price ? String(product.original_price) : '',
          condition: product.condition,
          brand: product.brand || '',
          location: product.location || '',
          location_details: product.location_details || '',
          latitude: product.latitude ?? null,
          longitude: product.longitude ?? null,
          age_months: product.age_months != null ? String(product.age_months) : '',
          image_urls: (product.images || []).map((image) => image.url),
        }}
        onSubmit={submit}
        busy={busy}
        onDelete={() => setConfirmDelete(true)}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete this listing?"
        description="The listing will be removed from the marketplace. Existing conversations remain."
        confirmLabel="Delete listing"
        destructive
      />
    </div>
  );
}
