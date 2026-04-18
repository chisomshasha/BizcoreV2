# ============================================================
# server_auth_patch.py
#
# INSTRUCTIONS: In backend/server.py, find the block:
#
#   @api_router.post("/auth/session")
#   async def create_session(request: Request, response: Response):
#       ...
#
# and REPLACE the ENTIRE function (up to, but not including,
# @api_router.get("/auth/me")) with the code below.
#
# Also add these three lines immediately after the db= line (~line 35):
#
#   import urllib.parse
#   GOOGLE_CLIENT_ID     = os.environ.get('GOOGLE_CLIENT_ID', '')
#   GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
#   GOOGLE_REDIRECT_URI  = os.environ.get('GOOGLE_REDIRECT_URI', '')
#
# And fix CORS (near end of file):
#   allow_origins=["*"]  →  allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(",")
# ============================================================

# ========================
# AUTH ENDPOINTS
# ========================

@api_router.get("/auth/google")
async def google_auth(redirect_uri: str = ""):
    """
    Step 1 of Google OAuth: redirect the browser/WebView to Google's
    consent screen. The frontend opens this URL via WebBrowser.openAuthSessionAsync.

    redirect_uri — the app deep-link URL to return to after login
                   e.g. bizcorev2://auth-callback
    """
    from fastapi.responses import RedirectResponse

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured on server")

    # Encode the app's return URL into the OAuth state so we can bounce back to it
    state = base64.urlsafe_b64encode(redirect_uri.encode()).decode()

    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,   # points back to THIS backend
        "response_type": "code",
        "scope":         "openid email profile",
        "state":         state,
        "access_type":   "offline",
        "prompt":        "select_account",       # always show account picker
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(auth_url)


@api_router.get("/auth/google/callback")
async def google_callback(code: str = "", state: str = "", error: str = ""):
    """
    Step 2 of Google OAuth: Google redirects here with ?code=...
    We exchange the code for an access token, fetch the user's profile,
    find-or-create the user in MongoDB, create a session, then redirect
    the browser back to the app deep-link with ?session_token=...
    """
    from fastapi.responses import RedirectResponse

    # Decode the original app deep-link from state
    try:
        app_redirect = base64.urlsafe_b64decode(state.encode()).decode()
    except Exception:
        # FIXED: Use the correct scheme matching app.json
        app_redirect = "bizcorev2://auth-callback"

    if error:
        logger.warning(f"Google OAuth error: {error}")
        return RedirectResponse(f"{app_redirect}?error={urllib.parse.quote(error)}")

    if not code:
        return RedirectResponse(f"{app_redirect}?error=missing_code")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Exchange authorisation code for tokens
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code":          code,
                    "client_id":     GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri":  GOOGLE_REDIRECT_URI,
                    "grant_type":    "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                logger.error(f"Google token exchange failed: {token_resp.text}")
                return RedirectResponse(f"{app_redirect}?error=token_exchange_failed")

            token_data   = token_resp.json()
            access_token = token_data.get("access_token")

            # Fetch the user's Google profile
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_resp.status_code != 200:
                logger.error(f"Google userinfo failed: {userinfo_resp.text}")
                return RedirectResponse(f"{app_redirect}?error=userinfo_failed")

            google_user = userinfo_resp.json()

    except Exception as exc:
        logger.error(f"Google OAuth network error: {exc}")
        return RedirectResponse(f"{app_redirect}?error=network_error")

    email   = google_user.get("email", "").strip().lower()
    name    = google_user.get("name", email)
    picture = google_user.get("picture")

    if not email:
        return RedirectResponse(f"{app_redirect}?error=no_email")

    # ── Find or create user ──────────────────────────────────────────────────
    existing = await db.users.find_one({"email": email}, {"_id": 0})

    if existing:
        user_id = existing["user_id"]
        # Refresh display name + avatar from Google on every login
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name":       name,
                "picture":    picture,
                "updated_at": datetime.now(timezone.utc),
            }},
        )
    else:
        # Auto-promote the very first login to super_admin so the admin can
        # bootstrap roles for everyone else via More → Users.
        user_count = await db.users.count_documents({})
        user_id    = f"user_{uuid.uuid4().hex[:12]}"
        user_doc   = {
            "user_id":      user_id,
            "email":        email,
            "name":         name,
            "picture":      picture,
            "role":         UserRole.SUPER_ADMIN.value if user_count == 0 else UserRole.VIEWER.value,
            "is_active":    True,
            "is_invited":   False,
            "debt_ceiling": 0.0,
            "is_flagged":   False,
            "created_at":   datetime.now(timezone.utc),
            "updated_at":   datetime.now(timezone.utc),
        }
        await db.users.insert_one(user_doc)
        logger.info(f"New user created: {email} role={'super_admin' if user_count == 0 else 'viewer'}")

    # Check account is active (admin may have deactivated it)
    user_check = await db.users.find_one({"user_id": user_id}, {"_id": 0, "is_active": 1})
    if user_check and not user_check.get("is_active", True):
        return RedirectResponse(f"{app_redirect}?error=account_disabled")

    # ── Create session ───────────────────────────────────────────────────────
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at    = datetime.now(timezone.utc) + timedelta(days=7)

    # Invalidate any existing sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id":       user_id,
        "session_token": session_token,
        "expires_at":    expires_at,
        "created_at":    datetime.now(timezone.utc),
    })

    logger.info(f"Session created for {email}")

    # ── Redirect back to the app with the session token ──────────────────────
    # The frontend's Linking listener picks this up and calls login(session_token)
    return RedirectResponse(f"{app_redirect}?session_token={session_token}")
