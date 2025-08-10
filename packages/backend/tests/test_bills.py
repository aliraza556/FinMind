from datetime import date

def test_bills_crud_and_mark_paid(client, auth_header):
    # Initially empty
    r = client.get("/bills", headers=auth_header)
    assert r.status_code == 200
    assert r.get_json() == []

    # Create bill
    payload = {
        "name": "Internet",
        "amount": 49.99,
        "currency": "USD",
        "next_due_date": date.today().isoformat(),
        "cadence": "MONTHLY",
        "channel_email": True,
        "channel_whatsapp": False,
    }
    r = client.post("/bills", json=payload, headers=auth_header)
    assert r.status_code == 201
    bill_id = r.get_json()["id"]

    # List has 1
    r = client.get("/bills", headers=auth_header)
    assert r.status_code == 200
    items = r.get_json()
    assert any(b["id"] == bill_id for b in items)

    # Mark paid
    r = client.post(f"/bills/{bill_id}/pay", headers=auth_header)
    assert r.status_code == 200
    assert r.get_json()["message"] == "updated"
