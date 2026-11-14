import { RotateCcw } from 'lucide-react';
import { CONDITION_OPTIONS, SORT_OPTIONS } from '../../constants';
import { Checkbox, Input, Select } from '../common/Form';
import Button from '../common/Button';
import { cx } from '../../utils/format';

export default function FilterPanel({ filters, state, onChange, onReset, className = '' }) {
  const toggleCondition = (value) => {
    const next = state.conditions.includes(value)
      ? state.conditions.filter((item) => item !== value)
      : [...state.conditions, value];
    onChange({ conditions: next, page: 1 });
  };

  return (
    <div className={cx('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Filters</h2>
        <Button variant="ghost" size="xs" icon={RotateCcw} onClick={onReset}>
          Reset
        </Button>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Category</h3>
        <select
          value={state.category}
          onChange={(event) => onChange({ category: event.target.value, page: 1 })}
          className="input-base"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {filters?.categories?.map((category) => (
            <optgroup key={category.id} label={category.name}>
              <option value={category.slug}>{category.name} (all)</option>
              {category.children?.map((child) => (
                <option key={child.id} value={child.slug}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Condition</h3>
        <div className="space-y-2">
          {CONDITION_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={state.conditions.includes(option.value)}
              onChange={() => toggleCondition(option.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Price range (₹)</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            placeholder={String(filters?.price_bounds?.min ?? 0)}
            value={state.min_price}
            onChange={(event) => onChange({ min_price: event.target.value, page: 1 })}
            aria-label="Minimum price"
          />
          <span className="text-muted">–</span>
          <Input
            type="number"
            min="0"
            placeholder={String(filters?.price_bounds?.max ?? 100000)}
            value={state.max_price}
            onChange={(event) => onChange({ max_price: event.target.value, page: 1 })}
            aria-label="Maximum price"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">College</h3>
        <Select
          value={state.college}
          onChange={(event) => onChange({ college: event.target.value, page: 1 })}
          aria-label="Filter by college"
        >
          <option value="">All colleges</option>
          {(filters?.colleges || []).map((college) => (
            <option key={college} value={college}>
              {college}
            </option>
          ))}
        </Select>
      </div>

      <Checkbox
        label="Verified sellers only"
        checked={state.verified_only}
        onChange={(event) => onChange({ verified_only: event.target.checked, page: 1 })}
      />

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Sort by</h3>
        <Select
          value={state.sort}
          onChange={(event) => onChange({ sort: event.target.value, page: 1 })}
          aria-label="Sort listings"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
