"""WebSocket chat authorization and delivery tests."""

import pytest

from tests.conftest import auth_headers, create_user
from tests.test_marketplace import approve
from tests.test_trade_flow import setup_listing, start_conversation


def ws_url(conversation_id, token):
    return f"/api/v1/ws/chat/{conversation_id}?token={token}"


def test_websocket_requires_authentication(client, db, admin, student, category):
    product = setup_listing(client, db, admin, student, category)
    buyer = create_user(db)
    conversation = start_conversation(client, buyer, product)

    with pytest.raises(Exception):
        with client.websocket_connect(ws_url(conversation["id"], "invalid-token")) as ws:
            ws.receive_json()


def test_websocket_rejects_non_participant(client, db, admin, student, category):
    from app.core.security import create_access_token

    product = setup_listing(client, db, admin, student, category)
    buyer = create_user(db)
    outsider = create_user(db)
    conversation = start_conversation(client, buyer, product)

    with pytest.raises(Exception):
        with client.websocket_connect(ws_url(conversation["id"], create_access_token(outsider.id))) as ws:
            ws.receive_json()


def test_websocket_delivers_messages_between_participants(client, db, admin, student, category):
    from app.core.security import create_access_token

    product = setup_listing(client, db, admin, student, category)
    buyer = create_user(db)
    conversation = start_conversation(client, buyer, product)

    buyer_token = create_access_token(buyer.id)
    seller_token = create_access_token(student.id)

    with client.websocket_connect(ws_url(conversation["id"], buyer_token)) as buyer_ws:
        ready = buyer_ws.receive_json()
        assert ready["type"] == "ready"

        with client.websocket_connect(ws_url(conversation["id"], seller_token)) as seller_ws:
            seller_ws.receive_json()

            buyer_ws.send_json({"type": "message", "body": "Sending over realtime"})
            broadcast = buyer_ws.receive_json()
            assert broadcast["type"] == "message"
            assert broadcast["message"]["body"] == "Sending over realtime"

            seller_received = seller_ws.receive_json()
            assert seller_received["message"]["sender_id"] == buyer.id

            buyer_ws.send_json({"type": "ping"})
            assert buyer_ws.receive_json()["type"] == "pong"

    history = client.get(
        f"/api/v1/conversations/{conversation['id']}", headers=auth_headers(student)
    ).json()
    assert any(m["body"] == "Sending over realtime" for m in history["messages"])
