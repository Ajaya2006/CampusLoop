import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Building2, Eye, EyeOff, GraduationCap, Hash, Lock, Mail, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Button from '../components/common/Button';
import AuthField, { AuthSelect } from '../components/auth/AuthField';
import { Checkbox } from '../components/common/Form';
import { InlineAlert } from '../components/common/Feedback';

const emptyForm = {
  full_name: '',
  email: '',
  college: '',
  student_id_number: '',
  department: '',
  course: '',
  year: '',
  password: '',
  confirm_password: '',
};

export default function Register() {
  useDocumentTitle('Create account');
  const { register, isAuthenticated, booting } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const strength = useMemo(() => {
    const value = form.password;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }, [form.password]);

  if (!booting && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setErrors({});
    if (!accepted) {
      setMessage('Please accept the marketplace rules to continue.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setErrors({ confirm_password: 'Passwords do not match' });
      return;
    }
    setBusy(true);
    try {
      await register({
        ...form,
        email: form.email.trim(),
        year: form.year ? Number(form.year) : null,
        department: form.department || null,
        course: form.course || null,
      });
      toast.success('Account created', 'Next, verify your student status to start trading.');
      navigate('/verify', { replace: true });
    } catch (err) {
      const parsed = apiError(err, 'Registration failed. Please check the form.');
      setErrors(parsed.fields);
      setMessage(parsed.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-[25px] font-extrabold leading-tight tracking-tight text-ink">
        Create your student account
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Sign up, then verify your student ID so a moderator can unlock buying and selling.
      </p>

      {message ? (
        <InlineAlert tone="danger" className="mt-4">
          {message}
        </InlineAlert>
      ) : null}

      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <AuthField
            label="Full name"
            name="full_name"
            icon={User}
            value={form.full_name}
            error={errors.full_name}
            onChange={update('full_name')}
            placeholder="Ananya Sharma"
            autoComplete="name"
            required
          />
          <AuthField
            label="Student email"
            name="email"
            type="email"
            icon={Mail}
            value={form.email}
            error={errors.email}
            onChange={update('email')}
            placeholder="you@college.edu"
            autoComplete="email"
            required
          />
        </div>

        <AuthField
          label="College / university"
          name="college"
          icon={GraduationCap}
          value={form.college}
          error={errors.college}
          onChange={update('college')}
          placeholder="National Institute of Technology"
          required
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <AuthField
            label="Student ID number"
            name="student_id_number"
            icon={Hash}
            value={form.student_id_number}
            error={errors.student_id_number}
            onChange={update('student_id_number')}
            placeholder="21CS1042"
            required
          />
          <AuthSelect label="Year of study" name="year" value={form.year} error={errors.year} onChange={update('year')}>
            <option value="">Select year</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((year) => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </AuthSelect>
          <AuthField
            label="Department"
            name="department"
            icon={Building2}
            value={form.department}
            error={errors.department}
            onChange={update('department')}
            placeholder="Computer Science"
          />
          <AuthField
            label="Course"
            name="course"
            icon={BookOpen}
            value={form.course}
            error={errors.course}
            onChange={update('course')}
            placeholder="B.Tech"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <AuthField
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              value={form.password}
              error={errors.password}
              onChange={update('password')}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="auth-action"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              required
            />
            {form.password ? (
              <div className="mt-2 flex gap-1" aria-hidden>
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-colors ${strength >= step ? 'bg-success' : 'bg-elevated'}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <AuthField
            label="Confirm password"
            name="confirm_password"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            value={form.confirm_password}
            error={errors.confirm_password}
            onChange={update('confirm_password')}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />
        </div>

        <Checkbox
          label="I accept the CampusLoop marketplace rules"
          description="No prohibited items, no online payments, and only genuine student accounts."
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
        />

        <Button type="submit" block size="lg" loading={busy} icon={UserPlus} className="auth-submit">
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-[12.5px] text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
