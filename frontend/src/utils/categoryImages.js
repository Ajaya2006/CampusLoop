const product = (name) => `/images/products/${name}.jpg`;

const LAPTOP = product('dell-inspiron-15-laptop');
const PHONE = product('samsung-galaxy-s21-fe');
const BOOKS = product('engineering-mathematics-textbook-set');
const TABLE = product('study-table-with-drawer');
const HEADPHONES = product('boat-rockerz-450-headphones');
const SPORTS = product('badminton-racket-shuttle-pack');
const CALCULATOR = product('casio-fx-991ex-calculator');
const JACKET = product('winter-jacket-size-m');
const LAPTOP_ALT = product('dell-inspiron-15');

/** Category cover photos, keyed by slug. Subcategories reuse the closest real product shot. */
const BY_SLUG = {
  'laptops-computers': LAPTOP,
  laptops: LAPTOP_ALT,
  monitors: LAPTOP,
  'computer-accessories': LAPTOP,
  'mobiles-accessories': PHONE,
  smartphones: PHONE,
  'chargers-cables': PHONE,
  headphones: HEADPHONES,
  'books-study-material': BOOKS,
  'engineering-books': BOOKS,
  'competitive-exams': BOOKS,
  'electronics-gadgets': HEADPHONES,
  'hostel-furniture': TABLE,
  'clothing-fashion': JACKET,
  'sports-fitness': SPORTS,
  other: CALCULATOR,
};

/** Category names are sent alongside list items, so they can choose a fallback photo too. */
const BY_NAME = {
  'Laptops & Computers': LAPTOP,
  Laptops: LAPTOP_ALT,
  Monitors: LAPTOP,
  'Computer accessories': LAPTOP,
  'Mobiles & Accessories': PHONE,
  Smartphones: PHONE,
  'Chargers & cables': PHONE,
  Headphones: HEADPHONES,
  'Books & Study Material': BOOKS,
  Engineering: BOOKS,
  'Competitive exams': BOOKS,
  'Electronics & Gadgets': HEADPHONES,
  'Hostel & Furniture': TABLE,
  'Clothing & Fashion': JACKET,
  'Sports & Fitness': SPORTS,
  Other: CALCULATOR,
};

export const DEFAULT_CATEGORY_IMAGE = CALCULATOR;

export function categoryImage(slug, name) {
  return BY_SLUG[slug] || BY_NAME[name] || DEFAULT_CATEGORY_IMAGE;
}
