def test_auth_refresh_flow(client):
    # Register user
    email = "refresh@test.com"
    password = "secret123"
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (201, 409)  # 409 if already exists

    # Login to get tokens
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200
    data = r.get_json()
    assert "access_token" in data and "refresh_token" in data

    # Use refresh to get a new access token
    refresh_token = data["refresh_token"]
    r = client.post(
        "/auth/refresh", headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert r.status_code == 200
    new_access = r.get_json().get("access_token")
    assert isinstance(new_access, str) and len(new_access) > 10
