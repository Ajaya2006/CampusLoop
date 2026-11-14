"""Database seeding: categories (always) and optional demo data.

Usage (from ``backend/``):

    python -m app.db.seed            # categories + admin account
    python -m app.db.seed --demo     # also add sample students and listings
"""

import argparse
import sys
from decimal import Decimal

from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import utcnow
from app.db.session import SessionLocal
from app.models.catalog import Category, Product, ProductImage
from app.models.enums import ProductCondition, ProductStatus, UserRole, VerificationState
from app.models.user import User

CATEGORIES = [
    {"name": "Laptops & Computers", "slug": "laptops-computers", "icon": "Laptop",
     "description": "Laptops, desktops, monitors and computer accessories",
     "children": [
         {"name": "Laptops", "slug": "laptops"},
         {"name": "Monitors", "slug": "monitors"},
         {"name": "Computer accessories", "slug": "computer-accessories"},
     ]},
    {"name": "Mobiles & Accessories", "slug": "mobiles-accessories", "icon": "Smartphone",
     "description": "Phones, chargers, cases and audio",
     "children": [
         {"name": "Smartphones", "slug": "smartphones"},
         {"name": "Chargers & cables", "slug": "chargers-cables"},
         {"name": "Headphones", "slug": "headphones"},
     ]},
    {"name": "Books & Study Material", "slug": "books-study-material", "icon": "BookOpen",
     "description": "Textbooks, notes, exam guides and stationery",
     "children": [
         {"name": "Engineering", "slug": "engineering-books"},
         {"name": "Competitive exams", "slug": "competitive-exams"},
     ]},
    {"name": "Electronics & Gadgets", "slug": "electronics-gadgets", "icon": "Headphones",
     "description": "Speakers, smartwatches, cameras and gadgets"},
    {"name": "Hostel & Furniture", "slug": "hostel-furniture", "icon": "Armchair",
     "description": "Study tables, chairs, lamps and hostel essentials"},
    {"name": "Clothing & Fashion", "slug": "clothing-fashion", "icon": "Shirt",
     "description": "Clothes, shoes and fashion accessories"},
    {"name": "Sports & Fitness", "slug": "sports-fitness", "icon": "Dumbbell",
     "description": "Sports gear, cycles and fitness equipment"},
    {"name": "Other", "slug": "other", "icon": "Package",
     "description": "Anything else useful for campus life"},
]


def bootstrap_categories(db) -> int:
    existing = db.execute(select(func.count(Category.id))).scalar_one()
    if existing:
        return 0
    for order, data in enumerate(CATEGORIES):
        parent = Category(
            name=data["name"], slug=data["slug"], icon=data["icon"],
            description=data.get("description"), sort_order=order, is_active=True,
        )
        db.add(parent)
        db.flush()
        for child_order, child in enumerate(data.get("children", [])):
            db.add(Category(name=child["name"], slug=child["slug"], parent_id=parent.id,
                            sort_order=child_order, is_active=True))
    db.commit()
    return len(CATEGORIES)


def seed_admin(db) -> User:
    admin = db.execute(select(User).where(User.email == settings.SEED_ADMIN_EMAIL.lower())).scalar_one_or_none()
    if admin:
        return admin
    admin = User(
        full_name="CampusLoop Admin",
        email=settings.SEED_ADMIN_EMAIL.lower(),
        hashed_password=hash_password(settings.SEED_ADMIN_PASSWORD),
        role=UserRole.admin,
        college="CampusLoop",
        student_id_number="ADMIN-0001",
        verification_status=VerificationState.verified,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


DEMO_STUDENTS = [
    {
        "full_name": "Ananya Sharma", "email": "ananya@student.edu", "college": "IIT Delhi",
        "department": "Computer Science", "course": "B.Tech CSE", "year": 3,
        "student_id_number": "2022CS1043", "bio": "Final-year CSE student. Selling gear I no longer use.",
    },
    {
        "full_name": "Rahul Verma", "email": "rahul@student.edu", "college": "NIT Trichy",
        "department": "Mechanical", "course": "B.Tech Mechanical", "year": 2,
        "student_id_number": "2023ME2210", "bio": "Hostel resident, book collector, cycle enthusiast.",
    },
]

DEMO_IMAGES = {
    "Dell Inspiron 15 laptop": "/images/products/dell-inspiron-15-laptop.jpg",
    "Samsung Galaxy S21 FE": "/images/products/samsung-galaxy-s21-fe.jpg",
    "Engineering Mathematics textbook set": "/images/products/engineering-mathematics-textbook-set.jpg",
    "Study table with drawer": "/images/products/study-table-with-drawer.jpg",
    "boAt Rockerz 450 headphones": "/images/products/boat-rockerz-450-headphones.jpg",
    "Badminton racket + shuttle pack": "/images/products/badminton-racket-shuttle-pack.jpg",
    "Casio FX-991EX calculator": "/images/products/casio-fx-991ex-calculator.jpg",
    "Winter jacket (size M)": "/images/products/winter-jacket-size-m.jpg",
    "Dell Inspiron 15": "/images/products/dell-inspiron-15.jpg",
}

DEMO_PRODUCTS = [
    ("Dell Inspiron 15 laptop", "laptops", "Laptops & Computers", 28500, 52000, ProductCondition.good,
     "Dell", 18, "8 GB RAM, 512 GB SSD, i5 11th gen. Comes with charger and a sleeve. Small scratch on the lid."),
    ("Samsung Galaxy S21 FE", "smartphones", "Mobiles & Accessories", 17500, 32000, ProductCondition.like_new,
     "Samsung", 14, "6 GB RAM, 128 GB storage. Screen protector applied since day one. Box and charger included."),
    ("Engineering Mathematics textbook set", "engineering-books", "Books & Study Material", 900, 2400,
     ProductCondition.good, None, 24, "Three volumes covering semester 1-4. Some highlighted pages, no missing pages."),
    ("Study table with drawer", "hostel-furniture", "Hostel & Furniture", 1800, 4500, ProductCondition.fair,
     None, 20, "Solid wooden study table, 3x2 ft. Sturdy, minor scratches on the top surface."),
    ("boAt Rockerz 450 headphones", "headphones", "Mobiles & Accessories", 1100, 2999,
     ProductCondition.good, "boAt", 10, "Battery holds about 12 hours. Ear cushions recently replaced."),
    ("Badminton racket + shuttle pack", "sports-fitness", "Sports & Fitness", 1400, 3200,
     ProductCondition.like_new, "Yonex", 6, "Used for one semester only. Two rackets and a pack of six shuttles."),
    ("Casio FX-991EX calculator", "other", "Other", 950, 1700, ProductCondition.like_new, "Casio", 8,
     "Perfect for engineering exams. All functions working, slide cover included."),
    ("Winter jacket (size M)", "clothing-fashion", "Clothing & Fashion", 700, 2200,
     ProductCondition.good, None, 12, "Worn one winter season. Cleaned and ready to wear. Dark grey."),
]


def seed_demo(db) -> None:
    students = []
    for data in DEMO_STUDENTS:
        existing = db.execute(select(User).where(User.email == data["email"])).scalar_one_or_none()
        if existing:
            students.append(existing)
            continue
        user = User(
            full_name=data["full_name"], email=data["email"], hashed_password=hash_password("Student@123"),
            role=UserRole.student, college=data["college"], student_id_number=data["student_id_number"],
            department=data["department"], course=data["course"], year=data["year"], bio=data["bio"],
            verification_status=VerificationState.verified, is_active=True,
        )
        db.add(user)
        students.append(user)
    db.commit()
    for user in students:
        db.refresh(user)

    for index, (title, slug, cat_name, price, original, condition, brand, age, description) in enumerate(DEMO_PRODUCTS):
        exists = db.execute(select(Product).where(Product.title == title)).scalar_one_or_none()
        if exists:
            if not exists.images and title in DEMO_IMAGES:
                db.add(ProductImage(product_id=exists.id, url=DEMO_IMAGES[title], position=0, created_at=utcnow()))
            continue
        category = db.execute(select(Category).where(Category.slug == slug)).scalar_one_or_none()
        if not category:
            category = db.execute(select(Category).where(Category.name == cat_name)).scalar_one_or_none()
        if not category:
            continue
        seller = students[index % len(students)]
        product = Product(
            seller_id=seller.id, category_id=category.id, title=title, description=description,
            price=Decimal(str(price)), original_price=Decimal(str(original)),
            condition=condition, brand=brand, location=seller.college, age_months=age,
            status=ProductStatus.available, approved_at=utcnow(), views_count=(index * 7) % 40,
        )
        db.add(product)
        db.flush()
        if title in DEMO_IMAGES:
            db.add(ProductImage(product_id=product.id, url=DEMO_IMAGES[title], position=0, created_at=utcnow()))
    db.commit()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Seed the CampusLoop database")
    parser.add_argument("--demo", action="store_true", help="also insert sample students and listings")
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        created = bootstrap_categories(db)
        admin = seed_admin(db)
        print(f"Categories created: {created}")
        print(f"Admin account ready: {admin.email}")
        if args.demo:
            seed_demo(db)
            print("Demo students and listings inserted (password: Student@123).")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
