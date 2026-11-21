const cover = (name) => `/images/categories/${name}.jpg`;

// Shots taken from the CampusLoop Category Product Visual Catalog.
const LAPTOP = cover('laptop');
const PHONE = cover('phone');
const BOOKS = cover('books');
const CLOTHING = cover('clothing');
const AUDIO = cover('audio');
const TABLET = cover('tablet');
const FURNITURE = cover('furniture');
const BACKPACK = cover('backpack');
const BICYCLE = cover('bicycle');

/** Category cover photos, keyed by slug. Subcategories reuse the closest real product shot. */
const BY_SLUG = {
  'laptops-computers': LAPTOP,
  laptops: LAPTOP,
  monitors: LAPTOP,
  'computer-accessories': TABLET,
  'mobiles-accessories': PHONE,
  smartphones: PHONE,
  'chargers-cables': PHONE,
  headphones: AUDIO,
  'books-study-material': BOOKS,
  'engineering-books': BOOKS,
  'competitive-exams': BOOKS,
  'electronics-gadgets': TABLET,
  'hostel-furniture': FURNITURE,
  'clothing-fashion': CLOTHING,
  'sports-fitness': BICYCLE,
  other: BACKPACK,
};

/** Category names are sent alongside list items, so they can choose a fallback photo too. */
const BY_NAME = {
  'Laptops & Computers': LAPTOP,
  Laptops: LAPTOP,
  Monitors: LAPTOP,
  'Computer accessories': TABLET,
  'Mobiles & Accessories': PHONE,
  Smartphones: PHONE,
  'Chargers & cables': PHONE,
  Headphones: AUDIO,
  'Books & Study Material': BOOKS,
  Engineering: BOOKS,
  'Competitive exams': BOOKS,
  'Electronics & Gadgets': TABLET,
  'Hostel & Furniture': FURNITURE,
  'Clothing & Fashion': CLOTHING,
  'Sports & Fitness': BICYCLE,
  Other: BACKPACK,
};

export const DEFAULT_CATEGORY_IMAGE = BACKPACK;

export function categoryImage(slug, name) {
  return BY_SLUG[slug] || BY_NAME[name] || DEFAULT_CATEGORY_IMAGE;
}
