#!/usr/bin/env python3
"""House integration and original regressions, isolated saves and no Firebase."""
import json
from pathlib import Path
import unittest

import browser_smoke as support
from playwright.sync_api import expect


class HouseTests(support.BrowserTests):
    def open_house(self, role='jc'):
        self.tool()
        values = {
            'dos-mundos-v51-role': role,
            'dos-mundos-v60-prologue-seen-gabi': 'yes',
            'dos-mundos-v29': json.dumps({'name': 'JC QA' if role == 'jc' else 'Gabi QA',
                'money': 753, 'energy': 42, 'hygiene': 30, 'day': 2, 'time': 600,
                'inventory': ['libro'], 'skills': {'estudio': 12}, 'worldExpanded': True, 'x': 144, 'y': 252}),
            'dos-mundos-40-hogar:JC%20QA': '{"scheme":"sage","items":[{"id":"plant","x":65,"y":180}]}',
            'dos-mundos-61-duo-v1': '{"furniture":["sofa","table","plant"],"invites":[],"memories":[],"updatedAt":42}',
        }
        self.page.evaluate('values=>{for(const [k,v] of Object.entries(values))localStorage.setItem(k,v)}', values)
        self.page.goto(self.base + 'casa-rpg.html')
        game = self.page.frame_locator('#dm-frame')
        expect(game.locator('#game')).to_be_visible()
        game.locator('#goHome').click()
        expect(game.locator('#dm-house-scene')).to_be_visible()
        frame = self.page.locator('#dm-frame').element_handle().content_frame()
        frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready', timeout=20000)
        return game, frame, values

    def scene(self, frame):
        return frame.evaluate('window.DosMundosHouse.getSnapshot()')

    def plan_click(self, game, frame, x, y):
        plan = game.get_by_role('button', name='Plano', exact=True)
        if plan.count(): plan.click()
        frame.wait_for_timeout(80)
        canvas = game.locator('#dm-house-canvas')
        box = canvas.bounding_box()
        size = canvas.evaluate('el=>({w:el.width,h:el.height})')
        scale = min(size['w'] / 768, size['h'] / 560)
        cx = ((size['w'] - 768 * scale) / 2 + x * scale) * box['width'] / size['w']
        cy = ((size['h'] - 560 * scale) / 2 + y * scale) * box['height'] / size['h']
        self.page.mouse.click(box['x'] + cx, box['y'] + cy)

    def reach_object(self, game, frame, object_id, x, y):
        self.plan_click(game, frame, x, y)
        frame.wait_for_function('id=>{const s=window.DosMundosHouse.getSnapshot();return s?.target===id&&!s.walking}',
                                arg=object_id, timeout=15000)

    def test_house_enter_exit_preserves_city_inventory_and_old_homes(self):
        game, frame, values = self.open_house()
        origin = self.scene(frame)['origin']
        self.assertEqual(self.scene(frame)['role'], 'jc')
        self.assertEqual(self.scene(frame)['room'], 'living')
        expect(game.locator('.dm-house-primary')).to_have_text('Salir a Madrid')
        game.locator('.dm-house-primary').click()
        expect(game.locator('#world')).to_be_visible()
        after = frame.evaluate('window.DosMundosLegacy.snapshot()')
        self.assertEqual((after['x'], after['y']), (origin['x'], origin['y']))
        saved = self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29"))')
        self.assertEqual(saved['money'], 753)
        self.assertEqual(saved['inventory'], ['libro'])
        for key in ['dos-mundos-40-hogar:JC%20QA', 'dos-mundos-61-duo-v1']:
            self.assertEqual(self.page.evaluate('key=>localStorage.getItem(key)', key), values[key])
        game.locator('#enter').click()
        expect(game.locator('#dm-house-scene')).to_be_visible()
        self.assertEqual(self.errors, [])

    def test_walking_out_of_front_door_does_not_immediately_eject_on_reentry(self):
        game, frame, values = self.open_house()
        self.page.keyboard.down('ArrowDown')
        expect(game.locator('#world')).to_be_visible()
        self.page.keyboard.up('ArrowDown')
        key = 'dos-mundos-casa-rpg-v1:jc:JC%20QA'
        print('House position after walking out:', self.page.evaluate('key=>JSON.parse(localStorage.getItem(key)).position', key))
        game.locator('#dm-city-actions > summary').click()
        game.locator('#dm61-open').click()
        frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready', timeout=8000)
        frame.wait_for_timeout(350)
        expect(game.locator('#dm-house-scene')).to_be_visible()
        self.assertEqual(frame.evaluate('window.DosMundosLegacy.room'), 'home')
        self.assertEqual(self.scene(frame)['position'], {'x': 352, 'y': 508})
        saved = self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29"))')
        self.assertEqual(saved['money'], 753)
        self.assertEqual(saved['inventory'], ['libro'])
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'), values['dos-mundos-61-duo-v1'])
        self.assertEqual(self.errors, [])

    def test_existing_doorway_saves_recover_for_both_roles_and_all_home_entries(self):
        for role in ['jc', 'gabi']:
            game, frame, _ = self.open_house(role)
            game.locator('.dm-house-primary').click()
            name = 'JC QA' if role == 'jc' else 'Gabi QA'
            key = 'dos-mundos-casa-rpg-v1:' + role + ':' + name.replace(' ', '%20')
            for entry in ['door', 'quick', 'shared']:
                self.page.evaluate('''key=>localStorage.setItem(key,JSON.stringify({version:1,
                    position:{x:352,y:532,face:'down'},tvOn:true,lightsOn:false,updated:42}))''', key)
                if entry == 'door': game.locator('#enter').click()
                elif entry == 'quick': game.locator('#goHome').click()
                else:
                    game.locator('#dm-city-actions > summary').click()
                    game.locator('#dm61-open').click()
                frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready', timeout=8000)
                frame.wait_for_timeout(350)
                expect(game.locator('#dm-house-scene')).to_be_visible()
                self.assertEqual(self.scene(frame)['role'], role)
                self.assertEqual(self.scene(frame)['position'], {'x': 352, 'y': 508})
                self.assertTrue(self.scene(frame)['tvOn'])
                game.locator('.dm-house-primary').click()
                saved = self.page.evaluate('key=>JSON.parse(localStorage.getItem(key))', key)
                self.assertEqual(saved['position'], {'x':352, 'y':508, 'face':'up'})
                self.assertTrue(saved['tvOn'])
                self.assertFalse(saved['lightsOn'])
        self.assertEqual(self.errors, [])

    def test_walk_four_rooms_and_furniture_collision(self):
        game, frame, _ = self.open_house()
        for room, x, y in [('kitchen', 660, 430), ('bathroom', 588, 176), ('bedroom', 242, 184), ('living', 240, 444)]:
            self.plan_click(game, frame, x, y)
            try:
                frame.wait_for_function('room=>{const s=window.DosMundosHouse.getSnapshot();return s?.room===room&&!s.walking}',
                                        arg=room, timeout=15000)
            except Exception:
                print('Unreached room:', room, self.scene(frame), game.locator('.dm-house-message').inner_text())
                self.page.screenshot(path=str(support.ARTIFACTS / 'casa-path-failure.png'))
                raise
        self.reach_object(game, frame, 'sofa', 180, 365)
        self.page.keyboard.down('ArrowUp')
        frame.wait_for_timeout(650)
        self.page.keyboard.up('ArrowUp')
        self.assertGreaterEqual(self.scene(frame)['position']['y'], 420)
        self.assertEqual(self.errors, [])

    def test_original_gabi_sits_and_stands_without_changing_roles(self):
        game, frame, _ = self.open_house('gabi')
        self.assertEqual(self.scene(frame)['role'], 'gabi')
        self.reach_object(game, frame, 'sofa', 180, 365)
        game.get_by_role('button', name='Sentarse', exact=True).click()
        frame.wait_for_function('window.DosMundosHouse.getSnapshot().pose==="sit"')
        game.get_by_role('button', name='Levantarse', exact=True).click()
        self.assertEqual(self.scene(frame)['pose'], 'stand')
        self.assertEqual(self.scene(frame)['role'], 'gabi')
        self.page.screenshot(path=str(support.ARTIFACTS / 'casa-gabi.png'))

    def test_bed_shower_and_reading_use_existing_progress(self):
        game, frame, _ = self.open_house()
        self.reach_object(game, frame, 'bed', 136, 130)
        before = frame.evaluate('window.DosMundosLegacy.snapshot()')
        game.get_by_role('button', name='Dormir', exact=True).click()
        self.assertEqual(self.scene(frame)['pose'], 'sleep')
        self.assertGreater(frame.evaluate('window.DosMundosLegacy.snapshot().energy'), before['energy'])
        game.get_by_role('button', name='Despertarse', exact=True).click()
        self.reach_object(game, frame, 'shower', 464, 115)
        hygiene = frame.evaluate('window.DosMundosLegacy.snapshot().hygiene')
        game.get_by_role('button', name='Ducharse', exact=True).click()
        self.assertGreater(frame.evaluate('window.DosMundosLegacy.snapshot().hygiene'), hygiene)
        game.get_by_role('button', name='Levantarse', exact=True).click()
        self.reach_object(game, frame, 'books', 56, 350)
        game.get_by_role('button', name='Leer', exact=True).click()
        skill = self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29")).skills.estudio')
        self.assertGreater(skill, 12)
        self.assertEqual(self.errors, [])

    def test_recipe_menu_and_legacy_home_remain_available(self):
        game, frame, _ = self.open_house()
        game.get_by_role('button', name='Menú', exact=True).click()
        game.get_by_role('button', name='Recetas y cocina', exact=True).click()
        expect(game.locator('#dm55-overlay')).to_be_visible()
        expect(game.locator('#dm55-overlay')).to_contain_text('Recetario')
        game.locator('#dm55-overlay').get_by_role('button', name='Cerrar', exact=True).click()
        game.get_by_role('button', name='Menú', exact=True).click()
        game.get_by_role('button', name='Actividades de la casa anterior', exact=True).click()
        expect(game.locator('#dm-house-scene')).to_be_hidden()
        expect(game.locator('#roomCanvas')).to_be_visible()
        game.get_by_role('button', name='Volver al escenario de la casa', exact=True).click()
        expect(game.locator('#dm-house-scene')).to_be_visible()
        self.assertEqual(self.errors, [])

    def test_house_mobile_controls_and_atlas_visible(self):
        game, frame, _ = self.open_house()
        for width, height in [(390, 844), (375, 667), (844, 390), (1440, 1000)]:
            self.page.set_viewport_size({'width': width, 'height': height})
            frame.wait_for_timeout(100)
            self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            self.assertFalse(game.locator('#dm42-phone-btn').is_visible())
            self.assertFalse(game.locator('#dm40-home-btn').is_visible())
            self.assertFalse(game.locator('#dm41-online-button').is_visible())
            for label in ['Caminar arriba', 'Caminar abajo', 'Caminar izquierda', 'Caminar derecha']:
                box = game.get_by_role('button', name=label, exact=True).bounding_box()
                self.assertGreaterEqual(box['width'], 44)
                self.assertGreaterEqual(box['height'], 44)
            self.page.screenshot(path=str(support.ARTIFACTS / f'casa-{width}x{height}.png'))
        game.get_by_role('button', name='Plano', exact=True).click()
        self.page.screenshot(path=str(support.ARTIFACTS / 'casa-plano.png'))
        self.assertEqual(self.errors, [])

    def test_house_snapshot_and_position_reload_preserve_old_data(self):
        game, frame, values = self.open_house()
        records = self.js('return await vault.listSnapshots();')
        self.assertTrue(any(record['envelope']['data']['local'] == values for record in records))
        self.plan_click(game, frame, 300, 444)
        frame.wait_for_function('!window.DosMundosHouse.getSnapshot().walking', timeout=12000)
        before = self.scene(frame)['position']
        game.get_by_role('button', name='Menú', exact=True).click()
        game.get_by_role('button', name='Salir a Madrid', exact=True).click()
        expect(game.locator('#world')).to_be_visible()
        game.locator('#enter').click()
        frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready', timeout=15000)
        after = self.scene(frame)['position']
        self.assertAlmostEqual(before['x'], after['x'], delta=2)
        self.assertAlmostEqual(before['y'], after['y'], delta=2)
        self.assertTrue(self.page.evaluate('!!localStorage.getItem("dos-mundos-casa-rpg-v1:jc:JC%20QA")'))
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'), values['dos-mundos-61-duo-v1'])

    def test_shared_home_button_enters_scene_and_dates_are_kept(self):
        game, frame, _ = self.open_house()
        game.get_by_role('button', name='Salir a Madrid', exact=True).click()
        game.locator('#dm-city-actions > summary').click()
        game.locator('#dm61-open').click()
        expect(game.locator('#dm-house-scene')).to_be_visible()
        frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready', timeout=15000)
        game.get_by_role('button', name='Menú', exact=True).click()
        game.get_by_role('button', name='Citas y recuerdos', exact=True).click()
        expect(game.locator('#dm61-content')).to_contain_text('Elegid vuestro próximo plan')
        self.assertEqual(self.errors, [])

    def test_missing_atlas_keeps_the_previous_house_playable(self):
        self.context.route('**/assets/furniture/house-atlas.json', lambda route: route.fulfill(status=404, body='missing'))
        self.tool()
        self.page.evaluate('''()=>{localStorage.setItem('dos-mundos-v51-role','jc');
            localStorage.setItem('dos-mundos-v29',JSON.stringify({name:'JC QA',money:753,inventory:['libro']}));}''')
        self.page.goto(self.base + 'casa-rpg.html')
        game = self.page.frame_locator('#dm-frame')
        expect(game.locator('#game')).to_be_visible()
        game.locator('#goHome').click()
        expect(game.locator('#roomHot')).to_contain_text('La casa anterior sigue disponible')
        expect(game.locator('#roomCanvas')).to_be_visible()
        expect(game.locator('#dm-house-scene')).to_have_count(0)
        game.locator('#exitTop').click()
        expect(game.locator('#world')).to_be_visible()
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29")).money'), 753)

    def test_new_house_entry_preserves_gabis_original_letter(self):
        carta = Path(support.os.environ.get('CARTA_SOURCE', support.ROOT.parent / 'Carta/index.html'))
        if not carta.is_file(): self.skipTest('Optional Carta checkout missing')
        self.context.route('https://raw.githubusercontent.com/jcpages20/Carta/main/index.html',
                           lambda route: route.fulfill(path=str(carta), content_type='text/html'))
        self.tool()
        self.page.evaluate('''()=>{localStorage.setItem('dos-mundos-v51-role','jc');
            localStorage.setItem('dos-mundos-v29',JSON.stringify({name:'JC QA',money:753}));}''')
        self.page.goto(self.base + 'casa-rpg.html?gabi=1')
        letter = self.page.frame_locator('#dm60-letter')
        letter.locator('#envelope').click()
        letter.locator('#continue').click()
        expect(letter.locator('#shooting')).to_have_class('shooting go')
        expect(letter.locator('#end')).to_have_class('end show')
        expect(self.page.locator('#dm60-enter')).to_be_visible()
        self.page.locator('#dm60-enter').click()
        game = self.page.frame_locator('#dm-frame')
        game.locator('#goHome').click()
        frame = self.page.locator('#dm-frame').element_handle().content_frame()
        frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready', timeout=20000)
        self.assertEqual(self.scene(frame)['role'], 'gabi')
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-v60-prologue-seen-gabi")'), 'yes')
        self.assertEqual(self.errors, ["Failed to execute 'postMessage' on 'Window': Invalid target origin 'null' in a call to 'postMessage'."])


if __name__ == '__main__':
    unittest.main(verbosity=2)
