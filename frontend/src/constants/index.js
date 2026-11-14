export const CONDITION_OPTIONS = [
  { value: 'new', label: 'New', hint: 'Unused, in original packaging' },
  { value: 'like_new', label: 'Like New', hint: 'Barely used, no visible wear' },
  { value: 'good', label: 'Good', hint: 'Light wear, fully working' },
  { value: 'fair', label: 'Fair', hint: 'Visible wear but functional' },
  { value: 'used', label: 'Used', hint: 'Well used, may have faults' },
];

export const CONDITION_LABEL = Object.fromEntries(CONDITION_OPTIONS.map((c) => [c.value, c.label]));

export const PRODUCT_STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_verification: { label: 'Pending review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  available: { label: 'Live', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  reserved: { label: 'Reserved', tone: 'warning' },
  sold: { label: 'Sold', tone: 'neutral' },
  removed: { label: 'Removed', tone: 'danger' },
};

export const OFFER_STATUS = {
  pending: { label: 'Pending', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  rejected: { label: 'Declined', tone: 'danger' },
  countered: { label: 'Countered', tone: 'neutral' },
  cancelled: { label: 'Withdrawn', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
};

export const MEETING_STATUS = {
  proposed: { label: 'Proposed', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  rescheduled: { label: 'Rescheduled', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  completed: { label: 'Completed', tone: 'success' },
};

export const TRANSACTION_STATUS = {
  pending: { label: 'Awaiting meeting', tone: 'warning' },
  meeting_scheduled: { label: 'Meeting scheduled', tone: 'info' },
  completion_requested: { label: 'Awaiting confirmation', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

export const VERIFICATION_STATUS = {
  unsubmitted: { label: 'Not verified', tone: 'neutral' },
  pending: { label: 'Under review', tone: 'warning' },
  verified: { label: 'Verified student', tone: 'success' },
  rejected: { label: 'Verification rejected', tone: 'danger' },
};

export const REPORT_STATUS = {
  pending: { label: 'Pending', tone: 'warning' },
  under_review: { label: 'Under review', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
  rejected: { label: 'Dismissed', tone: 'neutral' },
};

export const REPORT_REASONS = [
  { value: 'fake_product', label: 'Fake or counterfeit product' },
  { value: 'incorrect_description', label: 'Incorrect description' },
  { value: 'fraud', label: 'Fraud or scam attempt' },
  { value: 'suspicious_user', label: 'Suspicious user' },
  { value: 'inappropriate', label: 'Inappropriate listing' },
  { value: 'misleading_price', label: 'Misleading price' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other violation' },
];

export const SORT_OPTIONS = [
  { value: 'latest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'oldest', label: 'Oldest first' },
];

export const NAV_LINKS = [
  { to: '/', label: 'Home', icon: 'Home', end: true },
  { to: '/marketplace', label: 'Marketplace', icon: 'Store' },
  { to: '/categories', label: 'Categories', icon: 'LayoutGrid' },
];

export const WORKSPACE_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/my-listings', label: 'My Listings', icon: 'Tag' },
  { to: '/messages', label: 'Messages', icon: 'MessageCircle' },
  { to: '/offers', label: 'Offers', icon: 'HandCoins' },
  { to: '/meetings', label: 'Meetings', icon: 'CalendarClock' },
  { to: '/transactions', label: 'Transactions', icon: 'ReceiptText' },
  { to: '/wishlist', label: 'Wishlist', icon: 'Heart' },
];

export const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
  { to: '/admin/verifications', label: 'Student verification', icon: 'ShieldCheck' },
  { to: '/admin/listings', label: 'Listings', icon: 'Tag' },
  { to: '/admin/listing-health', label: 'Listing health', icon: 'PackageSearch' },
  { to: '/admin/reports', label: 'Reports', icon: 'Flag' },
  { to: '/admin/users', label: 'Users', icon: 'Users' },
  { to: '/admin/transactions', label: 'Transactions', icon: 'ReceiptText' },
  { to: '/admin/analytics', label: 'Activity', icon: 'BarChart3' },
];

export const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: 'Home', end: true },
  { to: '/marketplace', label: 'Explore', icon: 'Search' },
  { to: '/sell', label: 'Sell', icon: 'Plus', primary: true },
  { to: '/messages', label: 'Chat', icon: 'MessageCircle' },
  { to: '/dashboard', label: 'Profile', icon: 'User' },
];
