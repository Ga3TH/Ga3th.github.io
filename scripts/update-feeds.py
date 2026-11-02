#!/usr/bin/env python3
"""Fetch the selected AI RSS feeds and save a static JSON snapshot for Pages."""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "feeds.json"
USER_AGENT = "Ga3TH-Portfolio-Feed/1.0 (+https://ga3th.github.io/)"
FEEDS = (
    ("OpenAI", "https://openai.com/news/rss.xml"),
    ("Google DeepMind", "https://deepmind.google/blog/rss.xml"),
    (
        "Anthropic · Google Actualités",
        "https://news.google.com/rss/search?q=site%3Aanthropic.com%2Fnews&hl=fr&gl=FR&ceid=FR%3Afr",
    ),
    ("arXiv · Intelligence artificielle", "https://rss.arxiv.org/rss/cs.AI"),
)


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def child_text(element: ET.Element, *names: str) -> str:
    for child in element:
        if local_name(child.tag) in names and child.text:
            return child.text.strip()
    return ""


def parse_date(value: str) -> str:
    if not value:
        return ""
    try:
        date = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            date = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return ""
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return date.astimezone(timezone.utc).isoformat()


def get_entry_link(entry: ET.Element) -> str:
    for child in entry:
        if local_name(child.tag) == "link":
            href = child.attrib.get("href")
            if href:
                return href
            if child.text:
                return child.text.strip()
    return ""


def fetch_feed(source: str, url: str) -> list[dict[str, str]]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        root = ET.fromstring(response.read())

    entries = [element for element in root.iter() if local_name(element.tag) in {"item", "entry"}]
    articles = []
    for entry in entries:
        title = child_text(entry, "title")
        link = get_entry_link(entry)
        published = child_text(entry, "pubdate", "published", "updated", "date")
        if title and link:
            articles.append(
                {
                    "source": source,
                    "title": re.sub(r"\s+", " ", title),
                    "url": link,
                    "published_at": parse_date(published),
                }
            )
    return articles


def main() -> int:
    articles = []
    for source, url in FEEDS:
        try:
            feed_articles = fetch_feed(source, url)
        except (OSError, ET.ParseError, urllib.error.URLError) as error:
            print(f"Échec du flux {source} ({url}): {error}", file=sys.stderr)
            return 1
        if not feed_articles:
            print(f"Le flux {source} ne contient aucun article exploitable.", file=sys.stderr)
            return 1
        articles.extend(feed_articles[:8])

    unique_articles = {article["url"]: article for article in articles}
    sorted_articles = sorted(
        unique_articles.values(),
        key=lambda article: article["published_at"],
        reverse=True,
    )
    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "items": sorted_articles[:40],
    }
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(data['items'])} articles enregistrés dans {OUTPUT.relative_to(ROOT)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
