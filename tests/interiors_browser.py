#!/usr/bin/env python3
"""Renewed venues, direct exits and platform recommendations, isolated profiles."""
import json
import unittest

import browser_smoke as support
from cinema_browser import CinemaTests
from playwright.sync_api import expect


class InteriorsTests(CinemaTests):
    def open_venue(self, venue='gym', entry='casa-rpg.html', energy=82, money=753):
        self.tool()
        self.page.evaluate('''v=>{localStorage.clear();localStorage.setItem('dos-mundos-v51-role','jc');
            localStorage.setItem('dos-mundos-v60-prologue-seen-gabi','yes');
            localStorage.setItem('dos-mundos-v29',JSON.stringify(v));
            localStorage.setItem('dos-mundos-61-duo-v1','{"furniture":["sofa"],"invites":[],"memories":[],"updatedAt":42}');}''',
            {'name':'JC QA','money':money,'energy':energy,'hunger':72,'fun':35,'hygiene':60,
             'day':2,'time':600,'inventory':['libro'],'skills':{'estudio':12},'worldExpanded':True})
        self.page.goto(self.base + entry)
        game=self.page.frame_locator('#dm-frame')
        expect(game.locator('#game')).to_be_visible()
        button='Gimnasio' if venue=='gym' else 'Cafetería'
        game.locator('#places').get_by_role('button',name=button).click()
        if venue=='gym' and entry=='casa-rpg.html':
            expect(game.locator('#dm-gym-scene')).to_be_visible()
            frame=self.page.locator('#dm-frame').element_handle().content_frame()
            frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=25000)
            game.get_by_role('button',name='Menú',exact=True).click()
            game.get_by_role('button',name='Vista anterior y actividades',exact=True).click()
        expect(game.locator('#dm56-overlay' if venue=='gym' else '#dm37-cafe-modal')).to_be_visible()
        frame=self.page.locator('#dm-frame').element_handle().content_frame()
        frame.wait_for_function('''()=>{const base=JSON.parse(localStorage.getItem('dos-mundos-v29'));
            const life=JSON.parse(localStorage.getItem('dos-mundos-55-progreso:JC%20QA:jc'));
            return life?.lastDay===base.day&&Number.isFinite(life.decorBaseline)}''')
        return game

    def test_gym_preserves_all_training_effects_sessions_and_xp(self):
        results=[]
        for entry in ['index6.3.html','casa-rpg.html']:
            game=self.open_venue(entry=entry)
            stages=[]
            for name,minutes,xp,count in [('Entrenar fuerza',660,20,1),('Hacer cardio',695,34,2),('Estirar y recuperar',715,40,3)]:
                game.get_by_role('button',name=name).click()
                progress=self.progress();stages.append(progress)
                self.assertEqual(progress['base']['money'],753)
                self.assertEqual(progress['base']['time'],minutes)
                self.assertEqual(progress['life']['xp'],xp)
                self.assertEqual(progress['venue']['fitness'],count)
            before=self.progress()
            game.get_by_role('button',name='Consultar progreso').click()
            expect(game.locator('#dm56-message')).to_contain_text('3 sesiones')
            self.assertEqual(self.progress(),before)
            if entry=='casa-rpg.html':expect(game.locator('.dm-gym-progress')).to_contain_text('3 sesiones')
            results.append(stages)
        for stage in range(3):
            for key in ['money','time','day','energy','hunger','hygiene','fun','inventory','skills']:
                self.assertEqual(results[0][stage]['base'][key],results[1][stage]['base'][key],key)
            self.assertEqual(results[0][stage]['life'],results[1][stage]['life'])
            self.assertEqual(results[0][stage]['venue'],results[1][stage]['venue'])
        self.assertEqual(self.errors,[])

    def test_gym_low_energy_is_free_and_exit_escape_returns_to_street(self):
        game=self.open_venue(energy=3)
        before=self.progress()
        game.get_by_role('button',name='Entrenar fuerza').click()
        expect(game.locator('#dm56-message')).to_contain_text('Necesitas descansar')
        self.assertEqual(self.progress(),before)
        self.page.keyboard.press('Escape')
        expect(game.locator('#dm56-overlay')).to_have_count(0)
        expect(game.locator('#world')).to_be_visible()
        expect(game.locator('#interior')).to_be_hidden()
        self.assertFalse(game.locator('#interior').evaluate('el=>el.inert'))
        self.assertEqual(self.progress(),before)
        self.assertEqual(self.errors,[])

    def test_cinema_exit_once_and_platform_chooser_returns_to_new_room(self):
        game=self.open_cinema()
        frame=self.page.locator('#dm-frame').element_handle().content_frame()
        before=frame.evaluate('window.DosMundosLegacy.snapshot()')
        for close in ['button','escape','backdrop']:
            game.get_by_role('button',name='Entrar a la sala').click()
            chooser=game.locator('#dm33-cinema-overlay')
            expect(chooser).to_be_visible()
            if close=='button':chooser.get_by_role('button',name='Volver al juego').click()
            elif close=='escape':self.page.keyboard.press('Escape')
            else:chooser.click(position={'x':2,'y':2})
            expect(chooser).to_have_count(0)
            expect(game.locator('#dm56-overlay[data-cinema]')).to_be_visible()
            self.assertFalse(game.locator('#dm56-overlay').evaluate('el=>el.inert'))
        game.get_by_role('button',name='Salir del cine',exact=True).click()
        expect(game.locator('#world')).to_be_visible()
        expect(game.locator('#interior')).to_be_hidden()
        self.assertEqual(frame.evaluate('window.DosMundosLegacy.snapshot()'),before)
        game.locator('#places').get_by_role('button',name='🎬 Cine',exact=True).click()
        expect(game.locator('#dm56-overlay[data-cinema]')).to_be_visible()
        self.page.keyboard.press('Escape')
        expect(game.locator('#world')).to_be_visible()
        self.assertEqual(self.errors,[])

    def test_recommendations_have_one_safe_link_for_each_platform(self):
        game=self.open_cinema()
        before=self.progress()
        game.get_by_role('button',name='Mirar la cartelera').click()
        board=game.locator('#dm-cinema-programme')
        self.assertEqual(board.locator('article small').all_text_contents(),['Netflix','Max','Disney+'])
        self.assertEqual(board.locator('a').evaluate_all('els=>els.map(a=>[a.href,a.target,a.rel])'),[
            ['https://www.netflix.com/browse','_blank','noopener noreferrer'],
            ['https://www.max.com/es/es','_blank','noopener noreferrer'],
            ['https://www.disneyplus.com/es-es','_blank','noopener noreferrer']])
        self.assertEqual(self.progress(),before)
        self.page.screenshot(path=str(support.ARTIFACTS/'cartelera-plataformas-iphone.png'))
        self.assertEqual(self.errors,[])

    def test_cafe_preserves_coffee_cake_and_all_five_plans(self):
        results=[]
        for entry in ['index6.3.html','casa-rpg.html']:
            game=self.open_venue('cafe',entry)
            stages=[]
            for category,name,price,minutes in [('Carta','Café de especialidad',5,20),('Carta','Tarta de la casa',9,25),
                    ('Planes','Charla espontánea',0,30),('Planes','Sesión musical',0,35),('Planes','Mini cita',14,65),
                    ('Creativo','Trabajar con portátil',0,50),('Creativo','Escribir un rato',0,35)]:
                game.get_by_role('button',name=category,exact=True).click()
                before=self.progress()['base']
                game.get_by_role('button',name=name).click()
                after=self.progress()['base'];stages.append(after)
                self.assertEqual(after['money'],before['money']-price)
                self.assertEqual(after['time'],before['time']+minutes)
                expect(game.locator('.dm37-result')).to_contain_text(name)
            results.append(stages)
        for stage in range(7):
            for key in ['money','time','day','energy','hunger','hygiene','fun','social','inventory','skills']:
                self.assertEqual(results[0][stage][key],results[1][stage][key],key)
        self.assertEqual(self.errors,[])

    def test_cafe_money_animation_classic_and_direct_exit(self):
        game=self.open_venue('cafe',money=3)
        before=self.progress()
        game.get_by_role('button',name='Café de especialidad').click()
        expect(game.locator('.dm37-result')).to_contain_text('No tienes suficiente dinero')
        self.assertEqual(self.progress(),before)
        canvas=game.locator('.dm37-art')
        first=canvas.evaluate('el=>el.toDataURL()')
        self.page.wait_for_timeout(180)
        self.assertNotEqual(canvas.evaluate('el=>el.toDataURL()'),first)
        game.get_by_role('button',name='Ver interior clásico y sus actividades',exact=True).click()
        expect(game.locator('#roomCanvas')).to_be_visible()
        self.assertFalse(game.locator('#interior').evaluate('el=>el.inert'))
        game.locator('#exitTop').click()
        game.locator('#places').get_by_role('button',name='Cafetería').click()
        expect(game.locator('#dm37-cafe-modal')).to_be_visible()
        self.page.keyboard.press('Escape')
        expect(game.locator('#world')).to_be_visible()
        expect(game.locator('#interior')).to_be_hidden()
        self.assertFalse(game.locator('body').evaluate('el=>el.classList.contains("dm-cafe-active")'))
        self.assertEqual(self.errors,[])

    def test_gym_cafe_mobile_controls_and_repeat_visits(self):
        for venue in ['gym','cafe']:
            game=self.open_venue(venue)
            root=game.locator('#dm56-overlay' if venue=='gym' else '#dm37-cafe-modal')
            for width,height in [(390,844),(375,667),(844,390),(1440,1000)]:
                self.page.set_viewport_size({'width':width,'height':height})
                shell=root.locator('.dm56-shell' if venue=='gym' else '.dm37-modal')
                self.assertFalse(shell.evaluate('el=>el.scrollWidth>el.clientWidth'))
                for control in root.locator('button').all():
                    if control.is_visible():
                        box=control.bounding_box();self.assertGreaterEqual(box['height'],44);self.assertGreaterEqual(box['width'],44)
                shell.evaluate('el=>el.scrollTop=0')
                self.page.screenshot(path=str(support.ARTIFACTS/f'{venue}-{width}x{height}.png'))
            exit_name='Salir del gimnasio' if venue=='gym' else 'Salir del café'
            game.get_by_role('button',name=exit_name,exact=True).click()
            expect(game.locator('#world')).to_be_visible()
            self.assertFalse(game.locator('#interior').evaluate('el=>el.inert'))
        self.assertEqual(self.errors,[])


if __name__=='__main__':unittest.main(verbosity=2)
