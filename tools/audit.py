#!/usr/bin/env python3
"""Read-only source inventory. Does not inspect browser/user saves or Firebase."""
import base64
import hashlib
import io
import json
import re
import struct
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


class Inventory(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.scripts, self.frames = [], [], []
        self.script = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'iframe':
            self.frames.append(attrs)
        if tag == 'script':
            self.script = {**attrs, 'source': ''}
            self.scripts.append(self.script)

    def handle_data(self, data):
        if self.script is not None:
            self.script['source'] += data

    def handle_endtag(self, tag):
        if tag == 'script':
            self.script = None


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inventory(path):
    data = path.read_bytes()
    source = data.decode('utf-8')
    parser = Inventory()
    parser.feed(source)
    functions = [{'name': m[1], 'line': source.count('\n', 0, m.start()) + 1}
                 for m in re.finditer(r'\bfunction\s+([\w$]+)\s*\(', source)]
    return {'file': str(path.relative_to(ROOT)), 'sha256': digest(data), 'bytes': len(data),
            'lines': len(source.splitlines()), 'ids': sorted(set(parser.ids)),
            'dynamicIds': sorted(set(re.findall(r'''\.id\s*=\s*['"]([^'"\n]+)['"]''', source))),
            'selectorIds': sorted(set(re.findall(r'''(?:getElementById\(|\$\()['"]([^'"\n]+)['"]''', source))),
            'functions': functions, 'frames': parser.frames,
            'scripts': [{**{k: v for k, v in script.items() if k != 'source'},
                         'bytes': len(script['source'].encode()),
                         'sha256': digest(script['source'].encode())} for script in parser.scripts],
            'storageLiterals': sorted(set(re.findall(r'''['"]((?:dos-mundos-|dm58-life-)[^'"\n]*)['"]''', source))),
            'firebasePaths': sorted(set(re.findall(r'''['"](dosMundos/[^'"\n]+)['"]''', source))),
            'externalOrigins': sorted(set(re.findall(r'https?://[a-zA-Z0-9.-]+', source))),
            'eventListeners': sorted(set(re.findall(r'''addEventListener\(['"]([^'"\n]+)['"]''', source))),
            'eventProperties': sorted(set(re.findall(r'\.(on[a-z]+)\s*=', source))),
            'dataImages': len(re.findall('data:image/', source))}


def main():
    report = {'method': 'Static inventory; dynamic expressions require the written audit.',
              'files': [inventory(ROOT / name) for name in
                        ['index.html', 'index2.9.html', 'index5.9.1.html', 'index6.0.1.html',
                         'index6.1.html', 'index6.2.html', 'index6.3.html']], 'assets': []}
    for path in sorted((ROOT / 'assets/sprites').glob('*.png')):
        data = path.read_bytes()
        w, h = struct.unpack('>II', data[16:24])
        report['assets'].append({'file': str(path.relative_to(ROOT)), 'width': w, 'height': h,
                                 'bytes': len(data), 'sha256': digest(data)})
    # Inline 5.1 images are lower-resolution variants; keep both sources intact.
    source = (ROOT / 'index6.3.html').read_text()
    match = re.search(r'const DM51_ART\s*=\s*(\{[^\n]+\})', source)
    report['embeddedCharacters'] = []
    for name, url in json.loads(match[1]).items():
        data = base64.b64decode(url.split(',', 1)[1])
        w, h = Image.open(io.BytesIO(data)).size
        report['embeddedCharacters'].append({'name': name, 'width': w, 'height': h, 'sha256': digest(data)})
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
