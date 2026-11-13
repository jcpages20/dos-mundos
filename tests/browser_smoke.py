#!/usr/bin/env python3
"""Local Chromium tests. All external traffic is blocked; no real saves or Firebase."""
import functools
import json
import os
from pathlib import Path
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(os.environ.get('DM_ARTIFACTS', '/tmp/dos-mundos-test-artifacts'))
PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT.parent)))
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'
        cls.base = cls.origin + '/' + ROOT.name + '/'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'),
                                            args=['--no-sandbox', '--disable-dev-shm-usage'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        self.remote = []
        def route(request):
            if request.request.url.startswith(self.origin + '/'):
                request.continue_()
            else:
                self.remote.append(request.request.url)
                request.abort()
        self.context.route('**/*', route)
        self.page = self.context.new_page()
        self.page.set_default_timeout(8000)
        self.errors = []
        self.page.on('pageerror', lambda err: self.errors.append(str(err)))

    def tearDown(self):
        self.context.close()

    def tool(self):
        self.page.goto(self.base + 'tools/partidas.html')
        expect(self.page.locator('#export-current')).to_be_enabled()

    def js(self, code, arg=None):
        return self.page.evaluate('''async ([base, code, arg]) => {
            const vault = await import(base + 'src/persistence/save-vault.mjs');
            const format = await import(base + 'src/persistence/save-format.mjs');
            return await new Function('vault', 'format', 'arg', 'return (async () => {' + code + '})()')(vault, format, arg);
        }''', [self.base, code, arg])

    def seed(self):
        self.tool()
        values = {
            'dos-mundos-v29': '{ "name":"JC", "money":753, "inventory":["libro"], "future":{"keep":true} }',
            'dos-mundos-v071': '{legacy sin normalizar',
            'dos-mundos-40-hogar:JC': '{"scheme":"sage","items":[{"id":"plant","x":65,"y":180}]}',
            'dos-mundos-55-progreso:JC:jc': '{"pantry":{"rice":4},"skills":{"cooking":7}}',
            'dos-mundos-61-duo-v1': '{"furniture":["sofa","table","plant"],"invites":[],"memories":[],"updatedAt":42}',
            'dm58-life-jc-JC': '{"garden":[{"planted":1}],"harvests":3}',
        }
        self.page.evaluate('values => { for (const [k,v] of Object.entries(values)) localStorage.setItem(k,v); localStorage.setItem("carta-unrelated", "keep"); }', values)
        self.js('''await new Promise((resolve,reject)=>{
            const req=indexedDB.open('dos-mundos-private-museum',1);
            req.onsuccess=()=>{const db=req.result,tx=db.transaction('photos','readwrite');
                tx.objectStore('photos').put({id:'test-photo',who:'JC',title:'Prueba sintética',src:arg});
                tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};
        });''', PNG)
        return values

    def test_export_restore_real_storage_and_museum(self):
        values = self.seed()
        text = self.js('return await vault.exportCurrent();')
        self.assertEqual(json.loads(text)['data']['local'], values)
        self.assertEqual(len(json.loads(text)['data']['photos']), 1)
        self.page.evaluate('''() => {localStorage.setItem('dos-mundos-v29','changed');
            localStorage.setItem('dos-mundos-new-field','keep new progress');}''')
        self.js('''await new Promise(resolve=>{const r=indexedDB.open('dos-mundos-private-museum',1);
            r.onsuccess=()=>{const db=r.result,t=db.transaction('photos','readwrite');t.objectStore('photos').clear();t.oncomplete=()=>{db.close();resolve()}}});''')
        result = self.js('''const preview=await vault.previewImport(arg);
            const conflicts=preview.conflicts;
            await vault.restoreImport(preview);
            return {conflicts,data:await vault.capture(),snapshots:await vault.listSnapshots()};''', text)
        self.assertEqual(result['conflicts'], ['dos-mundos-v29'])
        for key, value in values.items(): self.assertEqual(result['data']['local'][key], value)
        self.assertEqual(result['data']['local']['dos-mundos-new-field'], 'keep new progress')
        self.assertEqual(result['data']['photos'][0]['src'], PNG)
        self.assertTrue(any(r['reason'] == 'before-restore' for r in result['snapshots']))
        self.assertEqual(self.page.evaluate('localStorage.getItem("carta-unrelated")'), 'keep')
        self.assertEqual(self.remote, [])
        self.assertEqual(self.errors, [])

    def test_reject_corruption_and_concurrent_change(self):
        self.seed()
        result = self.js('''const text=await vault.exportCurrent();
            const corrupt=JSON.parse(text);corrupt.data.local['dos-mundos-v29']='tampered';
            let damaged=false,stale=false;
            try{await vault.previewImport(JSON.stringify(corrupt))}catch{damaged=true}
            const preview=await vault.previewImport(text);
            localStorage.setItem('dos-mundos-v29','live change');
            try{await vault.restoreImport(preview)}catch{stale=true}
            return {damaged,stale,value:localStorage.getItem('dos-mundos-v29')};''')
        self.assertEqual(result, {'damaged': True, 'stale': True, 'value': 'live change'})

    def test_restore_failure_rolls_back_both_stores(self):
        self.seed()
        result = self.js('''const before=await vault.capture();
            const data=structuredClone(before);data.local['dos-mundos-v29']='force-quota';data.photos[0].title='changed';
            const preview=await vault.previewImport(JSON.stringify(await format.pack(data)));
            const original=Storage.prototype.setItem;
            Storage.prototype.setItem=function(k,v){if(v==='force-quota')throw new DOMException('full','QuotaExceededError');return original.call(this,k,v)};
            let failed=false;
            try{await vault.restoreImport(preview)}catch{failed=true}
            finally{Storage.prototype.setItem=original}
            return {failed,equal:await format.fingerprint(before)===await format.fingerprint(await vault.capture())};''')
        self.assertEqual(result, {'failed': True, 'equal': True})

    def test_vault_unavailable_does_not_touch_progress(self):
        self.seed()
        result = self.js('''const before=await vault.capture();
            const backup=await format.pack({...before,local:{...before.local,'dos-mundos-v29':'new'}});
            const preview=await vault.previewImport(JSON.stringify(backup));
            const open=indexedDB.open.bind(indexedDB);
            indexedDB.open=function(name,...args){if(name==='dos-mundos-save-vault-v1')throw new Error('vault full');return open(name,...args)};
            let failed=false,exported=false;try{await vault.restoreImport(preview)}catch{failed=true}
            try{exported=(await format.unpack(await vault.exportCurrent())).checksum===await format.fingerprint(before)}finally{indexedDB.open=open}
            return {failed,exported,equal:await format.fingerprint(before)===await format.fingerprint(await vault.capture())};''')
        self.assertEqual(result, {'failed': True, 'exported': True, 'equal': True})

    def test_mobile_backup_download_and_restore_ui(self):
        self.seed()
        self.page.reload()
        expect(self.page.locator('#export-current')).to_be_enabled()
        with self.page.expect_download() as info: self.page.locator('#export-current').click()
        download = info.value
        text = Path(download.path()).read_text()
        self.page.evaluate('localStorage.setItem("dos-mundos-v29","changed")')
        self.page.locator('#import-file').set_input_files({'name': 'test.json', 'mimeType': 'application/json', 'buffer': text.encode()})
        expect(self.page.locator('#import-preview')).to_be_visible()
        expect(self.page.locator('#restore-backup')).to_be_disabled()
        self.page.screenshot(path=str(ARTIFACTS / 'iphone-copias.png'), full_page=True)
        self.page.locator('#closed-games').check()
        self.page.locator('#restore-backup').click()
        expect(self.page.locator('#vault-status')).to_contain_text('Progreso recuperado')
        self.assertIn('753', self.page.evaluate('localStorage.getItem("dos-mundos-v29")'))
        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        self.assertEqual(self.errors, [])

    def test_development_snapshot_precedes_role_and_normalization(self):
        values = self.seed()
        self.page.goto(self.base + 'desarrollo.html?gabi=1')
        expect(self.page.locator('#development-game')).to_be_visible()
        expect(self.page.locator('#development-game')).to_have_attribute('src', self.base + 'index6.3.html?gabi=1')
        outer = self.page.frame_locator('#development-game')
        expect(outer.locator('#dm60-gate')).to_be_visible()
        snapshots = self.js('return await vault.listSnapshots();')
        self.assertTrue(any(r['envelope']['data']['local'] == values for r in snapshots))
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-v51-role")'), 'gabi')
        expect(outer.locator('#dm60-fallback')).to_be_visible()
        outer.locator('#dm60-envelope').click()
        outer.locator('#dm60-close-note').click()
        expect(outer.locator('#dm60-night')).to_be_visible()
        expect(outer.locator('#dm60-enter')).to_be_visible()
        self.page.screenshot(path=str(ARTIFACTS / 'iphone-estrella-fallback.png'))
        outer.locator('#dm60-enter').click()
        expect(outer.frame_locator('#dm-frame').locator('#game')).to_be_visible()
        self.assertEqual(self.errors, [])

    def test_existing_game_and_version_63_load_old_saves(self):
        # Real releases use the same v29 key; v28 exercises their fallback loader.
        for version, key in [('index.html', 'dos-mundos-v29'), ('index5.9.1.html', 'dos-mundos-v28'),
                             ('index6.0.1.html', 'dos-mundos-v29'), ('index6.3.html', 'dos-mundos-v29')]:
            with self.subTest(version=version):
                self.page.goto(self.base + 'tools/partidas.html')
                self.page.evaluate('localStorage.clear()')  # isolated synthetic test context ONLY
                self.page.evaluate('''([key])=>{localStorage.setItem('dos-mundos-v51-role','jc');
                    localStorage.setItem(key,JSON.stringify({name:'JC QA',money:753,day:38,time:555,
                    inventory:['libro'],skills:{cooking:7},district:'Ciudad Lineal',home:'Estudio propio',worldExpanded:true,x:144,y:252}))}''', [key])
                self.page.goto(self.base + version)
                game = self.page.frame_locator('#juego' if version == 'index.html' else '#dm-frame')
                expect(game.locator('#game')).to_be_visible()
                expect(game.locator('#money')).to_have_text('753 €')
                game.locator('#goHome').click()
                expect(game.locator('#interior')).to_be_visible()
                game.locator('#exitTop').click()
                expect(game.locator('#world')).to_be_visible()
                saved = self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29"))')
                self.assertEqual(saved['money'], 753)
                self.assertEqual(saved['inventory'], ['libro'])
                self.assertEqual(saved['skills']['cooking'], 7)
        self.assertEqual(self.errors, [])

    def test_development_desktop_and_mobile_layout(self):
        for width, height in [(390, 844), (375, 667), (844, 390), (1440, 900)]:
            self.page.set_viewport_size({'width': width, 'height': height})
            self.page.goto(self.base + 'desarrollo.html')
            expect(self.page.locator('#development-game')).to_be_visible()
            outer = self.page.frame_locator('#development-game')
            if width == 390:
                expect(outer.locator('[data-dm60-role="jc"]')).to_be_visible()
                outer.locator('[data-dm60-role="jc"]').click()
            game = outer.frame_locator('#dm-frame')
            game.locator('#setup').wait_for(state='attached')
            if game.locator('#setup').is_visible():
                game.locator('#name').fill('JC QA')
                game.locator('#start').click()
            expect(game.locator('#game')).to_be_visible()
            game.locator('body').evaluate('() => scrollTo(0, 0)')
            self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
            self.page.screenshot(path=str(ARTIFACTS / f'desarrollo-{width}x{height}.png'))
        self.assertEqual(self.errors, [])

    def test_original_letter_and_shooting_star(self):
        carta = Path(os.environ.get('CARTA_SOURCE', ROOT.parent / 'Carta/index.html'))
        if not carta.is_file(): self.skipTest('Optional Carta checkout missing; fallback tested separately')
        self.context.route('https://raw.githubusercontent.com/jcpages20/Carta/main/index.html',
                           lambda route: route.fulfill(path=str(carta), content_type='text/html'))
        self.page.goto(self.base + 'desarrollo.html?gabi=1')
        outer = self.page.frame_locator('#development-game')
        letter = outer.frame_locator('#dm60-letter')
        letter.locator('#envelope').click()
        letter.locator('#continue').click()
        expect(letter.locator('#shooting')).to_have_class('shooting go')
        expect(letter.locator('#end')).to_have_class('end show')
        self.page.screenshot(path=str(ARTIFACTS / 'iphone-carta-original.png'))
        expect(outer.locator('#dm60-enter')).to_be_visible()
        outer.locator('#dm60-enter').click()
        expect(outer.locator('#dm60-gate')).not_to_be_visible()
        # Known upstream defect: location.origin is "null" inside the original
        # letter's srcdoc. The existing observer still completes the prologue.
        self.assertEqual(self.errors, ["Failed to execute 'postMessage' on 'Window': Invalid target origin 'null' in a call to 'postMessage'."])

    def test_development_requires_choice_when_backup_fails(self):
        self.tool()
        self.context.add_init_script('''const open=indexedDB.open.bind(indexedDB);
            indexedDB.open=function(name,...args){if(name==='dos-mundos-save-vault-v1')throw new Error('Simulated unavailable vault');return open(name,...args)};''')
        self.page.goto(self.base + 'desarrollo.html')
        expect(self.page.locator('#continue-without-backup')).to_be_visible()
        expect(self.page.locator('#development-game')).to_be_hidden()
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-v51-role")'), None)
        self.page.locator('#continue-without-backup').click()
        expect(self.page.locator('#development-game')).to_be_visible()


if __name__ == '__main__':
    unittest.main(verbosity=2)
