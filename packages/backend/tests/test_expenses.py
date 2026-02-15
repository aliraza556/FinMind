from io import BytesIO


def _create_category(client, auth_header, name="General"):
    r = client.post("/categories", json={"name": name}, headers=auth_header)
    assert r.status_code in (201, 409)
    r = client.get("/categories", headers=auth_header)
    assert r.status_code == 200
    return r.get_json()[0]["id"]


def test_expenses_crud_filters_and_canonical_fields(client, auth_header):
    cat_id = _create_category(client, auth_header)

    r = client.get("/expenses", headers=auth_header)
    assert r.status_code == 200
    assert r.get_json() == []

    payload = {
        "amount": 12.5,
        "currency": "USD",
        "category_id": cat_id,
        "description": "Groceries",
        "date": "2026-02-12",
    }
    r = client.post("/expenses", json=payload, headers=auth_header)
    assert r.status_code == 201
    created = r.get_json()
    exp_id = created["id"]
    assert created["description"] == "Groceries"
    assert created["date"] == "2026-02-12"
    assert created["amount"] == 12.5

    r = client.patch(
        f"/expenses/{exp_id}",
        json={"description": "Groceries + milk", "amount": 15.0},
        headers=auth_header,
    )
    assert r.status_code == 200
    updated = r.get_json()
    assert updated["description"] == "Groceries + milk"
    assert updated["amount"] == 15.0

    r = client.get("/expenses?search=milk", headers=auth_header)
    assert r.status_code == 200
    items = r.get_json()
    assert len(items) == 1
    assert items[0]["id"] == exp_id

    r = client.get("/expenses?from=2026-02-01&to=2026-02-28", headers=auth_header)
    assert r.status_code == 200
    assert len(r.get_json()) == 1

    r = client.delete(f"/expenses/{exp_id}", headers=auth_header)
    assert r.status_code == 200

    r = client.get("/expenses", headers=auth_header)
    assert r.status_code == 200
    assert r.get_json() == []


def test_expense_import_preview_and_commit_prevents_duplicates(client, auth_header):
    cat_id = _create_category(client, auth_header)

    csv_data = (
        "date,amount,description,category_id\n"
        "2026-02-10,10.50,Coffee,{}\n"
        "2026-02-11,22.00,Lunch,\n".format(cat_id)
    )
    data = {"file": (BytesIO(csv_data.encode("utf-8")), "statement.csv")}
    r = client.post(
        "/expenses/import/preview",
        data=data,
        content_type="multipart/form-data",
        headers=auth_header,
    )
    assert r.status_code == 200
    preview = r.get_json()
    assert preview["total"] == 2
    assert preview["duplicates"] == 0
    assert preview["transactions"][0]["description"] == "Coffee"

    r = client.post(
        "/expenses/import/commit",
        json={"transactions": preview["transactions"]},
        headers=auth_header,
    )
    assert r.status_code == 201
    committed = r.get_json()
    assert committed["inserted"] == 2
    assert committed["duplicates"] == 0

    r = client.post(
        "/expenses/import/commit",
        json={"transactions": preview["transactions"]},
        headers=auth_header,
    )
    assert r.status_code == 201
    second = r.get_json()
    assert second["inserted"] == 0
    assert second["duplicates"] == 2


def test_expense_import_preview_pdf_uses_extractor(client, auth_header, monkeypatch):
    _create_category(client, auth_header)

    def _fake_extract(*args, **kwargs):
        return [{"date": "2026-02-10", "amount": 7.5, "description": "Bus", "category_id": None}]

    monkeypatch.setattr(
        "app.services.expense_import.extract_transactions_from_statement",
        _fake_extract,
    )

    data = {"file": (BytesIO(b"%PDF-1.4 fake"), "statement.pdf")}
    r = client.post(
        "/expenses/import/preview",
        data=data,
        content_type="multipart/form-data",
        headers=auth_header,
    )
    assert r.status_code == 200
    payload = r.get_json()
    assert payload["total"] == 1
    assert payload["transactions"][0]["description"] == "Bus"
