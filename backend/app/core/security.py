from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.client import supabase

auth_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(auth_scheme),
):
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    try:
        user = await supabase.auth.get_user(creds.credentials)
    except:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid auth token")

    return user
