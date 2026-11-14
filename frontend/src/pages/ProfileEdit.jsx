import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Save } from 'lucide-react';
import { authService } from '../services';
import { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import AvatarCropDialog from '../components/profile/AvatarCropDialog';
import { Input, Select, Textarea } from '../components/common/Form';
import { InlineAlert } from '../components/common/Feedback';

export default function ProfileEdit() {
  useDocumentTitle('Edit profile');
  const { user, setUser, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    college: user?.college || '',
    department: user?.department || '',
    course: user?.course || '',
    year: user?.year || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState(null);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const verified = user?.verification_status === 'verified';

  const pickAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Unsupported file', 'Choose a PNG, JPG or WebP photo.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Photo too large', 'Choose a photo under 12 MB, then crop it.');
      return;
    }
    setCropFile(file);
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const updated = await authService.uploadAvatar(file);
      setUser(updated);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error('Upload failed', apiError(err, 'Use a PNG, JPG or WebP under 5 MB.').message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      const updated = await authService.updateProfile({
        ...form,
        year: form.year ? Number(form.year) : null,
        department: form.department || null,
        course: form.course || null,
        phone: form.phone || null,
        bio: form.bio || null,
      });
      setUser(updated);
      await refreshUser();
      toast.success('Profile updated');
      navigate('/profile');
    } catch (err) {
      const parsed = apiError(err, 'Could not save your profile.');
      setErrors(parsed.fields);
      setMessage(parsed.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Edit profile"
        description="Your public profile helps buyers trust you. Private details such as your student ID are never shown."
        breadcrumb={[{ label: 'Profile', to: '/profile' }, { label: 'Edit' }]}
      />

      {message ? <InlineAlert tone="danger" className="mb-4">{message}</InlineAlert> : null}

      <form onSubmit={submit} className="space-y-5">
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold text-ink">Profile photo</h2>
          <div className="mt-3 flex items-center gap-4">
            <Avatar name={user?.full_name} src={user?.avatar_url} size="lg" />
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={pickAvatar}
              />
              <Button type="button" variant="secondary" size="sm" icon={Camera} loading={uploading} onClick={() => fileRef.current?.click()}>
                Change photo
              </Button>
              <p className="mt-1.5 text-xs text-muted">Crop and zoom before saving · PNG, JPG or WebP.</p>
            </div>
          </div>
        </section>

        <section className="surface-card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-ink">Personal details</h2>
          <Input label="Full name" name="full_name" value={form.full_name} error={errors.full_name} onChange={update('full_name')} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="College / university"
              name="college"
              value={form.college}
              error={errors.college}
              onChange={update('college')}
              disabled={verified}
              hint={verified ? 'Locked for verified accounts. Contact support to change it.' : undefined}
            />
            <Input label="Department" name="department" value={form.department} error={errors.department} onChange={update('department')} placeholder="Computer Science" />
            <Input label="Course" name="course" value={form.course} error={errors.course} onChange={update('course')} placeholder="B.Tech" />
            <Select label="Year of study" name="year" value={form.year} error={errors.year} onChange={update('year')}>
              <option value="">Not specified</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </Select>
          </div>
          <Input
            label="Phone (optional)"
            name="phone"
            value={form.phone}
            error={errors.phone}
            onChange={update('phone')}
            placeholder="Shared only with confirmed transaction partners"
            hint="Never shown publicly on your profile."
          />
          <Textarea
            label="About you (optional)"
            name="bio"
            value={form.bio}
            error={errors.bio}
            onChange={update('bio')}
            rows={3}
            maxLength={1000}
            placeholder="What do you study, what do you usually buy or sell?"
            hint={`${form.bio.length}/1000 characters`}
          />
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" block onClick={() => navigate('/profile')}>Cancel</Button>
          <Button type="submit" loading={busy} icon={Save}>Save changes</Button>
        </div>
      </form>

      <AvatarCropDialog
        open={Boolean(cropFile)}
        file={cropFile}
        onClose={() => setCropFile(null)}
        onConfirm={(file) => {
          setCropFile(null);
          uploadAvatar(file);
        }}
        busy={uploading}
      />
    </div>
  );
}
