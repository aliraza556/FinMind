def test_expenses_crud_minimal(client, auth_header):
    # Ensure categories: create one to use
    r = client.post("/categories", json={"name": "General"}, headers=auth_header)
    assert r.status_code in (201, 409)
    # Get categories to find id
    r = client.get("/categories", headers=auth_header)
    cat_id = r.get_json()[0]["id"]

    # Initially empty
    r = client.get("/expenses", headers=auth_header)
    assert r.status_code == 200
    assert r.get_json() == []

    # Create expense
    payload = {"amount": 12.5, "currency": "USD", "category_id": cat_id}
    r = client.post("/expenses", json=payload, headers=auth_header)
    assert r.status_code == 201
    exp_id = r.get_json()["id"]

    # List shows one
    r = client.get("/expenses", headers=auth_header)
    assert r.status_code == 200
    items = r.get_json()
    assert any(e["id"] == exp_id for e in items)
