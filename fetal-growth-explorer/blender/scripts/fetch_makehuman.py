"""Fetch the MakeHuman assets the fetus body is built from (run once).

Downloads MPFB 2.0.17 from extensions.blender.org (hash-checked) and
extracts only what the pipeline reads: the hm08 base mesh, the baby macro
targets (ethnic and muscle/weight), the closed-eye expression units, the regional
shape targets (head, face, trunk, limbs), and the default
rig + skin weights. All of it is CC0 (MakeHuman assets, released 2020).

    python fetch_makehuman.py
"""

import hashlib
import io
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets" / "makehuman"
URL = (
    "https://extensions.blender.org/download/"
    "sha256:4f0a879d64a39bf646fbf5f53601ac678855da329d650617dca5737548239a87/add-on-mpfb-v2.0.17.zip"
    "?repository=%2Fapi%2Fv1%2Fextensions%2F&blender_version_min=4.2.0"
)
SHA256 = "4f0a879d64a39bf646fbf5f53601ac678855da329d650617dca5737548239a87"
SHAPE_DIRS = {
    "head", "neck", "torso", "stomach", "buttocks", "hip", "pelvis", "legs", "arms", "hands", "feet",
    "forehead", "chin", "cheek", "nose", "mouth", "ears", "eyes",
}
WANTED = (
    "data/3dobjs/base.obj",
    "data/rigs/standard/rig.default.json",
    "data/rigs/standard/weights.default.json",
)


def wanted(name: str) -> bool:
    if name in WANTED:
        return True
    parts = name.split("/")
    if len(parts) == 4 and parts[2] in SHAPE_DIRS and name.endswith(".target.gz"):
        return True
    if name.startswith("data/targets/macrodetails/") and ("-baby.target.gz" in name or "-baby-" in name):
        return True
    return name.startswith("data/targets/expression/units/") and name.endswith("-closure.target.gz")


def main():
    if (DEST / "targets" / "stomach" / "stomach-pregnant-incr.target.gz").exists():
        print(f"[fge] MakeHuman assets already in {DEST}")
        return
    print(f"[fge] downloading {URL}")
    req = urllib.request.Request(URL, headers={"User-Agent": "Blender/5.2 fge"})
    blob = urllib.request.urlopen(req).read()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != SHA256:
        raise SystemExit(f"hash mismatch: {digest}")
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        for name in zf.namelist():
            if wanted(name):
                out = DEST / name.removeprefix("data/")
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(zf.read(name))
    print(f"[fge] extracted to {DEST}")


if __name__ == "__main__":
    main()
