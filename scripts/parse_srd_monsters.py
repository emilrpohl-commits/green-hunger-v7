import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from pypdf import PdfReader
except ImportError:
    print("Missing dependency: pypdf")
    print("Install it with: python3 -m pip install pypdf")
    sys.exit(1)


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u00a0", " ")
    text = text.replace("\u2013", "-")
    text = text.replace("\u2014", "-")
    text = text.replace("\u2212", "-")
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def extract_pdf_text(pdf_path: Path, start_page: int = 257, end_page: int = 343) -> str:
    reader = PdfReader(str(pdf_path))
    texts: List[str] = []

    for i in range(start_page, min(end_page + 1, len(reader.pages))):
        page = reader.pages[i]
        page_text = page.extract_text() or ""
        texts.append(page_text)

    return normalize_text("\n".join(texts))


# Updated for the actual extracted SRD layout
MONSTER_START_RE = re.compile(
    r"(?m)^"
    r"(?P<name>[A-Z][A-Za-z0-9'’\-\(\),\/ ]+)\n"
    r"(?:\1\n)?"
    r"(?P<size>Tiny|Small|Medium|Large|Huge|Gargantuan)\s+"
    r"(?P<type_alignment>[^\n]+)\n"
    r"AC\s+(?P<ac>[^\n]+?)\s+Initiative\s+(?P<initiative>[^\n]+)\n"
    r"HP\s+(?P<hp>[^\n]+)\n"
    r"Speed\s+(?P<speed>[^\n]+)\n"
)

ABILITY_BLOCK_RE = re.compile(
    r"Str\s+(?P<str_score>\d+)\s+(?P<str_mod>[+\-]\d+)\s+(?P<str_save>[+\-]\d+)\s+"
    r"Dex\s+(?P<dex_score>\d+)\s+(?P<dex_mod>[+\-]\d+)\s+(?P<dex_save>[+\-]\d+)\s+"
    r"Con\s+(?P<con_score>\d+)\s+(?P<con_mod>[+\-]\d+)\s+(?P<con_save>[+\-]\d+)\s+"
    r"Int\s+(?P<int_score>\d+)\s+(?P<int_mod>[+\-]\d+)\s+(?P<int_save>[+\-]\d+)\s+"
    r"WIS\s+(?P<wis_score>\d+)\s+(?P<wis_mod>[+\-]\d+)\s+(?P<wis_save>[+\-]\d+)\s+"
    r"Cha\s+(?P<cha_score>\d+)\s+(?P<cha_mod>[+\-]\d+)\s+(?P<cha_save>[+\-]\d+)",
    re.DOTALL,
)

SECTION_HEADER_RE = re.compile(
    r"(?m)^(Skills|Senses|Languages|CR|Vulnerabilities|Resistances|Immunities|Gear|Traits|Actions|Bonus Actions|Reactions|Legendary Actions|Lair Actions|Habitat|Treasure)\s*$"
)

TITLE_ENTRY_RE = re.compile(
    r"(?ms)(?P<title>[A-Z][A-Za-z0-9'’\-\(\)\/, ]+)\.\s+(?P<body>.*?)(?=(?:\n[A-Z][A-Za-z0-9'’\-\(\)\/, ]+\.\s)|\Z)"
)


def split_monster_blocks(text: str) -> List[str]:
    matches = list(MONSTER_START_RE.finditer(text))
    blocks: List[str] = []

    for idx, match in enumerate(matches):
        start = match.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        blocks.append(text[start:end].strip())

    return blocks


def parse_type_alignment(raw: str) -> Dict[str, Optional[str]]:
    parts = [p.strip() for p in raw.split(",", 1)]
    creature_type = parts[0] if parts else None
    alignment = parts[1] if len(parts) > 1 else None
    return {
        "creatureType": creature_type,
        "alignment": alignment,
        "raw": raw
    }


def parse_hp(raw: str) -> Dict[str, Optional[str]]:
    m = re.match(r"(?P<avg>\d+)\s+\((?P<formula>[^)]+)\)", raw)
    if m:
        return {
            "average": int(m.group("avg")),
            "formula": m.group("formula")
        }
    return {"average": None, "formula": raw}


def parse_initiative(raw: str) -> Dict[str, Optional[int]]:
    m = re.match(r"(?P<mod>[+\-]\d+)(?:\s+\((?P<score>\d+)\))?", raw)
    if m:
        return {
            "modifier": int(m.group("mod")),
            "score": int(m.group("score")) if m.group("score") else None
        }
    return {
        "modifier": None,
        "score": None,
        "raw": raw
    }


def parse_speed(raw: str) -> Dict[str, str]:
    speeds: Dict[str, str] = {}
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if " " in part:
            first, rest = part.split(" ", 1)
            if first.isdigit():
                speeds["walk"] = part
            else:
                speeds[first.lower()] = rest.strip()
        else:
            speeds["walk"] = part
    return speeds


def parse_abilities(block: str) -> Optional[Dict[str, Dict[str, int]]]:
    # The sample shows MOD SAVE MOD SAVE MOD SAVE on a line before abilities.
    # We strip that harmlessly by just searching after it.
    block = block.replace("MOD SAVE MOD SAVE MOD SAVE", "")
    m = ABILITY_BLOCK_RE.search(block)
    if not m:
        return None

    abilities: Dict[str, Dict[str, int]] = {}
    for key in ["str", "dex", "con", "int", "wis", "cha"]:
        abilities[key] = {
            "score": int(m.group(f"{key}_score")),
            "mod": int(m.group(f"{key}_mod")),
            "save": int(m.group(f"{key}_save"))
        }
    return abilities


def split_labeled_sections(block: str) -> Dict[str, str]:
    sections: Dict[str, str] = {}
    matches = list(SECTION_HEADER_RE.finditer(block))

    if not matches:
        return sections

    for idx, match in enumerate(matches):
        label = match.group(1)
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(block)
        sections[label] = block[start:end].strip()

    return sections


def parse_comma_list(raw: str) -> List[str]:
    if not raw:
        return []
    # split on commas or semicolons, because the sample uses semicolons too
    parts = re.split(r"[;,]", raw)
    return [item.strip() for item in parts if item.strip()]


def parse_skills(raw: str) -> Dict[str, int]:
    skills: Dict[str, int] = {}
    if not raw:
        return skills

    for part in raw.split(","):
        part = part.strip()
        m = re.match(r"(.+?)\s+([+\-]\d+)$", part)
        if m:
            skills[m.group(1).strip()] = int(m.group(2))
    return skills


def parse_cr(raw: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {"raw": raw}
    if not raw:
        return result

    m = re.match(r"(?P<cr>[\d/]+)\s+\((?P<inside>[^)]+)\)", raw)
    if not m:
        return result

    result["cr"] = m.group("cr")
    inside = m.group("inside")

    xp_m = re.search(r"XP\s*([\d,]+)|([\d,]+)\s*XP", inside)
    if xp_m:
        xp_value = xp_m.group(1) or xp_m.group(2)
        result["xp"] = int(xp_value.replace(",", ""))

    pb_m = re.search(r"PB\s*([+\-]?\d+)", inside)
    if pb_m:
        result["pb"] = int(pb_m.group(1))

    return result


def parse_passive_perception(senses_raw: str) -> Optional[int]:
    m = re.search(r"Passive Perception\s+(\d+)", senses_raw, re.IGNORECASE)
    return int(m.group(1)) if m else None


def parse_special_senses(senses_raw: str) -> Dict[str, str]:
    senses: Dict[str, str] = {}
    if not senses_raw:
        return senses

    for part in re.split(r"[;,]", senses_raw):
        part = part.strip()
        if not part:
            continue
        if re.search(r"Passive Perception", part, re.IGNORECASE):
            continue

        m = re.match(r"([A-Za-z ]+)\s+(.+)", part)
        if m:
            key = slugify(m.group(1)).replace("-", "")
            senses[key] = m.group(2).strip()
        else:
            senses[slugify(part)] = part

    return senses


def parse_languages_and_telepathy(raw: str) -> Dict[str, Any]:
    result = {
        "languages": [],
        "telepathy": None,
        "raw": raw or None
    }
    if not raw:
        return result

    parts = re.split(r"[;,]", raw)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if part.lower().startswith("telepathy"):
            result["telepathy"] = part
        else:
            result["languages"].append(part)

    return result


def parse_titled_entries(raw: str) -> List[Dict[str, str]]:
    if not raw:
        return []

    raw = raw.strip()
    entries: List[Dict[str, str]] = []

    for m in TITLE_ENTRY_RE.finditer(raw):
        title = m.group("title").strip()
        body = m.group("body").strip().replace("\n", " ")
        body = re.sub(r"\s{2,}", " ", body)
        entries.append({
            "name": title,
            "description": body
        })

    if entries:
        return entries

    return [{
        "name": "Unparsed Section",
        "description": raw.replace("\n", " ")
    }]


def parse_monster_block(block: str) -> Optional[Dict[str, Any]]:
    header = MONSTER_START_RE.search(block)
    if not header:
        return None

    name = header.group("name").strip()
    size = header.group("size").strip()
    type_alignment = parse_type_alignment(header.group("type_alignment").strip())
    ac = header.group("ac").strip()
    initiative = parse_initiative(header.group("initiative").strip())
    hp = parse_hp(header.group("hp").strip())
    speed = parse_speed(header.group("speed").strip())

    remainder = block[header.end():].strip()
    abilities = parse_abilities(remainder)
    sections = split_labeled_sections(remainder)

    skills_raw = sections.get("Skills", "")
    senses_raw = sections.get("Senses", "")
    languages_raw = sections.get("Languages", "")
    cr_raw = sections.get("CR", "")

    lang_info = parse_languages_and_telepathy(languages_raw)
    cr_info = parse_cr(cr_raw)

    monster = {
        "id": slugify(name),
        "name": name,
        "size": size,
        "type": type_alignment["creatureType"],
        "alignment": type_alignment["alignment"],
        "typeAlignmentRaw": type_alignment["raw"],
        "ac": ac,
        "initiative": initiative,
        "hp": hp,
        "speed": speed,
        "abilities": abilities,
        "skills": parse_skills(skills_raw),
        "senses": {
            "special": parse_special_senses(senses_raw),
            "passivePerception": parse_passive_perception(senses_raw),
            "raw": senses_raw or None
        },
        "languages": lang_info["languages"],
        "telepathy": lang_info["telepathy"],
        "cr": cr_info.get("cr"),
        "xp": cr_info.get("xp"),
        "pb": cr_info.get("pb"),
        "vulnerabilities": parse_comma_list(sections.get("Vulnerabilities", "")),
        "resistances": parse_comma_list(sections.get("Resistances", "")),
        "immunities": parse_comma_list(sections.get("Immunities", "")),
        "gear": parse_comma_list(sections.get("Gear", "")),
        "traits": parse_titled_entries(sections.get("Traits", "")),
        "actions": parse_titled_entries(sections.get("Actions", "")),
        "bonusActions": parse_titled_entries(sections.get("Bonus Actions", "")),
        "reactions": parse_titled_entries(sections.get("Reactions", "")),
        "legendaryActions": parse_titled_entries(sections.get("Legendary Actions", "")),
        "lairActions": parse_titled_entries(sections.get("Lair Actions", "")),
        "habitat": parse_comma_list(sections.get("Habitat", "")),
        "treasure": parse_comma_list(sections.get("Treasure", "")),
        "source": "SRD 5.2.1",
        "rawBlock": block
    }

    return monster


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage:")
        print("python3 scripts/parse_srd_monsters.py /path/to/SRD_CC_v5.2.1.pdf /path/to/output.json")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}")
        sys.exit(1)

    print(f"Reading PDF: {pdf_path}")
    raw_text = extract_pdf_text(pdf_path)

    print("----- START OF EXTRACTED TEXT SAMPLE -----")
    print(raw_text[:5000])
    print("----- END OF EXTRACTED TEXT SAMPLE -----")

    debug_path = output_path.parent / "monsters-debug-sample.txt"
    debug_path.parent.mkdir(parents=True, exist_ok=True)
    debug_path.write_text(raw_text[:20000], encoding="utf-8")
    print(f"Wrote debug sample to: {debug_path}")

    print("Splitting monster blocks...")
    blocks = split_monster_blocks(raw_text)
    print(f"Found {len(blocks)} candidate monster blocks")

    monsters: List[Dict[str, Any]] = []
    failures: List[Dict[str, Any]] = []

    for idx, block in enumerate(blocks, start=1):
        parsed = parse_monster_block(block)
        if parsed:
            monsters.append(parsed)
        else:
            failures.append({
                "index": idx,
                "preview": block[:500]
            })

    output = {
        "meta": {
            "source": "SRD 5.2.1",
            "version": "5.2.1",
            "license": "CC-BY-4.0",
            "requiredAttribution": "This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License."
        },
        "monsters": monsters,
        "parseReport": {
            "monsterCount": len(monsters),
            "failureCount": len(failures),
            "failures": failures[:25]
        }
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(monsters)} monsters to: {output_path}")
    print(f"Failures: {len(failures)}")


if __name__ == "__main__":
    main()