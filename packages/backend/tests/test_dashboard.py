from datetime import date, timedelta


def test_dashboard_summary_returns_live_data(client, auth_header):
    # Seed one income and one expense
    r = client.post(
        "/expenses",
        json={
            "amount": 3000,
            "description": "Salary",
            "date": date.today().isoformat(),
            "expense_type": "INCOME",
        },
        headers=auth_header,
    )
    assert r.status_code == 201

    r = client.post(
        "/expenses",
        json={
            "amount": 500,
            "description": "Groceries",
            "date": date.today().isoformat(),
            "expense_type": "EXPENSE",
        },
        headers=auth_header,
    )
    assert r.status_code == 201

    # Seed bill
    r = client.post(
        "/bills",
        json={
            "name": "Internet",
            "amount": 49.99,
            "next_due_date": (date.today() + timedelta(days=3)).isoformat(),
            "cadence": "MONTHLY",
        },
        headers=auth_header,
    )
    assert r.status_code == 201

    r = client.get("/dashboard/summary", headers=auth_header)
    assert r.status_code == 200
    payload = r.get_json()

    assert "summary" in payload
    assert payload["summary"]["monthly_income"] >= 3000
    assert payload["summary"]["monthly_expenses"] >= 500
    assert payload["summary"]["net_flow"] >= 2500

    assert isinstance(payload["recent_transactions"], list)
    assert any(t["description"] == "Salary" for t in payload["recent_transactions"])
    assert any(t["type"] == "INCOME" for t in payload["recent_transactions"])

    assert isinstance(payload["upcoming_bills"], list)
    assert len(payload["upcoming_bills"]) >= 1
