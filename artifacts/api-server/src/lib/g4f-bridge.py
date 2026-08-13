#!/usr/bin/env python3
"""Small JSON-lines bridge for the optional g4f Python package.

The Node server starts this process only when all configured API providers are
unavailable. Keeping g4f behind a subprocess makes the TypeScript build
independent from Python while allowing deployments that include Python/g4f.
"""
from __future__ import annotations

import json
import os
import sys


def as_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return str(value.get("content") or value.get("text") or "")
    return str(value)


def extract_content(response) -> str:
    choices = getattr(response, "choices", None)
    if choices is None and isinstance(response, dict):
        choices = response.get("choices")
    if choices:
        first = choices[0]
        message = getattr(first, "message", None)
        if message is None and isinstance(first, dict):
            message = first.get("message")
        if message is not None:
            content = getattr(message, "content", None)
            if content is None and isinstance(message, dict):
                content = message.get("content")
            text = as_text(content)
            if text:
                return text
    return as_text(getattr(response, "content", response if isinstance(response, str) else None))


def complete(payload: dict) -> dict:
    try:
        from g4f.client import Client
    except Exception as exc:
        raise RuntimeError("g4f is not installed. Install it with: pip install -U g4f") from exc

    model = payload.get("model") or os.getenv("G4F_MODEL") or "gpt-4o-mini"
    kwargs = {
        "model": model,
        "messages": payload.get("messages", []),
        "temperature": payload.get("temperature", 0.7),
    }
    if payload.get("max_tokens") is not None:
        kwargs["max_tokens"] = payload["max_tokens"]

    client = Client()
    response = client.chat.completions.create(**kwargs)
    content = extract_content(response)
    if not content:
        raise RuntimeError("g4f returned an empty response")
    return {"content": content, "model": model}


def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
            print(json.dumps({"ok": True, **complete(payload)}, ensure_ascii=False), flush=True)
        except Exception as exc:
            print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()

