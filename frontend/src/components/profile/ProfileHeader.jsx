import { Link } from 'react-router-dom';
import { CalendarDays, GraduationCap, Pencil, Star } from 'lucide-react';
import Avatar from '../common/Avatar';
import Badge, { VerifiedBadge } from '../common/Badge';
import { buttonStyles } from '../common/Button';
import { formatDate } from '../../utils/format';

export default function ProfileHeader({ profile, isSelf = false, actions }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="h-24 bg-gradient-to-r from-navy via-navy to-brand-500" />
      <div className="px-5 pb-5 sm:px-6">
        <div className="-mt-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3">
            <Avatar name={profile.full_name} src={profile.avatar_url} size="xl" className="ring-4 ring-surface" />
            <div className="pb-1">
              <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">{profile.full_name}</h1>
              <p className="text-sm text-muted">
                {profile.course ? `${profile.course} · ` : ''}
                {profile.department || profile.college}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            {actions}
            {isSelf ? (
              <Link to="/profile/edit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                <Pencil size={14} /> Edit profile
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <VerifiedBadge status={profile.verification_status} />
          <Badge tone="neutral">
            <GraduationCap size={11} /> {profile.college}
          </Badge>
          {profile.year ? (
            <Badge tone="neutral">
              Year {profile.year}
              {profile.course ? ` · ${profile.course}` : ''}
            </Badge>
          ) : null}
          <Badge tone="neutral">
            <CalendarDays size={11} /> Joined {formatDate(profile.created_at)}
          </Badge>
        </div>

        {profile.bio ? <p className="mt-3 max-w-2xl text-sm text-muted">{profile.bio}</p> : null}

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
          {[
            { label: 'Rating', value: profile.rating_average ? `${Number(profile.rating_average).toFixed(1)} / 5` : 'No reviews', icon: Star },
            { label: 'Reviews', value: profile.review_count ?? 0, icon: Star },
            { label: 'Deals completed', value: profile.completed_transactions ?? 0, icon: GraduationCap },
            { label: 'Active listings', value: profile.active_listings ?? 0, icon: CalendarDays },
          ].map((stat) => (
            <div key={stat.label} className="rounded-control bg-canvas p-3">
              <p className="text-[11px] text-muted">{stat.label}</p>
              <p className="mt-0.5 font-display text-lg font-bold text-ink">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
