#!/usr/bin/env python3
"""Extract the existing, working 5.1 PNGs verbatim; do not redraw any character."""
import base64
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'index6.3.html'
match = re.search(r'const DM51_ART\s*=\s*(\{[^\n]+\})', source.read_text())
art = json.loads(match[1])
out = root / 'assets/characters'
out.mkdir(parents=True, exist_ok=True)
entries = []
for role in ['jc', 'gabi']:
    for face in ['down', 'up', 'left', 'right']:
        key = role + '_' + face
        data = base64.b64decode(art[key].split(',', 1)[1])
        (out / (key + '.png')).write_bytes(data)
        entries.append({'file': key + '.png', 'role': role, 'face': face,
                        'sourceKey': key, 'sha256': hashlib.sha256(data).hexdigest()})
(out / 'manifest.json').write_text(json.dumps({'source': 'index6.3.html / DM51_ART',
    'method': 'Verbatim base64 decoding of the original working sprites; no pixel edits.',
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'sprites': entries}, indent=2) + '\n')
print('Extracted eight original PNGs without changing a pixel.')
