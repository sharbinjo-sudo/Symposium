from pathlib import Path
from uuid import uuid4

from django.core.files.storage import default_storage
from django.core.signing import Signer

UPLOAD_SIGNER = Signer(salt="payment-proof")


def sniff_allowed_image_type(file_bytes: bytes) -> str | None:
  if file_bytes.startswith(b"\xff\xd8\xff"):
    return "jpg"
  if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
    return "png"
  if file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP":
    return "webp"
  return None


def save_payment_proof(uploaded_file) -> str:
  header = uploaded_file.read(32)
  uploaded_file.seek(0)
  extension = sniff_allowed_image_type(header)
  if extension is None:
    raise ValueError("Only JPEG, PNG, and WebP images are allowed.")

  filename = Path("payments") / f"{uuid4().hex}.{extension}"
  storage_path = default_storage.save(str(filename), uploaded_file)
  return UPLOAD_SIGNER.sign(storage_path)

