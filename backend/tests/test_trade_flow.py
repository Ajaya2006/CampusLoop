"""Chat, offer, meeting, transaction, review and report workflow tests."""

from datetime import datetime, timedelta, timezone

from tests.conftest import auth_headers, create_user
from tests.test_marketplace import approve


def setup_listing(client, db, admin, seller, category):
    from tests.conftest import create_product

    product = create_product(client, seller, category).json()
    approve(client, admin, product["id"])
    return product


def start_conversation(client, buyer, product):
    response = client.post(
        "/api/v1/conversations",
        json={"product_id": product["id"], "message": "Hi, is this still available?"},
        headers=auth_headers(buyer),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_chat_requires_participants(client, db, admin, student, category):
    product = setup_listing(client, db, admin, student, category)
    buyer = create_user(db)
    outsider = create_user(db)
    conversation = start_conversation(client, buyer, product)

    outsider_view = client.get(f"/api/v1/conversations/{conversation['id']}", headers=auth_headers(outsider))
    assert outsider_view.status_code == 403

    message = client.post(
        f"/api/v1/conversations/{conversation['id']}/messages",
        json={"body": "Can we meet tomorrow?"},
        headers=auth_headers(buyer),
    )
    assert message.status_code == 200

    seller_view = client.get(f"/api/v1/conversations/{conversation['id']}", headers=auth_headers(student)).json()
    assert any(m["body"] == "Can we meet tomorrow?" for m in seller_view["messages"])
    assert seller_view["unread_count"] >= 1

    own_listing = client.post(
        "/api/v1/conversations",
        json={"product_id": product["id"]},
        headers=auth_headers(student),
    )
    assert own_listing.status_code == 422


def test_offer_counter_and_accept(client, db, admin, student, category):
    product = setup_listing(client, db, admin, student, category)
    buyer = create_user(db)
    conversation = start_conversation(client, buyer, product)

    created = client.post(
        "/api/v1/offers",
        json={"conversation_id": conversation["id"], "amount": 21000, "message": "Would you take 21k?"},
        headers=auth_headers(buyer),
    )
    assert created.status_code == 201, created.text
    offer = created.json()
    assert offer["status"] == "pending"
    assert offer["can_respond"] is False

    self_accept = client.patch(
        f"/api/v1/offers/{offer['id']}", json={"action": "accept"}, headers=auth_headers(buyer)
    )
    assert self_accept.status_code == 403

    counter = client.patch(
        f"/api/v1/offers/{offer['id']}",
        json={"action": "counter", "amount": 23500, "message": "23.5k is my best."},
        headers=auth_headers(student),
    )
    assert counter.status_code == 200
    assert counter.json()["status"] == "pending"

    old_offer = client.get("/api/v1/offers", headers=auth_headers(student)).json()
    countered = next(item for item in old_offer if item["id"] == offer["id"])
    assert countered["status"] == "countered"

    accepted = client.patch(
        f"/api/v1/offers/{counter.json()['id']}", json={"action": "accept"}, headers=auth_headers(buyer)
    )
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "accepted"

    pending_again = client.post(
        "/api/v1/offers",
        json={"conversation_id": conversation["id"], "amount": 19000},
        headers=auth_headers(buyer),
    )
    assert pending_again.status_code in (201, 409)


def test_full_purchase_flow_and_review(client, db, admin, student, category):
    product = setup_listing(client, db, admin, student, category)
    buyer = create_user(db)
    conversation = start_conversation(client, buyer, product)

    offer = client.post(
        "/api/v1/offers",
        json={"conversation_id": conversation["id"], "amount": 24000},
        headers=auth_headers(buyer),
    ).json()
    accepted = client.patch(
        f"/api/v1/offers/{offer['id']}", json={"action": "accept"}, headers=auth_headers(student)
    ).json()
    assert accepted["status"] == "accepted"

    meeting = client.post(
        "/api/v1/meetings",
        json={
            "conversation_id": conversation["id"],
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "location": "Main library entrance",
            "notes": "Bring the charger please",
        },
        headers=auth_headers(buyer),
    )
    assert meeting.status_code == 201, meeting.text
    self_confirm = client.patch(
        f"/api/v1/meetings/{meeting.json()['id']}", json={"action": "accept"}, headers=auth_headers(buyer)
    )
    assert self_confirm.status_code == 403
    confirmed = client.patch(
        f"/api/v1/meetings/{meeting.json()['id']}", json={"action": "accept"}, headers=auth_headers(student)
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"

    transaction_response = client.post(
        "/api/v1/transactions",
        json={"offer_id": offer["id"]},
        headers=auth_headers(buyer),
    )
    assert transaction_response.status_code == 201, transaction_response.text
    transaction = transaction_response.json()
    assert transaction["status"] == "meeting_scheduled"

    reserved = client.get(f"/api/v1/products/{product['id']}").json()
    assert reserved["status"] == "reserved"

    second = client.post("/api/v1/transactions", json={"offer_id": offer["id"]}, headers=auth_headers(buyer))
    assert second.status_code in (200, 201, 409)
    if second.status_code in (200, 201):
        assert second.json()["id"] == transaction["id"]

    seller_confirm = client.post(f"/api/v1/transactions/{transaction['id']}/confirm", headers=auth_headers(student))
    assert seller_confirm.status_code == 200
    assert seller_confirm.json()["status"] == "completion_requested"

    review_too_early = client.post(
        "/api/v1/reviews",
        json={"transaction_id": transaction["id"], "rating": 5, "comment": "Great"},
        headers=auth_headers(buyer),
    )
    assert review_too_early.status_code in (200, 409)

    buyer_confirm = client.post(f"/api/v1/transactions/{transaction['id']}/confirm", headers=auth_headers(buyer))
    assert buyer_confirm.status_code == 200
    assert buyer_confirm.json()["status"] == "completed"

    sold = client.get(f"/api/v1/products/{product['id']}").json()
    assert sold["status"] == "sold"

    review = client.post(
        "/api/v1/reviews",
        json={"transaction_id": transaction["id"], "rating": 5, "comment": "Smooth handover, exactly as described."},
        headers=auth_headers(buyer),
    )
    assert review.status_code == 201, review.text

    duplicate = client.post(
        "/api/v1/reviews",
        json={"transaction_id": transaction["id"], "rating": 4},
        headers=auth_headers(buyer),
    )
    assert duplicate.status_code == 409

    outsider = create_user(db)
    forbidden = client.post(
        "/api/v1/reviews",
        json={"transaction_id": transaction["id"], "rating": 1},
        headers=auth_headers(outsider),
    )
    assert forbidden.status_code == 403

    profile = client.get(f"/api/v1/users/{student.id}").json()
    assert profile["review_count"] >= 1
    assert profile["rating_average"] == 5.0

    again = client.post("/api/v1/transactions", json={"offer_id": offer["id"]}, headers=auth_headers(buyer))
    assert again.status_code == 409


def test_transaction_cancellation_restores_listing(client, db, admin, student, category):
    product = setup_listing(client, db, admin, student, category)
    buyer = create_user(db)
    conversation = start_conversation(client, buyer, product)
    offer = client.post("/api/v1/offers", json={"conversation_id": conversation["id"], "amount": 20000},
                        headers=auth_headers(buyer)).json()
    client.patch(f"/api/v1/offers/{offer['id']}", json={"action": "accept"}, headers=auth_headers(student))
    transaction = client.post("/api/v1/transactions", json={"offer_id": offer["id"]},
                              headers=auth_headers(buyer)).json()

    cancelled = client.post(f"/api/v1/transactions/{transaction['id']}/cancel", json={"reason": "Changed my mind"},
                            headers=auth_headers(buyer))
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert client.get(f"/api/v1/products/{product['id']}").json()["status"] == "available"


def test_report_and_admin_resolution(client, db, admin, student, category):
    product = setup_listing(client, db, admin, student, category)
    reporter = create_user(db)
    response = client.post(
        "/api/v1/reports",
        json={"target_type": "product", "target_id": product["id"], "reason": "misleading_price",
              "details": "The price is inflated."},
        headers=auth_headers(reporter),
    )
    assert response.status_code == 201, response.text
    report = response.json()

    own = client.post(
        "/api/v1/reports",
        json={"target_type": "product", "target_id": product["id"], "reason": "spam"},
        headers=auth_headers(student),
    )
    assert own.status_code == 409

    pending = client.get("/api/v1/admin/reports?status=pending", headers=auth_headers(admin)).json()
    assert any(item["id"] == report["id"] for item in pending["items"])

    resolved = client.patch(
        f"/api/v1/admin/reports/{report['id']}",
        json={"status": "resolved", "resolution_note": "Listing price checked and corrected.",
              "remove_listing": True},
        headers=auth_headers(admin),
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"

    listing = client.get("/api/v1/products", params={"q": product["title"]}).json()
    assert all(item["id"] != product["id"] for item in listing["items"])

    logs = client.get("/api/v1/admin/audit-logs", headers=auth_headers(admin)).json()
    assert any(log["action"] == "report.resolve" for log in logs["items"])


def test_dashboard_and_notifications(client, db, student):
    headers = auth_headers(student)
    dashboard = client.get("/api/v1/users/me/dashboard", headers=headers)
    assert dashboard.status_code == 200
    body = dashboard.json()
    assert "listings" in body and "offers" in body and "transactions" in body

    notifications = client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200

    count = client.get("/api/v1/notifications/unread-count", headers=headers).json()
    assert "count" in count

    client.post("/api/v1/notifications/read-all", headers=headers)
    assert client.get("/api/v1/notifications/unread-count", headers=headers).json()["count"] == 0
