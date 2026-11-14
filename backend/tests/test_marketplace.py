"""Marketplace, moderation, wishlist and pricing tests."""

import pytest

from tests.conftest import auth_headers, create_product, create_user


def approve(client, admin, product_id):
    response = client.post(
        f"/api/v1/admin/listings/{product_id}/moderate",
        json={"action": "approve"},
        headers=auth_headers(admin),
    )
    assert response.status_code == 200, response.text


def test_listing_requires_verification_and_moderation(client, db, admin, student, category):
    created = create_product(client, student, category)
    assert created.status_code == 201, created.text
    product = created.json()
    assert product["status"] == "pending_verification"

    public_list = client.get("/api/v1/products").json()
    assert all(item["id"] != product["id"] for item in public_list["items"])

    owner_view = client.get(f"/api/v1/products/{product['id']}", headers=auth_headers(student))
    assert owner_view.status_code == 200
    assert owner_view.json()["is_owner"] is True

    approve(client, admin, product["id"])
    public_list = client.get("/api/v1/products").json()
    assert any(item["id"] == product["id"] for item in public_list["items"])

    anonymous = client.get(f"/api/v1/products/{product['id']}")
    assert anonymous.status_code == 200
    assert anonymous.json()["status"] == "available"


def test_unverified_student_cannot_list(client, db, category):
    from tests.conftest import create_user as make

    unverified = make(db, verified=False)
    response = create_product(client, unverified, category)
    assert response.status_code == 403


def test_other_student_cannot_edit_or_delete(client, db, admin, student, other_student, category):
    created = create_product(client, student, category).json()
    response = client.patch(
        f"/api/v1/products/{created['id']}",
        json={"price": 1000},
        headers=auth_headers(other_student),
    )
    assert response.status_code == 403
    delete = client.delete(f"/api/v1/products/{created['id']}", headers=auth_headers(other_student))
    assert delete.status_code == 403


def test_invalid_category_and_price_rejected(client, db, student, category):
    bad_category = create_product(client, student, category, category_id="not-a-real-category")
    assert bad_category.status_code == 422
    negative = create_product(client, student, category, price=-5)
    assert negative.status_code == 422


def test_listing_location_coordinates_roundtrip(client, db, admin, student, category):
    created = create_product(
        client,
        student,
        category,
        location="Nalanda Institute of Technology, Bhubaneswar",
        location_details="Chandaka Industrial Estate, Bhubaneswar, Odisha, 751024, India",
        latitude=20.2961,
        longitude=85.8245,
    )
    assert created.status_code == 201, created.text
    product_id = created.json()["id"]

    detail = client.get(f"/api/v1/products/{product_id}", headers=auth_headers(student)).json()
    assert detail["latitude"] == pytest.approx(20.2961)
    assert detail["longitude"] == pytest.approx(85.8245)
    assert detail["location_details"].startswith("Chandaka Industrial Estate")

    cleared = client.patch(
        f"/api/v1/products/{product_id}",
        json={"latitude": None, "longitude": None, "location": None, "location_details": None},
        headers=auth_headers(student),
    )
    assert cleared.status_code == 200, cleared.text
    cleared_detail = client.get(f"/api/v1/products/{product_id}", headers=auth_headers(student)).json()
    assert cleared_detail["latitude"] is None
    assert cleared_detail["longitude"] is None

    partial = create_product(client, student, category, latitude=20.0)
    assert partial.status_code == 422


def test_search_filters_and_pagination(client, db, admin, student, category):
    for index in range(3):
        created = create_product(
            client, student, category,
            title=f"Filterable laptop {index}",
            price=10000 + index * 5000,
            condition="like_new" if index == 0 else "good",
        ).json()
        approve(client, admin, created["id"])

    by_query = client.get("/api/v1/products", params={"q": "Filterable laptop"}).json()
    assert by_query["total"] >= 3

    by_category = client.get("/api/v1/products", params={"category": "laptops"}).json()
    assert all(item["category_id"] == category.id for item in by_category["items"])

    priced = client.get("/api/v1/products", params={"min_price": 12000, "max_price": 16000}).json()
    assert all(12000 <= item["price"] <= 16000 for item in priced["items"])

    conditioned = client.get("/api/v1/products", params={"condition": ["like_new"]}).json()
    assert all(item["condition"] == "like_new" for item in conditioned["items"])

    paged = client.get("/api/v1/products", params={"page": 1, "page_size": 2}).json()
    assert len(paged["items"]) <= 2
    assert paged["page_size"] == 2
    assert "pages" in paged

    sorted_asc = client.get("/api/v1/products", params={"sort": "price_asc", "page_size": 20}).json()
    prices = [item["price"] for item in sorted_asc["items"]]
    assert prices == sorted(prices)

    filters = client.get("/api/v1/products/filters").json()
    assert filters["categories"]
    assert any(option["value"] == "good" for option in filters["conditions"])


def test_wishlist_roundtrip(client, db, admin, student, category):
    product = create_product(client, student, category).json()
    approve(client, admin, product["id"])
    buyer = create_user(db)
    headers = auth_headers(buyer)

    assert client.post(f"/api/v1/wishlist/{product['id']}", headers=headers).status_code == 200
    saved = client.get("/api/v1/wishlist", headers=headers).json()
    assert any(item["product"]["id"] == product["id"] for item in saved["items"])

    detail = client.get(f"/api/v1/products/{product['id']}", headers=headers).json()
    assert detail["is_wishlisted"] is True

    client.delete(f"/api/v1/wishlist/{product['id']}", headers=headers)
    assert client.get("/api/v1/wishlist", headers=headers).json()["total"] == 0


def test_price_recommendation_is_rule_based(client, db, student, category):
    response = client.post(
        "/api/v1/products/price-recommendation",
        json={"category_id": category.id, "condition": "good", "original_price": 50000,
              "age_months": 18, "brand": "Dell", "asking_price": 26000},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "rule_based_v1"
    assert body["min_price"] <= body["suggested_price"] <= body["max_price"]
    assert body["factors"]
    assert "ai" not in body["explanation"].lower()


def test_ai_features_are_reported_as_disabled(client):
    features = client.get("/api/v1/ai/features").json()
    assert len(features) == 8
    assert all(feature["status"] in {"disabled", "enabled but no model provider configured"} for feature in features)
    pricing = client.get("/api/v1/ai/pricing-method").json()
    assert pricing["is_ai"] is False


def test_seller_can_mark_sold(client, db, admin, student, category):
    product = create_product(client, student, category).json()
    approve(client, admin, product["id"])
    response = client.post(f"/api/v1/products/{product['id']}/sold", headers=auth_headers(student))
    assert response.status_code == 200
    assert response.json()["status"] == "sold"
    listing = client.get("/api/v1/products").json()
    assert all(item["id"] != product["id"] for item in listing["items"])
    again = client.post(f"/api/v1/products/{product['id']}/sold", headers=auth_headers(student))
    assert again.status_code == 409


def test_my_listings_filters(client, db, admin, student, category):
    product = create_product(client, student, category).json()
    pending = client.get("/api/v1/products/mine", params={"status": "pending"}, headers=auth_headers(student)).json()
    assert any(item["id"] == product["id"] for item in pending["items"])
    approve(client, admin, product["id"])
    active = client.get("/api/v1/products/mine", params={"status": "active"}, headers=auth_headers(student)).json()
    assert any(item["id"] == product["id"] for item in active["items"])
    sold = client.get("/api/v1/products/mine", params={"status": "sold"}, headers=auth_headers(student)).json()
    assert all(item["id"] != product["id"] for item in sold["items"])
