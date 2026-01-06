"""
Security utilities for encryption and decryption of sensitive data.

Uses Fernet (symmetric encryption) for API keys and other secrets.
"""

import os
import base64
from cryptography.fernet import Fernet
from app.core.config import settings


# Generate or load encryption key from environment
def get_encryption_key() -> bytes:
    """Get Fernet encryption key from environment or generate one."""
    key = os.getenv("ENCRYPTION_KEY")
    if key:
        # Check if it's already a valid Fernet key (44 chars base64)
        # Fernet keys are exactly 44 characters when base64-encoded (32 bytes)
        if len(key) == 44:
            try:
                # Try to use it directly as a Fernet key
                return key.encode()
            except Exception:
                pass

        # Otherwise, treat it as a password and derive a Fernet key
        import hashlib
        # Use SHA256 to create a 32-byte key from any input
        hash_bytes = hashlib.sha256(key.encode()).digest()
        # Encode to base64 for Fernet
        return base64.urlsafe_b64encode(hash_bytes)

    # Generate new key if none exists (WARNING: This will change on restart!)
    # In production, always set ENCRYPTION_KEY in .env
    generated = Fernet.generate_key()
    print(f"⚠️  WARNING: Generated new encryption key. Set ENCRYPTION_KEY in .env to persist:")
    print(f"   ENCRYPTION_KEY={generated.decode()}")
    return generated


# Initialize cipher
_cipher = Fernet(get_encryption_key())


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key using Fernet symmetric encryption.

    Args:
        api_key: The plaintext API key

    Returns:
        Base64-encoded encrypted key
    """
    if not api_key:
        return ""
    encrypted = _cipher.encrypt(api_key.encode())
    return encrypted.decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an encrypted API key.

    Args:
        encrypted_key: Base64-encoded encrypted key

    Returns:
        The plaintext API key
    """
    if not encrypted_key:
        return ""
    try:
        decrypted = _cipher.decrypt(encrypted_key.encode())
        return decrypted.decode()
    except Exception as e:
        raise ValueError(f"Failed to decrypt API key: {e}")


def mask_api_key(api_key: str, visible_chars: int = 4) -> str:
    """Mask an API key for display purposes.

    Args:
        api_key: The API key to mask
        visible_chars: Number of trailing characters to show

    Returns:
        Masked key like "sk-ant-...k3Yz"
    """
    if not api_key:
        return "(not set)"
    if len(api_key) <= visible_chars:
        return api_key
    return f"...{api_key[-visible_chars:]}"
