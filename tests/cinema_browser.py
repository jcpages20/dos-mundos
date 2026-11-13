#!/usr/bin/env python3
"""Cinema regression checks against the untouched 6.3, using synthetic saves."""
import json
import unittest

import browser_smoke as support
from playwright.sync_api import expect


class CinemaTests(support.BrowserTests):
    def open_cinema(self, entry='casa-rpg.html', money=753, day=2, time=600):
        self.tool()
        values = {
            'dos-mundos-v51-role': 'jc',
            'dos-mundos-v60-prologue-seen-gabi': 'yes',
            'dos-mundos-v29': json.dumps({'name': 'JC QA', 'money': money, 'energy': 42,
                'hunger': 40, 'fun': 35, 'hygiene': 30, 'day': day, 'time': time,
                'inventory': ['libro'], 'skills': {'estudio': 12}, 'worldExpanded': True}),
            'dos-mundos-61-duo-v1': '{"furniture":["sofa"],"invites":[],"memories":[],"updatedAt":42}'
        }
        self.page.evaluate('''values=>{localStorage.clear();for(const [key,value] of Object.entries(values))
                            localStorage.setItem(key,value)}''', values)
        self.page.goto(self.base + entry)
        game = self.page.frame_locator('#dm-frame')
        expect(game.locator('#game')).to_be_visible()
        game.locator('#places').get_by_role('button', name='🎬 Cine', exact=True).click()
        expect(game.locator('#dm56-overlay')).to_be_visible()
        return game

    def progress(self):
        return self.page.evaluate('''()=>({
            base:JSON.parse(localStorage.getItem('dos-mundos-v29')),
            life:JSON.parse(localStorage.getItem('dos-mundos-55-progreso:JC%20QA:jc')),
            venue:JSON.parse(localStorage.getItem('dos-mundos-56-visitas:JC%20QA:jc')),
            duo:localStorage.getItem('dos-mundos-61-duo-v1')
        })''')

    def test_popcorn_and_seat_match_original_economy_time_xp_and_needs(self):
        results = []
        for entry in ['index6.3.html', 'casa-rpg.html']:
            game = self.open_cinema(entry)
            game.locator('#dm56-overlay .dm56-scene canvas').screenshot(
                path=str(support.ARTIFACTS / ('cine-antes.png' if entry.startswith('index') else 'cine-despues.png')))
            game.get_by_role('button', name='Comprar palomitas').click()
            popcorn = self.progress()
            self.assertEqual(popcorn['base']['money'], 747)
            self.assertEqual(popcorn['base']['time'], 610)
            self.assertEqual(popcorn['life']['xp'], 3)
            game.get_by_role('button', name='Sentarse en las butacas').click()
            seat = self.progress()
            self.assertEqual(seat['base']['money'], 747)
            self.assertEqual(seat['base']['time'], 630)
            self.assertEqual(seat['life']['xp'], 7)
            self.assertEqual(seat['base']['inventory'], ['libro'])
            results.append([popcorn, seat])
        for stage in range(2):
            for key in ['money', 'time', 'day', 'energy', 'hunger', 'hygiene', 'fun', 'skills', 'inventory']:
                self.assertEqual(results[0][stage]['base'][key], results[1][stage]['base'][key], key)
            self.assertEqual(results[0][stage]['life'], results[1][stage]['life'])
            self.assertEqual(results[0][stage]['venue'], results[1][stage]['venue'])
            self.assertEqual(results[0][stage]['duo'], results[1][stage]['duo'])
        self.assertEqual(self.errors, [])

    def test_daily_programme_is_free_stable_and_changes_at_midnight(self):
        game = self.open_cinema(time=1435)
        before = self.progress()
        canvas = game.locator('#dm56-overlay canvas')
        box = canvas.bounding_box()
        canvas.click(position={'x': 437 * box['width'] / 512, 'y': 186 * box['height'] / 320})
        board = game.locator('#dm-cinema-programme')
        expect(board).to_be_visible()
        expect(board).to_contain_text('Día 2')
        first = board.locator('article strong').all_text_contents()
        self.assertEqual(len(first), 3)
        self.page.screenshot(path=str(support.ARTIFACTS / 'cine-cartelera-iphone.png'))
        self.assertEqual(self.progress(), before)
        game.locator('.dm-cinema-today').click()
        expect(board).to_be_hidden()
        game.get_by_role('button', name='Mirar la cartelera').click()
        self.assertEqual(board.locator('article strong').all_text_contents(), first)
        game.get_by_role('button', name='Sentarse en las butacas').click()
        expect(board).to_contain_text('Día 3')
        second = board.locator('article strong').all_text_contents()
        self.assertNotEqual(first, second)
        game.locator('.dm56-original').click()
        game.locator('#dm56-room-entry').click()
        game.get_by_role('button', name='Mirar la cartelera').click()
        self.assertEqual(board.locator('article strong').all_text_contents(), second)
        self.assertEqual(self.errors, [])

    def test_insufficient_money_keeps_all_progress(self):
        game = self.open_cinema(money=3)
        before = self.progress()
        game.get_by_role('button', name='Comprar palomitas').click()
        expect(game.locator('#dm56-message')).to_contain_text('Te faltan 3 €')
        self.assertEqual(self.progress(), before)
        self.assertEqual(self.errors, [])

    def test_mobile_layout_touch_targets_streaming_and_classic_cinema(self):
        game = self.open_cinema()
        for width, height in [(390, 844), (375, 667), (844, 390), (1440, 1000)]:
            self.page.set_viewport_size({'width': width, 'height': height})
            game.get_by_role('button', name='Mirar la cartelera').click()
            shell = game.locator('#dm56-overlay .dm56-shell')
            self.assertFalse(shell.evaluate('el=>el.scrollWidth>el.clientWidth'))
            for selector in ['.dm56-exit', '.dm-cinema-today', '.dm56-action', '.dm56-original']:
                for control in game.locator('#dm56-overlay ' + selector).all():
                    box = control.bounding_box()
                    self.assertGreaterEqual(box['width'], 44)
                    self.assertGreaterEqual(box['height'], 44)
            game.locator('.dm-cinema-today').click()
            shell.evaluate('el=>el.scrollTop=0')
            self.page.screenshot(path=str(support.ARTIFACTS / f'cine-{width}x{height}.png'))
        game.get_by_role('button', name='Ver interior clásico y sus actividades').click()
        expect(game.locator('#roomCanvas')).to_be_visible()
        game.locator('#dm56-room-entry').click()
        before = self.progress()
        game.get_by_role('button', name='Entrar a la sala').click()
        expect(game.locator('#dm56-overlay')).to_have_count(1)
        overlay = game.locator('#dm33-cinema-overlay')
        expect(overlay).to_be_visible()
        self.assertEqual(overlay.locator('a').evaluate_all('links=>links.map(a=>a.href)'), [
            'https://www.netflix.com/browse', 'https://www.max.com/es/es', 'https://www.disneyplus.com/es-es'])
        self.assertEqual(overlay.locator('a').evaluate_all('links=>links.every(a=>a.target==="_blank")'), True)
        overlay.get_by_role('button', name='Volver al juego').click()
        expect(game.locator('#dm56-overlay[data-cinema]')).to_be_visible()
        self.assertFalse(game.locator('#dm56-overlay').evaluate('el=>el.inert'))
        self.assertEqual(self.progress(), before)
        self.assertEqual(self.errors, [])

    def test_return_to_city_house_and_other_venues(self):
        game = self.open_cinema()
        game.get_by_role('button', name='Salir del cine', exact=True).click()
        expect(game.locator('#world')).to_be_visible()
        game.locator('#places').get_by_role('button', name='🛒 Mercado', exact=True).click()
        expect(game.locator('#dm56-overlay')).to_be_visible()
        expect(game.locator('#dm56-overlay[data-cinema]')).to_have_count(0)
        expect(game.locator('#dm-cinema-programme')).to_have_count(0)
        game.get_by_role('button', name='Cerrar local', exact=True).click()
        game.locator('#exitTop').click()
        game.locator('#goHome').click()
        expect(game.locator('#dm-house-scene')).to_be_visible()
        frame = self.page.locator('#dm-frame').element_handle().content_frame()
        frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready', timeout=15000)
        game.get_by_role('button', name='Salir a Madrid', exact=True).click()
        expect(game.locator('#world')).to_be_visible()
        self.assertEqual(self.progress()['base']['money'], 753)
        self.assertEqual(self.errors, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
