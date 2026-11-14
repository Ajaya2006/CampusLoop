import { BadgeCheck, BarChart3, ShieldCheck } from 'lucide-react';
import Logo from '../layout/Logo';

const picks = [
  { image: '/images/products/dell-inspiron-15-laptop.jpg', title: 'Dell Inspiron 15', price: '₹28,500', tag: 'Good' },
  { image: '/images/products/engineering-mathematics-textbook-set.jpg', title: 'Engineering Maths set', price: '₹900', tag: 'Good' },
  { image: '/images/products/boat-rockerz-450-headphones.jpg', title: 'boAt Rockerz 450', price: '₹1,100', tag: 'Good' },
  { image: '/images/products/winter-jacket-size-m.jpg', title: 'Winter jacket', price: '₹700', tag: 'Good' },
];

const bars = [38, 56, 45, 72, 58, 86, 68];

export default function AuthShowcase() {
  return (
    <section className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-canvas px-5 py-9 sm:px-8 lg:px-12 lg:py-14">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-brand-100/70 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-[560px] text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h2 className="mt-7 font-display text-[30px] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-[36px]">
          The campus marketplace
          <br className="hidden sm:block" /> that actually loops back.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-muted sm:text-sm">
          Buy and sell laptops, books, gadgets and hostel essentials with verified students from your own college.
        </p>

        <div className="relative mt-8 text-left">
          <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-[12.5px] font-semibold text-ink">Fresh on campus</p>
                <p className="text-[10px] text-muted">Approved listings from verified students</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4">
              {picks.map((pick) => (
                <article key={pick.title} className="overflow-hidden rounded-[11px] border border-line bg-surface">
                  <img src={pick.image} alt="" className="aspect-[4/3] w-full object-cover" loading="eager" />
                  <div className="p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-semibold text-ink">{pick.title}</p>
                      <span className="shrink-0 rounded-full bg-elevated px-1.5 py-0.5 text-[8.5px] font-medium text-muted">{pick.tag}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] font-bold text-brand-600">{pick.price}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="absolute -bottom-7 -left-3 hidden w-[190px] rounded-[14px] border border-line bg-surface p-3 shadow-lift sm:block lg:-left-10">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-ink">Listing views</p>
              <BarChart3 size={13} className="text-brand-500" />
            </div>
            <div className="mt-2 flex h-12 items-end gap-1.5">
              {bars.map((height, index) => (
                <span
                  key={index}
                  className={index === 5 ? 'flex-1 rounded-t bg-brand-500' : 'flex-1 rounded-t bg-accent/85'}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[9px] text-muted">
              <span>Mon</span><span>Sun</span>
            </div>
          </div>

          <div className="absolute -right-2 -top-5 hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] font-semibold text-ink shadow-sm sm:flex lg:-right-6">
            <BadgeCheck size={13} className="text-brand-500" /> Verified students
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-2.5 sm:mt-14 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, label: 'Student-only access' },
            { icon: BadgeCheck, label: 'Moderated listings' },
            { icon: BarChart3, label: 'Fair price guidance' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-center gap-1.5 rounded-[10px] border border-line bg-surface/70 px-2 py-2 text-[10.5px] font-medium text-muted">
              <item.icon size={12} className="shrink-0 text-brand-500" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
