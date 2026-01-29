"""Integration tests for profile/timezone endpoints."""


class TestTimezoneEndpoint:
    """Integration tests for PATCH /api/v1/profile/timezone."""

    def test_update_timezone_valid_iana(self, client, auth_headers):
        """Test updating timezone with valid IANA timezone."""
        timezones = [
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Asia/Tokyo",
            "Australia/Sydney",
            "UTC",
        ]

        for tz in timezones:
            response = client.patch(
                "/api/v1/profile/timezone", json=tz, headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data["timezone"] == tz

    def test_update_timezone_invalid_timezone(self, client, auth_headers):
        """Test that invalid timezone returns 400."""
        response = client.patch(
            "/api/v1/profile/timezone", json="Invalid/Timezone", headers=auth_headers
        )

        assert response.status_code == 400
        assert "Invalid timezone" in response.json()["detail"]

    def test_update_timezone_empty_string(self, client, auth_headers):
        """Test that empty timezone string returns 400."""
        response = client.patch(
            "/api/v1/profile/timezone", json="", headers=auth_headers
        )

        assert response.status_code == 400

    def test_update_timezone_affects_today_summary(self, client, auth_headers):
        """Test that timezone affects today's summary date."""
        # Set timezone to Tokyo
        tz_response = client.patch(
            "/api/v1/profile/timezone", json="Asia/Tokyo", headers=auth_headers
        )
        assert tz_response.status_code == 200

        # Get today's summary
        summary_response = client.get(
            "/api/v1/transactions/today-summary", headers=auth_headers
        )

        assert summary_response.status_code == 200
        data = summary_response.json()

        # Should return a date (might be different from UTC today)
        assert "date" in data
        assert len(data["date"]) == 10  # YYYY-MM-DD format

    def test_timezone_persists_across_requests(self, client, auth_headers):
        """Test that timezone setting persists."""
        # Set timezone
        tz1_response = client.patch(
            "/api/v1/profile/timezone", json="America/Chicago", headers=auth_headers
        )
        assert tz1_response.status_code == 200

        # Make another request that uses timezone
        summary_response = client.get(
            "/api/v1/transactions/today-summary", headers=auth_headers
        )
        assert summary_response.status_code == 200

        # Change timezone
        tz2_response = client.patch(
            "/api/v1/profile/timezone", json="Europe/Paris", headers=auth_headers
        )
        assert tz2_response.status_code == 200
        assert tz2_response.json()["timezone"] == "Europe/Paris"

    def test_timezone_with_various_formats(self, client, auth_headers):
        """Test timezone endpoint with various valid IANA formats."""
        valid_timezones = [
            "America/Argentina/Buenos_Aires",
            "Pacific/Auckland",
            "Indian/Maldives",
            "Atlantic/Reykjavik",
        ]

        for tz in valid_timezones:
            response = client.patch(
                "/api/v1/profile/timezone", json=tz, headers=auth_headers
            )
            assert response.status_code == 200

    def test_timezone_unauthorized(self, client):
        """Test that timezone endpoint requires authentication."""
        response = client.patch("/api/v1/profile/timezone", json="America/New_York")

        assert response.status_code in [401, 403]  # Unauthorized or Forbidden
