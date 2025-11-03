from fastapi import status


class BaseAPIException(Exception):
    """Parent for all domain errors."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    error_code: str = "BAD_REQUEST"
    detail: str = "Bad request"

    def __init__(self, detail: str | None = None):
        if detail:
            self.detail = detail
        super().__init__(self.detail)


class UserNotFound(BaseAPIException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "USER_NOT_FOUND"
    detail = "User does not exist"


class InvalidCredentials(BaseAPIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "INVALID_CREDENTIALS"
    detail = "Wrong email or password"


class RateLimitExceeded(BaseAPIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "RATE_LIMIT_EXCEEDED"
    detail = "Too many requests"
