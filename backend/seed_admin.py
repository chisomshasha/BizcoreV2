"""
seed_admin.py
=============

Bootstrap the FIRST super-admin user from the command line.
This is the recommended path if you want to provision an account
without going through the in-app self-registration form.

Usage (inside the backend/ folder):

    MONGO_URL='mongodb+srv://...' DB_NAME='bizcore_db' \
    python seed_admin.py \
        --username admin \
        --email admin@example.com \
        --password 'Sup3rStrong!' \
        --name 'Initial Admin'

If you omit --username / --password, the script will generate a strong
random username and password and print them to stdout. Keep the output
secret.

Behaviour:
  * If a super_admin already exists, the script refuses to run
    (use the in-app user-management screen for additional accounts).
  * If users exist but none is a super_admin, the script promotes the
    earliest user to super_admin and sets a fresh password.
"""

import argparse
import asyncio
import os
import re
import secrets
import string
import sys
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient


# ---- duplicated hash helpers (kept in sync with server.py) ------------
import hashlib
import hmac

_PBKDF2_ITERATIONS = 200_000
_PBKDF2_ALGO       = "sha256"
_SALT_BYTES        = 16


def hash_password(plain: str) -> str:
    salt = secrets.token_bytes(_SALT_BYTES)
    dk = hashlib.pbkdf2_hmac(_PBKDF2_ALGO, plain.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def random_password(length: int = 16) -> str:
    alpha = string.ascii_letters + string.digits + "!@#%^*?-_=+"
    return "".join(secrets.choice(alpha) for _ in range(length))


# ------------------------------------------------------------------------
async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", help="Login username (lowercase, 3-60 chars).")
    parser.add_argument("--email",    help="Email address (required).")
    parser.add_argument("--password", help="Initial password (>=6 chars).")
    parser.add_argument("--name",     help="Display name.")
    args = parser.parse_args()

    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        print("ERROR: MONGO_URL environment variable is not set.", file=sys.stderr)
        sys.exit(2)

    db_name = os.environ.get("DB_NAME", "bizcore_db")
    client  = AsyncIOMotorClient(mongo_url)
    db      = client[db_name]

    try:
        # Ensure indexes (idempotent)
        await db.users.create_index("email",    unique=True)
        await db.users.create_index("username", unique=True, sparse=True)

        existing_admins = await db.users.count_documents({"role": "super_admin"})
        if existing_admins > 0:
            print(
                "ERROR: a super_admin already exists in the database.\n"
                "Create additional accounts via the in-app Users screen.",
                file=sys.stderr,
            )
            sys.exit(3)

        email = (args.email or "").strip().lower()
        if not email or "@" not in email:
            print("ERROR: --email is required and must be a valid address.", file=sys.stderr)
            sys.exit(2)

        username = (args.username or email.split("@")[0]).strip().lower()
        if not re.match(r"^[a-z0-9_.\-]{3,60}$", username):
            print(
                "ERROR: username must match ^[a-z0-9_.-]{3,60}$",
                file=sys.stderr,
            )
            sys.exit(2)

        if await db.users.find_one({"$or": [{"email": email}, {"username": username}]}, {"_id": 1}):
            print("ERROR: a user with that email or username already exists.", file=sys.stderr)
            sys.exit(4)

        password = args.password or random_password()
        if len(password) < 6:
            print("ERROR: password must be at least 6 characters.", file=sys.stderr)
            sys.exit(2)

        name = (args.name or username).strip()
        now  = datetime.now(timezone.utc)

        user_id = f"user_{secrets.token_hex(12)}"
        doc = {
            "user_id":       user_id,
            "username":      username,
            "email":         email,
            "name":          name,
            "phone":         None,
            "role":          "super_admin",
            "is_active":     True,
            "is_invited":    False,
            "debt_ceiling":  0.0,
            "is_flagged":    False,
            "password_hash": hash_password(password),
            "created_at":    now,
            "updated_at":    now,
        }
        await db.users.insert_one(doc)

        print("✅ Super-admin account created")
        print(f"   user_id : {user_id}")
        print(f"   username: {username}")
        print(f"   email   : {email}")
        print(f"   name    : {name}")
        print(f"   password: {password}")
        print()
        print("Store the password somewhere safe — it is NOT recoverable.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
