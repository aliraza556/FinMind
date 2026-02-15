import csv
import io
import json
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import requests

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    PdfReader = None


DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"


def extract_transactions_from_statement(
    *,
    filename: str,
    content_type: str | None,
    data: bytes,
    gemini_api_key: str | None,
    gemini_model: str = DEFAULT_GEMINI_MODEL,
) -> list[dict[str, Any]]:
    name = (filename or "").lower()
    ctype = (content_type or "").lower()
    if name.endswith(".csv") or "csv" in ctype:
        return _parse_csv_rows(data)
    if name.endswith(".pdf") or "pdf" in ctype:
        text = _extract_pdf_text(data)
        return _extract_with_gemini(text, gemini_api_key, gemini_model)
    raise ValueError("Only PDF and CSV files are supported")


def normalize_import_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows:
        dt = _normalize_date(row.get("date"))
        amt = _normalize_amount(row.get("amount"))
        desc = str(row.get("description") or "").strip()
        if not dt or amt is None or not desc:
            continue
        cid = row.get("category_id")
        category_id = int(cid) if cid not in (None, "", "null") else None
        normalized.append(
            {
                "date": dt,
                "amount": float(amt),
                "description": desc[:500],
                "category_id": category_id,
                "expense_type": str(row.get("expense_type") or "EXPENSE").upper(),
                "currency": str(row.get("currency") or "USD")[:10],
            }
        )
    return normalized


def _parse_csv_rows(data: bytes) -> list[dict[str, Any]]:
    text = data.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    out: list[dict[str, Any]] = []
    for row in reader:
        out.append(
            {
                "date": row.get("date") or row.get("spent_at"),
                "amount": row.get("amount"),
                "description": row.get("description") or row.get("notes"),
                "category_id": row.get("category_id"),
                "currency": row.get("currency") or "USD",
            }
        )
    return out


def _extract_pdf_text(data: bytes) -> str:
    if not PdfReader:
        raise ValueError("PDF extraction dependency missing (pypdf)")
    reader = PdfReader(io.BytesIO(data))
    pages: list[str] = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    text = "\n".join(pages).strip()
    if not text:
        raise ValueError("PDF has no readable text")
    return text


def _extract_with_gemini(
    text: str,
    api_key: str | None,
    model: str,
) -> list[dict[str, Any]]:
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")
    prompt = (
        "You are FinMind's data-extraction persona: a meticulous bank statement analyst. "
        "Extract transactions and return ONLY JSON array. "
        "Each item: date(YYYY-MM-DD), amount(number), description(string), category_id(null), currency('USD'). "
        "Ignore balances, totals, and non-transaction rows. "
        "Do not include markdown.\n\n"
        f"STATEMENT_TEXT:\n{text[:120000]}"
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    resp = requests.post(
        url,
        params={"key": api_key},
        json={
            "generationConfig": {"temperature": 0},
            "contents": [{"parts": [{"text": prompt}]}],
        },
        timeout=45,
    )
    resp.raise_for_status()
    payload = resp.json()
    candidates = payload.get("candidates") or []
    if not candidates:
        return []
    parts = (
        candidates[0].get("content", {}).get("parts", [])
        if isinstance(candidates[0], dict)
        else []
    )
    text_blob = "\n".join(
        str(part.get("text") or "") for part in parts if isinstance(part, dict)
    ).strip()
    return _parse_transactions_json(text_blob)


def _parse_transactions_json(text: str) -> list[dict[str, Any]]:
    candidate = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\[.*\])\s*```", candidate, flags=re.S)
    if fenced:
        candidate = fenced.group(1)
    start = candidate.find("[")
    end = candidate.rfind("]")
    if start >= 0 and end > start:
        candidate = candidate[start : end + 1]
    parsed = json.loads(candidate)
    if not isinstance(parsed, list):
        raise ValueError("Gemini output did not contain a transaction array")
    return parsed


def _normalize_date(value: Any) -> str | None:
    if value in (None, ""):
        return None
    raw = str(value).strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m-%d-%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    try:
        return date.fromisoformat(raw).isoformat()
    except ValueError:
        return None


def _normalize_amount(value: Any) -> Decimal | None:
    if value in (None, ""):
        return None
    cleaned = re.sub(r"[^\d\.\-]", "", str(value))
    if not cleaned:
        return None
    try:
        return Decimal(cleaned).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None
