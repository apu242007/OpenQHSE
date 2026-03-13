"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_register_creates_user_and_org(client: AsyncClient) -> None:
    """Registration should create both an organization and admin user."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@example.com",
            "password": "SecurePass1",
            "first_name": "John",
            "last_name": "Doe",
            "organization_name": "New Corp",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_register_duplicate_email_fails(client: AsyncClient) -> None:
    """Registration with an existing email should return 409."""
    payload = {
        "email": "dup@example.com",
        "password": "SecurePass1",
        "first_name": "Jane",
        "last_name": "Doe",
        "organization_name": "Dup Corp",
    }
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


async def test_login_valid_credentials(client: AsyncClient) -> None:
    """Login with correct credentials should return tokens."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "SecurePass1",
            "first_name": "Login",
            "last_name": "User",
            "organization_name": "Login Corp",
        },
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "SecurePass1"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


async def test_login_invalid_password(client: AsyncClient) -> None:
    """Login with wrong password should return 401."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrong@example.com",
            "password": "SecurePass1",
            "first_name": "Wrong",
            "last_name": "Pass",
            "organization_name": "Wrong Corp",
        },
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "wrong@example.com", "password": "WrongPassword1"},
    )
    assert response.status_code == 401


async def test_me_requires_auth(client: AsyncClient) -> None:
    """The /me endpoint should require authentication."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403


async def test_me_returns_current_user(client: AsyncClient) -> None:
    """The /me endpoint should return the authenticated user's profile."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "me@example.com",
            "password": "SecurePass1",
            "first_name": "Me",
            "last_name": "User",
            "organization_name": "Me Corp",
        },
    )
    token = reg.json()["access_token"]
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["first_name"] == "Me"
