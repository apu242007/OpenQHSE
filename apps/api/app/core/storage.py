"""MinIO / S3-compatible object storage client.

DISEÑO CORREGIDO:
- upload_file() retorna el PATH (no la URL directa)
- get_object_url() genera la URL correcta según entorno (dev vs prod)
- Los archivos privados SIEMPRE se acceden mediante presigned URLs
- En producción usa S3 path style, en dev usa MinIO local
"""

from __future__ import annotations

import io
from typing import Any, BinaryIO

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import get_settings

settings = get_settings()

_client = None


def _get_client() -> Any:
    """Lazy-initialise el cliente S3/MinIO."""
    global _client
    if _client is None:
        if settings.is_production:
            # AWS S3 en producción — usa credenciales IAM o env vars
            _client = boto3.client(
                "s3",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id or None,
                aws_secret_access_key=settings.aws_secret_access_key or None,
                config=BotoConfig(
                    retries={"max_attempts": 3, "mode": "adaptive"},
                ),
            )
        else:
            # MinIO en desarrollo
            protocol = "https" if settings.minio_use_ssl else "http"
            _client = boto3.client(
                "s3",
                endpoint_url=f"{protocol}://{settings.minio_endpoint}",
                aws_access_key_id=settings.minio_root_user,
                aws_secret_access_key=settings.minio_root_password,
                config=BotoConfig(
                    signature_version="s3v4",
                    s3={"addressing_style": "path"},
                    retries={"max_attempts": 3, "mode": "adaptive"},
                ),
                region_name="us-east-1",
            )
    return _client


def get_object_url(path: str, bucket: str | None = None) -> str:
    """Genera la URL pública del objeto según el entorno.

    En producción: https://bucket.s3.region.amazonaws.com/path
    En desarrollo (MinIO): http://localhost:9000/bucket/path

    IMPORTANTE: Para objetos privados NO usar esta función.
    Usar get_presigned_url() en su lugar.
    """
    bucket = bucket or settings.effective_bucket
    if settings.is_production:
        return f"https://{bucket}.s3.{settings.aws_region}.amazonaws.com/{path}"
    else:
        protocol = "https" if settings.minio_use_ssl else "http"
        return f"{protocol}://{settings.minio_endpoint}/{bucket}/{path}"


def create_bucket_if_not_exists(bucket: str | None = None) -> None:
    """Asegura que el bucket objetivo exista; lo crea si no existe."""
    bucket = bucket or settings.effective_bucket
    client = _get_client()
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError:
        if settings.is_production and settings.aws_region != "us-east-1":
            client.create_bucket(
                Bucket=bucket,
                CreateBucketConfiguration={"LocationConstraint": settings.aws_region},
            )
        else:
            client.create_bucket(Bucket=bucket)


def upload_file(
    file: BinaryIO | bytes,
    path: str,
    *,
    bucket: str | None = None,
    content_type: str = "application/octet-stream",
    public: bool = False,
) -> str:
    """Sube un archivo al storage y retorna su PATH (no la URL).

    Args:
        file: File-like object o bytes raw.
        path: Object key (e.g. ``"inspections/abc/photo.jpg"``).
        bucket: Bucket destino (default según entorno).
        content_type: MIME type del objeto.
        public: Si True aplica ACL public-read (solo assets públicos).

    Returns:
        El path del objeto en el bucket, SIN la URL base.
        Para la URL usa get_object_url(path) o get_presigned_url(path).
    """
    bucket = bucket or settings.effective_bucket
    client = _get_client()
    create_bucket_if_not_exists(bucket)

    if isinstance(file, bytes):
        file = io.BytesIO(file)

    extra_args: dict[str, Any] = {"ContentType": content_type}
    if public:
        extra_args["ACL"] = "public-read"

    client.upload_fileobj(file, bucket, path, ExtraArgs=extra_args)

    # Retornar SOLO el path, no la URL directa
    return path


def delete_file(path: str, *, bucket: str | None = None) -> None:
    """Elimina un objeto del bucket."""
    bucket = bucket or settings.effective_bucket
    client = _get_client()
    client.delete_object(Bucket=bucket, Key=path)


def get_presigned_url(
    path: str,
    *,
    bucket: str | None = None,
    expiry: int = 3600,
    method: str = "get_object",
) -> str:
    """Genera una pre-signed URL para acceso temporal a objetos privados.

    Args:
        path: Object key.
        bucket: Bucket destino.
        expiry: Validez en segundos (default 1 hora).
        method: ``"get_object"`` para descarga, ``"put_object"`` para subida.

    Returns:
        URL pre-firmada con validez limitada.
    """
    bucket = bucket or settings.effective_bucket
    client = _get_client()
    return str(
        client.generate_presigned_url(
            ClientMethod=method,
            Params={"Bucket": bucket, "Key": path},
            ExpiresIn=expiry,
        )
    )


def list_objects(prefix: str = "", *, bucket: str | None = None) -> list[dict[str, Any]]:
    """Lista objetos con un prefijo dado."""
    bucket = bucket or settings.effective_bucket
    client = _get_client()
    response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
    return [
        {
            "key": obj["Key"],
            "size": obj["Size"],
            "last_modified": obj["LastModified"],
        }
        for obj in response.get("Contents", [])
    ]
