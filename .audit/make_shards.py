#!/usr/bin/env python3
"""
Deterministic shard manifest for the UI coherence audit.

Reads  .audit/files.txt   (tab-separated: <loc>\t<path>, produced by the
                           `find | wc -l` enumeration — see PLAN.md)
Reads  .audit/graph.json  (optional; madge import graph keyed by path
                           relative to src/) — used only for coupling stats.
Writes .audit/shards/shard-NNN.txt  one file per shard, `<loc>\t<path>` lines
Writes .audit/shards/manifest.json  machine-readable summary

Algorithm (all steps deterministic; no randomness, no timestamps):

1. Every file is assigned to a GROUP = its directory (e.g. widgets/trip-form).
   Files in the same directory never split across shards unless the
   directory alone exceeds MAX_LOC.
2. Groups are ordered so that related directories sit next to each other:
     - shared/* first (the toolkit every feature builds on), then app/*,
     - then every feature directory sorted by its FEATURE NAME (the path
       with the FSD layer stripped), so entities/trip, pages/trips,
       widgets/trip-form, widgets/trips-table ... are adjacent, and within
       one feature name the layer order is entities < pages < widgets < features.
3. Groups are packed SEQUENTIALLY (not first-fit) into shards of at most
   MAX_LOC lines: if the next group does not fit, a new shard starts.
   Sequential packing is what keeps neighbours together; first-fit would
   scatter small directories into whatever earlier shard had room.
4. A group larger than MAX_LOC cannot stay whole, so it fills the current
   shard and spills by file (files sorted by path) into consecutive shards.

Re-running after a refactor changes only the shards whose inputs changed
(and any shard after them in sequence), never the ordering rule itself.

Usage:  python3 .audit/make_shards.py [--max-loc 2500] [--files .audit/files.txt]
                                      [--graph .audit/graph.json] [--out .audit/shards]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

LAYER_RANK = {"entities": 0, "pages": 1, "widgets": 2, "features": 3}


def read_files(path: str) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\n")
            if not line.strip():
                continue
            loc_s, fpath = line.split("\t", 1)
            fpath = fpath.strip()
            if fpath.startswith("src/"):
                fpath = fpath[4:]
            out.append((int(loc_s), fpath))
    return out


def group_key(directory: str) -> tuple:
    """Sort key so related directories are adjacent. See module docstring."""
    parts = directory.split("/") if directory else []
    layer = parts[0] if parts else ""
    if layer == "shared":
        return (0, directory, 0)
    if layer == "app" or directory == "":
        return (1, directory, 0)
    feature = "/".join(parts[1:]) if len(parts) > 1 else directory
    return (2, feature, LAYER_RANK.get(layer, 9), directory)


def build_shards(files: list[tuple[int, str]], max_loc: int):
    groups: dict[str, list[tuple[int, str]]] = {}
    for loc, fpath in files:
        d = os.path.dirname(fpath)
        groups.setdefault(d, []).append((loc, fpath))
    for d in groups:
        groups[d].sort(key=lambda t: t[1])

    ordered = sorted(groups.keys(), key=group_key)

    shards: list[dict] = []
    cur: dict | None = None

    def new_shard():
        nonlocal cur
        cur = {"files": [], "loc": 0, "groups": []}
        shards.append(cur)

    for d in ordered:
        g_files = groups[d]
        g_loc = sum(l for l, _ in g_files)
        if g_loc > max_loc:
            # Oversized directory: it must split anyway, so fill the current
            # shard first and spill by file (path order) into the next ones.
            if cur is None:
                new_shard()
            for loc, fpath in g_files:
                if cur["loc"] + loc > max_loc and cur["files"]:
                    new_shard()
                cur["files"].append((loc, fpath))
                cur["loc"] += loc
                if d not in cur["groups"]:
                    cur["groups"].append(d)
            continue
        if cur is None or cur["loc"] + g_loc > max_loc:
            new_shard()
        cur["files"].extend(g_files)
        cur["loc"] += g_loc
        cur["groups"].append(d)
    return shards


def coupling(shards: list[dict], graph: dict | None):
    """Per shard: how many import edges leave the shard (for the auditor's context)."""
    if not graph:
        return
    owner = {}
    for i, s in enumerate(shards):
        for _, f in s["files"]:
            owner[f] = i
    for i, s in enumerate(shards):
        ext = set()
        for _, f in s["files"]:
            for dep in graph.get(f, []):
                if owner.get(dep, i) != i:
                    ext.add(dep)
        s["external_imports"] = sorted(ext)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-loc", type=int, default=2500)
    ap.add_argument("--files", default=".audit/files.txt")
    ap.add_argument("--graph", default=".audit/graph.json")
    ap.add_argument("--out", default=".audit/shards")
    a = ap.parse_args(argv)

    files = read_files(a.files)
    graph = None
    if os.path.exists(a.graph):
        with open(a.graph, encoding="utf-8") as fh:
            graph = json.load(fh)

    shards = build_shards(files, a.max_loc)
    coupling(shards, graph)

    os.makedirs(a.out, exist_ok=True)
    for name in os.listdir(a.out):
        if re.fullmatch(r"shard-\d{3}\.txt", name) or name == "manifest.json":
            os.remove(os.path.join(a.out, name))

    manifest = {
        "max_loc": a.max_loc,
        "total_files": len(files),
        "total_loc": sum(l for l, _ in files),
        "shard_count": len(shards),
        "shards": [],
    }
    for i, s in enumerate(shards, start=1):
        sid = f"shard-{i:03d}"
        with open(os.path.join(a.out, sid + ".txt"), "w", encoding="utf-8") as fh:
            fh.write(f"# {sid}  loc={s['loc']}  files={len(s['files'])}\n")
            fh.write(f"# groups: {', '.join(g or '(src root)' for g in s['groups'])}\n")
            for loc, f in s["files"]:
                fh.write(f"{loc}\tsrc/{f}\n")
        manifest["shards"].append(
            {
                "id": sid,
                "loc": s["loc"],
                "file_count": len(s["files"]),
                "groups": [g or "(src root)" for g in s["groups"]],
                "files": [f"src/{f}" for _, f in s["files"]],
                "external_imports": s.get("external_imports", []),
            }
        )
    with open(os.path.join(a.out, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")

    print(
        f"files={manifest['total_files']} loc={manifest['total_loc']} "
        f"shards={manifest['shard_count']} max_loc={a.max_loc}"
    )
    for s in manifest["shards"]:
        print(f"  {s['id']}  loc={s['loc']:>5}  files={s['file_count']:>3}  {', '.join(s['groups'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
