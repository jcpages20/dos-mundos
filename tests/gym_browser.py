#!/usr/bin/env python3
"""Walkable gym, original character interaction and backwards-compatible progress."""
import json
import unittest

import browser_smoke as support
from playwright.sync_api import expect


class GymTests(support.BrowserTests):
    def open_gym(self,role='jc',energy=82,entry='casa-rpg.html'):
        self.tool()
        name='Gabi QA' if role=='gabi' else 'JC QA'
        values={
            'dos-mundos-v51-role':role,'dos-mundos-v60-prologue-seen-gabi':'yes',
            'dos-mundos-v29':json.dumps({'name':name,'money':753,'energy':energy,'hunger':72,'fun':35,
                'hygiene':60,'day':2,'time':600,'inventory':['libro'],'skills':{'estudio':12},'worldExpanded':True}),
            'dos-mundos-61-duo-v1':'{"furniture":["sofa"],"invites":[],"memories":[],"updatedAt":42}'
        }
        self.page.evaluate('v=>{localStorage.clear();for(const [k,x] of Object.entries(v))localStorage.setItem(k,x)}',values)
        self.page.goto(self.base+entry)
        game=self.page.frame_locator('#dm-frame');expect(game.locator('#game')).to_be_visible()
        game.locator('#places').get_by_role('button',name='Gimnasio').click()
        frame=self.page.locator('#dm-frame').element_handle().content_frame()
        if entry=='casa-rpg.html':
            expect(game.locator('#dm-gym-scene')).to_be_visible()
            frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=25000)
        else:expect(game.locator('#dm56-overlay')).to_be_visible()
        return game,frame,values

    def scene(self,frame):return frame.evaluate('window.DosMundosGym.getSnapshot()')

    def progress(self,frame):return frame.evaluate('window.DosMundosGymLegacy.snapshot()')

    def raw(self,frame,role='jc'):
        name='Gabi%20QA' if role=='gabi' else 'JC%20QA'
        return frame.evaluate('''([name,role])=>({base:JSON.parse(localStorage.getItem('dos-mundos-v29')),
            life:JSON.parse(localStorage.getItem('dos-mundos-55-progreso:'+name+':'+role)),
            venue:JSON.parse(localStorage.getItem('dos-mundos-56-visitas:'+name+':'+role)),
            duo:localStorage.getItem('dos-mundos-61-duo-v1')})''',[name,role])

    def plan_click(self,game,frame,x,y):
        plan=game.get_by_role('button',name='Plano',exact=True)
        if plan.count():plan.click()
        frame.wait_for_timeout(80)
        canvas=game.locator('#dm-gym-canvas');box=canvas.bounding_box();size=canvas.evaluate('el=>({w:el.width,h:el.height})')
        scale=min(size['w']/1056,size['h']/816)
        cx=((size['w']-1056*scale)/2+x*scale)*box['width']/size['w']
        cy=((size['h']-816*scale)/2+y*scale)*box['height']/size['h']
        self.page.mouse.click(box['x']+cx,box['y']+cy)

    def reach(self,game,frame,id,x,y):
        self.plan_click(game,frame,x,y)
        frame.wait_for_function('id=>{const s=window.DosMundosGym.getSnapshot();return s?.target===id&&!s.walking}',arg=id,timeout=18000)

    def test_gym_map_and_real_equipment_load_with_original_character(self):
        game,frame,_=self.open_gym()
        self.assertEqual(self.scene(frame)['role'],'jc')
        self.assertEqual(frame.evaluate('window.DosMundosLegacy.room'),'gym')
        game.get_by_role('button',name='Plano',exact=True).click()
        self.page.screenshot(path=str(support.ARTIFACTS/'gym-rpg-plano-iphone.png'))
        self.page.set_viewport_size({'width':1440,'height':1000})
        frame.wait_for_timeout(120)
        self.page.screenshot(path=str(support.ARTIFACTS/'gym-rpg-plano-desktop.png'))
        self.assertEqual(self.errors,[])

    def test_existing_workouts_match_original_progress_at_real_machines(self):
        results=[]
        for entry in ['index6.3.html','casa-rpg.html']:
            game,frame,_=self.open_gym(entry=entry)
            stages=[]
            for name,id,x,y,time,xp,sessions in [
                    ('Entrenar fuerza','dumbbells',300,365,660,20,1),
                    ('Hacer cardio','treadmill-1',668,196,695,34,2),
                    ('Estirar y recuperar','floor-mat',684,637,715,40,3)]:
                if entry=='casa-rpg.html':self.reach(game,frame,id,x,y)
                game.get_by_role('button',name=name,exact=entry=='casa-rpg.html').click()
                after=self.raw(frame);stages.append(after)
                self.assertEqual(after['base']['time'],time)
                self.assertEqual(after['base']['money'],753)
                self.assertEqual(after['life']['xp'],xp)
                self.assertEqual(after['venue']['fitness'],sessions)
                if entry=='casa-rpg.html':game.get_by_role('button',name='Seguir caminando',exact=True).click()
            results.append(stages)
        for stage in range(3):
            for key in ['money','time','day','energy','hunger','hygiene','fun','skills','inventory']:
                self.assertEqual(results[0][stage]['base'][key],results[1][stage]['base'][key],key)
            self.assertEqual(results[0][stage]['life'],results[1][stage]['life'])
            self.assertEqual(results[0][stage]['venue'],results[1][stage]['venue'])
            self.assertEqual(results[0][stage]['duo'],results[1][stage]['duo'])
        self.assertEqual(self.errors,[])

    def test_gabi_practises_silks_and_progress_survives_reload(self):
        game,frame,values=self.open_gym('gabi')
        self.reach(game,frame,'silks-burgundy',132,620)
        before=self.progress(frame)
        game.get_by_role('button',name='Practicar telas',exact=True).click()
        frame.wait_for_function('window.DosMundosGym.getSnapshot().training==="silks"')
        self.assertEqual(self.scene(frame)['role'],'gabi')
        after=self.progress(frame)
        self.assertEqual(after['money'],before['money'])
        self.assertEqual(after['time'],before['time']+45)
        self.assertEqual(after['aerialXP'],before['aerialXP']+18)
        self.assertEqual(after['fitnessXP'],before['fitnessXP']+18)
        self.assertEqual(after['xp'],before['xp']+18)
        self.assertEqual(after['sessions'],before['sessions']+1)
        frame.wait_for_timeout(1400)
        plan=game.get_by_role('button',name='Seguir',exact=True)
        if plan.count():plan.click()
        frame.wait_for_timeout(220)
        self.page.screenshot(path=str(support.ARTIFACTS/'gym-gabi-telas-iphone.png'))
        game.get_by_role('button',name='Seguir caminando',exact=True).click()
        self.assertEqual(self.progress(frame),after)
        self.assertEqual(self.scene(frame)['pose'],'stand')
        game.get_by_role('button',name='Calle',exact=True).click()
        expect(game.locator('#world')).to_be_visible()
        self.page.reload()
        game=self.page.frame_locator('#dm-frame');game.locator('#places').get_by_role('button',name='Gimnasio').click()
        frame=self.page.locator('#dm-frame').element_handle().content_frame()
        frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=25000)
        self.assertEqual(self.progress(frame)['aerialXP'],after['aerialXP'])
        self.assertEqual(self.progress(frame)['sessions'],after['sessions'])
        self.assertEqual(self.progress(frame)['time'],after['time'])
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'),values['dos-mundos-61-duo-v1'])
        self.assertEqual(self.errors,[])

    def test_all_zones_are_walkable_and_treadmill_blocks_walking(self):
        game,frame,_=self.open_gym()
        for label,zone in [('Fuerza','strength'),('Cardio','cardio'),('Telas','silks'),('Calma','mobility')]:
            game.get_by_role('button',name='Ir a '+label,exact=True).click()
            frame.wait_for_function('zone=>{const s=window.DosMundosGym.getSnapshot();return s?.zone===zone&&!s.walking}',arg=zone,timeout=20000)
        self.reach(game,frame,'treadmill-1',668,196)
        self.page.keyboard.down('ArrowUp');frame.wait_for_timeout(650);self.page.keyboard.up('ArrowUp')
        self.assertGreaterEqual(self.scene(frame)['position']['y'],268)
        self.assertEqual(self.errors,[])

    def test_too_little_energy_does_not_grant_aerial_rewards(self):
        game,frame,_=self.open_gym(energy=3)
        self.reach(game,frame,'silks-lilac',322,620)
        before=self.raw(frame)
        game.get_by_role('button',name='Practicar telas',exact=True).click()
        expect(game.locator('.dm-gym-message')).to_contain_text('Necesitas descansar')
        self.assertEqual(self.raw(frame),before)
        self.assertIsNone(self.scene(frame)['training'])
        self.assertEqual(self.errors,[])

    def test_mobile_controls_classic_return_and_house_are_preserved(self):
        game,frame,_=self.open_gym()
        for width,height in [(390,844),(375,667),(844,390),(1440,1000)]:
            self.page.set_viewport_size({'width':width,'height':height});frame.wait_for_timeout(100)
            self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            for button in game.locator('#dm-gym-scene button').all():
                if button.is_visible():
                    box=button.bounding_box();self.assertGreaterEqual(box['width'],44);self.assertGreaterEqual(box['height'],44)
                    if button.get_attribute('class')=='dm-gym-exit':self.assertLessEqual(box['x']+box['width'],width)
            self.page.screenshot(path=str(support.ARTIFACTS/f'gym-rpg-{width}x{height}.png'))
        before=self.progress(frame)
        game.get_by_role('button',name='Menú',exact=True).click()
        game.get_by_role('button',name='Vista anterior y actividades',exact=True).click()
        expect(game.locator('#dm56-overlay[data-gym]')).to_be_visible()
        game.get_by_role('button',name='Volver al gimnasio amplio',exact=True).click()
        frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=25000)
        self.assertEqual(self.progress(frame),before)
        game.get_by_role('button',name='Calle',exact=True).click()
        expect(game.locator('#world')).to_be_visible()
        self.assertFalse(game.locator('#interior').evaluate('el=>el.inert'))
        game.locator('#goHome').click()
        frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready',timeout=25000)
        expect(game.locator('#dm-house-scene')).to_be_visible()
        self.assertEqual(self.errors,[])

    def test_missing_gym_art_keeps_the_previous_gym_playable(self):
        self.context.route('**/assets/gym/gym-atlas.json',lambda route:route.fulfill(status=404,body='missing'))
        self.tool()
        self.page.evaluate('''()=>{localStorage.setItem('dos-mundos-v51-role','jc');localStorage.setItem('dos-mundos-v29',JSON.stringify({name:'JC QA',money:753,energy:82}));}''')
        self.page.goto(self.base+'casa-rpg.html');game=self.page.frame_locator('#dm-frame')
        game.locator('#places').get_by_role('button',name='Gimnasio').click()
        expect(game.locator('#dm56-message')).to_contain_text('El gimnasio anterior sigue disponible')
        expect(game.locator('#dm56-overlay[data-gym]')).to_be_visible()
        expect(game.locator('#dm-gym-scene')).to_have_count(0)
        game.get_by_role('button',name='Entrenar fuerza').click()
        saved=self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29"))')
        self.assertEqual(saved['money'],753);self.assertEqual(saved['time'],540)
        game.get_by_role('button',name='Salir del gimnasio',exact=True).click()
        expect(game.locator('#world')).to_be_visible()

    def test_walking_out_and_old_exit_positions_resume_safely_inside(self):
        game,frame,_=self.open_gym()
        before=self.progress(frame)
        self.plan_click(game,frame,512,790)
        expect(game.locator('#world')).to_be_visible(timeout=8000)
        key='dos-mundos-gym-rpg-v1:jc:JC%20QA'
        saved=self.page.evaluate('key=>JSON.parse(localStorage.getItem(key))',key)
        self.assertEqual(saved['position'],{'x':512,'y':752,'face':'up'})
        for seed in [False,True]:
            if seed:self.page.evaluate('key=>localStorage.setItem(key,JSON.stringify({version:1,position:{x:512,y:790,face:"down"}}))',key)
            game.locator('#places').get_by_role('button',name='Gimnasio').click()
            frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=25000)
            frame.wait_for_timeout(350)
            expect(game.locator('#dm-gym-scene')).to_be_visible()
            self.assertEqual(self.scene(frame)['position'],{'x':512,'y':752})
            self.assertEqual(self.progress(frame),before)
            game.get_by_role('button',name='Calle',exact=True).click()
            expect(game.locator('#world')).to_be_visible()
        self.assertEqual(self.errors,[])

    def test_leaving_while_assets_load_does_not_reopen_the_gym(self):
        pending=[]
        self.context.route('**/assets/gym/gym-atlas.json',lambda route:pending.append(route))
        self.tool()
        self.page.evaluate('''()=>{localStorage.setItem('dos-mundos-v51-role','jc');localStorage.setItem('dos-mundos-v29',JSON.stringify({name:'JC QA',money:753,energy:82}));}''')
        self.page.goto(self.base+'casa-rpg.html');game=self.page.frame_locator('#dm-frame')
        game.locator('#places').get_by_role('button',name='Gimnasio').click()
        expect(game.locator('#dm-gym-scene')).to_be_visible()
        expect(game.locator('.dm-gym-message')).to_contain_text('Preparando')
        self.page.wait_for_timeout(100)
        game.get_by_role('button',name='Calle',exact=True).click()
        expect(game.locator('#world')).to_be_visible()
        for request in pending:request.fulfill(status=200,path=str(support.ROOT/'assets/gym/gym-atlas.json'),content_type='application/json')
        self.page.wait_for_timeout(450)
        expect(game.locator('#dm-gym-scene')).to_have_count(0)
        expect(game.locator('#dm56-overlay')).to_have_count(0)
        self.assertFalse(game.locator('#interior').evaluate('el=>el.inert'))
        self.assertEqual(self.errors,[])


if __name__=='__main__':unittest.main(verbosity=2)
