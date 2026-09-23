#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["qdrant-client[fastembed]>=1.14"]
# ///
"""Embed markdown/text files locally (fastembed, CPU) and upsert them into homelab Qdrant.

usage:
  scripts/qdrant-ingest.py FILE...          # (re)ingest; re-running a file replaces its chunks
  scripts/qdrant-ingest.py --query TEXT     # semantic search
  scripts/qdrant-ingest.py --selftest       # check the chunker
"""
import re
import sys
import uuid
from pathlib import Path

URL, COLLECTION, MODEL = "http://qdrant.k8s.local", "knowledge_base", "BAAI/bge-small-en-v1.5"


def chunks(text, limit=1500):
    # ponytail: heading/paragraph split, no token counting; a single paragraph > ~2k chars gets truncated by the model
    carry = ""
    for section in re.split(r"(?m)^(?=#{1,3} )", text):
        section = carry + section
        if len(section.strip()) < 200:  # heading-only/tiny section: glue onto the next one
            carry = section
            continue
        carry = buf = ""
        for para in section.split("\n\n"):
            if buf.strip() and len(buf) + len(para) > limit:
                yield buf.strip()
                buf = ""
            buf += para + "\n\n"
        if buf.strip():
            yield buf.strip()
    if carry.strip():
        yield carry.strip()


def selftest():
    out = list(chunks("# A\nintro\n\n## B\n" + "x" * 900 + "\n\n" + "y" * 900))
    assert out == ["# A\nintro\n\n## B\n" + "x" * 900, "y" * 900], out
    assert list(chunks("# tiny")) == ["# tiny"]
    assert list(chunks("\n\n")) == []
    print("ok")


def main(args):
    from qdrant_client import QdrantClient, models

    client = QdrantClient(url=URL, port=80, timeout=120)  # port=80: ingress, client defaults to 6333

    if args[0] == "--query":
        doc = models.Document(text=" ".join(args[1:]), model=MODEL)
        for p in client.query_points(COLLECTION, query=doc, limit=5).points:
            print(f"{p.score:.3f}  {p.payload['source']}  #{p.payload['chunk']}\n    {p.payload['text'][:160]!r}")
        return

    if not client.collection_exists(COLLECTION):
        size = client.get_embedding_size(MODEL)
        client.create_collection(COLLECTION, models.VectorParams(size=size, distance=models.Distance.COSINE))
        client.create_payload_index(COLLECTION, "source", models.PayloadSchemaType.KEYWORD)

    for f in (Path(a).resolve() for a in args):
        source = f"{f.parent.name}/{f.name}"  # parent dir disambiguates e.g. the two 00_README.md
        same_source = models.Filter(must=[models.FieldCondition(key="source", match=models.MatchValue(value=source))])
        client.delete(COLLECTION, models.FilterSelector(filter=same_source), wait=True)
        points = [
            models.PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"{source}#{i}")),
                vector=models.Document(text=c, model=MODEL),
                payload={"source": source, "chunk": i, "text": c},
            )
            for i, c in enumerate(chunks(f.read_text(errors="replace")))
        ]
        if points:
            client.upsert(COLLECTION, points, wait=True)
        print(f"{len(points):4d}  {source}")


if __name__ == "__main__":
    if not sys.argv[1:]:
        sys.exit(__doc__)
    selftest() if sys.argv[1] == "--selftest" else main(sys.argv[1:])
