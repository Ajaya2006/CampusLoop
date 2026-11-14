import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { productService } from '../services';
import { apiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import ListingForm from '../components/products/ListingForm';
import { InlineAlert } from '../components/common/Feedback';

export default function SellItem() {
  useDocumentTitle('Sell an item');
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (payload) => {
    setBusy(true);
    setError('');
    try {
      const product = await productService.create(payload);
      toast.success(
        payload.save_as_draft ? 'Draft saved' : 'Listing submitted',
        payload.save_as_draft
          ? 'You can submit it for review from My Listings whenever you are ready.'
          : 'A moderator will review it before it appears on the marketplace.',
      );
      navigate(payload.save_as_draft ? '/my-listings?status=draft' : `/product/${product.id}`);
    } catch (err) {
      const parsed = apiError(err, 'Could not create the listing.');
      setError(parsed.message);
      toast.error('Listing not created', parsed.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Sell an item"
        description="Tell students what you are selling, add a few photos and set a fair price. Listings go live after moderator review."
        breadcrumb={[{ label: 'My listings', to: '/my-listings' }, { label: 'New listing' }]}
      />
      <InlineAlert tone="info" className="mb-5">
        <p className="flex items-start gap-2">
          <Info size={15} className="mt-0.5 shrink-0" />
          Be accurate about faults and meet in a public campus location. Prohibited items and misleading listings are removed.
        </p>
      </InlineAlert>
      {error ? <InlineAlert tone="danger" className="mb-5">{error}</InlineAlert> : null}
      <ListingForm mode="create" onSubmit={submit} busy={busy} />
    </div>
  );
}
