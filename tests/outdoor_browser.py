#!/usr/bin/env python3
"""Walkable Madrid scenes against unchanged native economics; disposable profiles."""
import json
import unittest
from city_browser import CityTests
from playwright.sync_api import expect
import browser_smoke as support

class OutdoorTests(CityTests):
    def open_outdoor(self,place='park',role='jc',entry='casa-rpg.html',ready=True):
        game,frame,values=self.open_city(role,x=138,y=479,entry=entry)
        game.locator('#places').get_by_role('button',name='Parque' if place=='park' else 'Plaza',exact=False).click()
        if entry=='casa-rpg.html' and ready:frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=24000)
        return game,frame,values
    def snap(self,frame):return frame.evaluate('window.DosMundosOutdoors.getSnapshot()')
    def progress(self):return self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29"))')
    def reach(self,game,frame,label,target):
        game.get_by_role('button',name='Ir a '+label,exact=True).click()
        frame.wait_for_function('id=>{const s=window.DosMundosOutdoors.getSnapshot();return s.target===id&&!s.walking}',arg=target,timeout=18000)
    def test_native_actions_keep_the_same_money_time_needs_xp_and_history(self):
        for place,ids in [('park',['walk','sport','stroll','rest']),('plaza',['music','talk','social','listen'])]:
            stages=[]
            for entry in ['index6.3.html','casa-rpg.html']:
                game,frame,_=self.open_outdoor(place,entry=entry);results=[]
                for i,action in enumerate(ids):
                    if entry=='casa-rpg.html':self.assertTrue(frame.evaluate('id=>window.DosMundosOutdoorLegacy.act(id).ok',action))
                    elif i<2:
                        game.locator('#activityMenu button').first.click();game.locator('#activityDetails button').nth(i).click()
                    else:
                        if not game.locator('#roomActions button').nth(i-2).is_visible():game.locator('#interior .extras summary').click()
                        game.locator('#roomActions button').nth(i-2).click()
                    results.append(self.progress())
                stages.append(results)
            for old,new in zip(*stages):
                for k in ['money','day','time','energy','hunger','hygiene','fun','social','skills','inventory','activityHistory','reputation','dailyGoals']:
                    self.assertEqual(old.get(k),new.get(k),(place,k))
        self.assertEqual(self.errors,[])
    def test_both_original_roles_can_sit_stand_and_reload_without_replaying_rewards(self):
        for role in ['jc','gabi']:
            game,frame,_=self.open_outdoor(role=role);self.reach(game,frame,'Bancos','lake-bench');before=self.progress()
            game.get_by_role('button',name='Sentarte a descansar',exact=True).click();frame.wait_for_function('window.DosMundosOutdoors.getSnapshot().pose==="sit"')
            s=self.snap(frame);self.assertEqual(s['role'],role);self.assertEqual(s['position']['x'],831 if role=='jc' else 879)
            after=self.progress();self.assertEqual(after['time'],before['time']+20);self.assertEqual(after['money'],before['money'])
            game.get_by_role('button',name='Levantarse',exact=True).click();self.assertEqual(self.progress(),after)
            game.get_by_role('button',name='Calle',exact=True).click();self.page.reload();game=self.page.frame_locator('#dm-frame')
            game.locator('#places').get_by_role('button',name='Parque',exact=False).click();frame=self.page.locator('#dm-frame').element_handle().content_frame()
            frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=24000)
            self.assertEqual(self.snap(frame)['pose'],'stand');self.assertEqual(self.progress()['time'],after['time'])
        self.assertEqual(self.errors,[])
    def test_terrace_sitting_and_native_music_xp_remain_distinct(self):
        game,frame,_=self.open_outdoor('plaza');self.reach(game,frame,'Terraza','terrace-west');before=self.progress()
        game.get_by_role('button',name='Sentarte a escuchar',exact=True).click();frame.wait_for_function('window.DosMundosOutdoors.getSnapshot().pose==="sit"')
        after=self.progress();self.assertEqual(after['time'],before['time']+20);self.assertEqual(after['skills'],before['skills'])
        game.get_by_role('button',name='Levantarse',exact=True).click();game.get_by_role('button',name='Opciones',exact=True).click();game.get_by_role('button',name='Actividades del lugar',exact=True).click()
        game.get_by_role('button',name='Escuchar música · 30 min · +8 XP',exact=True).click()
        frame.wait_for_function('JSON.parse(localStorage.getItem("dos-mundos-v29")).time===650',timeout=18000)
        self.assertEqual(self.progress()['skills'].get('social',0),after['skills'].get('social',0)+8);self.assertEqual(self.errors,[])
    def test_native_neighbors_conversation_moves_and_returns_the_same_relationship_box(self):
        game,frame,_=self.open_outdoor();before=self.progress()
        game.get_by_role('button',name='Opciones',exact=True).click();game.get_by_role('button',name='Hablar con los vecinos',exact=True).click();game.get_by_role('button',name='Hablar con Álex',exact=True).click()
        expect(game.locator('.dm-outdoor-menu #relationshipBox')).to_be_visible(timeout=18000)
        game.get_by_role('button',name='Preguntar por su día',exact=False).click();after=self.progress()
        self.assertEqual(after['time'],before['time']+14);self.assertGreater(after['relationships']['Álex']['bond'],0)
        game.get_by_role('button',name='Cerrar conversación',exact=True).click();expect(game.locator('.dm-outdoor-menu')).to_have_count(0)
        self.assertEqual(game.locator('#interior #relationshipBox').count(),1);self.assertEqual(game.locator('#relationshipBox').count(),1)
        self.assertEqual(self.errors,[])
    def test_free_views_preserve_crops_shared_decor_and_current_economy(self):
        game,frame,values=self.open_outdoor('plaza');before=self.progress()
        self.page.evaluate('localStorage.setItem("dm58-life-jc-JC QA",\'{"garden":[{"type":"tomato","planted":777}],"future":{"keep":true}}\')')
        crop=self.page.evaluate('localStorage.getItem("dm58-life-jc-JC QA")')
        game.get_by_role('button',name='Plano',exact=True).click();game.get_by_role('button',name='Acercar',exact=True).click()
        game.get_by_role('button',name='Opciones',exact=True).click();game.get_by_role('button',name='Actividades anteriores',exact=True).click()
        expect(game.locator('#interior')).to_be_visible();self.assertFalse(game.locator('#interior').evaluate('e=>e.inert'))
        game.get_by_role('button',name='Volver a Plaza Mayor',exact=True).click();self.assertFalse(self.snap(frame)['paused'])
        self.assertEqual(self.progress(),before);self.assertEqual(self.page.evaluate('localStorage.getItem("dm58-life-jc-JC QA")'),crop)
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'),values['dos-mundos-61-duo-v1']);self.assertEqual(self.errors,[])
    def test_city_walk_enters_both_scenes_and_exit_returns_to_the_same_walk(self):
        game,frame,_=self.open_city();game.get_by_role('button',name='Pasear',exact=True).click()
        for place,title in [('park','Parque'),('plaza','Plaza')]:
            game.locator('#dm-city-walk').get_by_role('button',name='Plano',exact=True).click();game.get_by_role('button',name='Caminar hasta '+title,exact=True).click()
            frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=24000);self.assertEqual(self.snap(frame)['room'],place)
            expect(game.locator('#dm-city-walk')).to_have_count(0);game.get_by_role('button',name='Calle',exact=True).click()
            expect(game.locator('#dm-city-walk')).to_be_visible();self.assertTrue(frame.evaluate('window.DosMundosCity.getSnapshot().street'))
        self.assertEqual(self.errors,[])
    def test_mobile_layout_controls_and_madrid_screenshots(self):
        for place in ['park','plaza']:
            game,frame,_=self.open_outdoor(place);game.get_by_role('button',name='Plano',exact=True).click()
            for w,h in [(390,844),(375,667),(844,390),(1440,1100)]:
                self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(150)
                self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
                for b in game.locator('#dm-outdoor-scene button').all():
                    if b.is_visible():
                        box=b.bounding_box();self.assertGreaterEqual(box['width'],44);self.assertGreaterEqual(box['height'],44);self.assertLessEqual(box['x']+box['width'],w+.5)
                self.page.screenshot(path=str(support.ARTIFACTS/f'{place}-madrid-{w}x{h}.png'))
        self.assertEqual(self.errors,[])
    def test_failed_assets_leave_all_original_activities_playable(self):
        self.context.route('**/assets/outdoors/madrid-atlas.png',lambda route:route.abort())
        game,frame,_=self.open_outdoor(ready=False);expect(game.locator('#dm-outdoor-scene')).to_have_count(0,timeout=22000)
        expect(game.locator('#interior')).to_be_visible();self.assertFalse(game.locator('#interior').evaluate('e=>e.inert'))
        before=self.progress();game.locator('#interior .extras summary').click();game.locator('#roomActions button').nth(1).click();self.assertEqual(self.progress()['time'],before['time']+20);self.assertEqual(self.errors,[])
    def test_leaving_during_asset_loading_cannot_resurrect_an_old_scene(self):
        pending=[];self.context.route('**/assets/outdoors/madrid-atlas.png',lambda route:pending.append(route))
        game,frame,_=self.open_outdoor(ready=False);expect(game.locator('#dm-outdoor-scene')).to_be_visible()
        frame.wait_for_timeout(200);game.get_by_role('button',name='Calle',exact=True).click()
        for route in pending:route.continue_()
        frame.wait_for_timeout(400);expect(game.locator('#dm-outdoor-scene')).to_have_count(0);self.assertIsNone(self.snap(frame));self.assertEqual(self.errors,[])
    def test_native_presence_keeps_its_fields_and_uses_the_own_character_position(self):
        game,frame,_=self.open_outdoor('plaza','gabi');self.reach(game,frame,'Terraza','terrace-west');game.get_by_role('button',name='Sentarte a escuchar',exact=True).click()
        frame.wait_for_timeout(150);s=self.snap(frame);payload=frame.evaluate('window.DosMundosOutdoorLegacy.presence()')
        self.assertEqual(set(payload),{'name','x','y','room','place','roomX','roomY','face','online','updated'})
        self.assertEqual(payload['room'],'plaza');self.assertEqual(payload['roomX'],round(28+s['position']['x']/1280*456));self.assertEqual(payload['face'],'down')
        self.assertIsNone(s['peer']);game.get_by_role('button',name='Opciones',exact=True).click();game.get_by_role('button',name='Actividades anteriores',exact=True).click()
        payload=frame.evaluate('window.DosMundosOutdoorLegacy.presence()');self.assertEqual((payload['roomX'],payload['roomY']),(260,270));self.assertEqual(self.errors,[])
    def test_low_energy_detailed_sport_is_rejected_without_changing_native_progress(self):
        game,frame,_=self.open_outdoor();frame.evaluate('window.DosMundosOutdoorLegacy.act("sport")')
        for _ in range(4):frame.evaluate('window.DosMundosOutdoorLegacy.act("sport")')
        before=self.progress();self.assertLess(before['energy'],10)
        result=frame.evaluate('window.DosMundosOutdoorLegacy.act("sport")');self.assertFalse(result['ok']);self.assertEqual(self.progress(),before);self.assertEqual(self.errors,[])
    def test_saved_exit_recovers_safely_and_walking_out_leaves_the_scene(self):
        game,frame,_=self.open_outdoor();game.get_by_role('button',name='Calle',exact=True).click()
        self.page.evaluate('localStorage.setItem("dos-mundos-exteriores-rpg-v1:park:jc:JC%20QA",JSON.stringify({version:1,position:{x:640,y:936,face:"down"}}))')
        game.locator('#places').get_by_role('button',name='Parque',exact=False).click();frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=24000)
        self.assertEqual(self.snap(frame)['position'],{'x':640,'y':878})
        self.page.keyboard.down('ArrowDown');expect(game.locator('#dm-outdoor-scene')).to_have_count(0,timeout=8000);self.page.keyboard.up('ArrowDown')
        expect(game.locator('#world')).to_be_visible();self.assertFalse(game.locator('#interior').evaluate('e=>e.inert'));self.assertEqual(self.errors,[])
    def test_chat_radio_and_shared_plans_remain_accessible_above_the_scene(self):
        game,frame,_=self.open_outdoor('plaza');before=self.progress()
        for label,selector in [('Teléfono y chat','#dm42-phone'),('Planes juntos','#dm61-overlay'),('Radio','#dm381-radio-panel'),('Conexión online','#dm41-panel')]:
            game.get_by_role('button',name='Opciones',exact=True).click();game.get_by_role('button',name=label,exact=True).click();expect(game.locator(selector)).to_be_visible()
            box=game.locator(selector).bounding_box();self.assertTrue(frame.evaluate('p=>{const e=document.elementFromPoint(p.x,p.y);return !!e?.closest(p.selector)}',{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'selector':selector}))
            if selector=='#dm42-phone':game.locator(selector).get_by_role('button',name='Cerrar',exact=True).click()
            elif selector=='#dm61-overlay':game.locator(selector).get_by_role('button',name='✕',exact=True).click()
            elif selector=='#dm41-panel':game.locator(selector).get_by_role('button',name='Ocultar ajustes',exact=True).click()
            else:game.locator(selector).get_by_role('button',name='Ocultar reproductor sin detener música',exact=True).click()
            self.assertTrue(self.snap(frame)['ready']);self.assertEqual(self.progress(),before)
        self.assertEqual(self.errors,[])
    def test_day_night_rain_and_reduced_motion_preserve_progress_in_both_scenes(self):
        self.page.emulate_media(reduced_motion='reduce')
        for place in ['park','plaza']:
            brightness=[]
            for label,day,time in [('dia',2,600),('noche',2,1260),('lluvia',8,600)]:
                game,frame,_=self.open_city(time=time,day=day);game.locator('#places').get_by_role('button',name='Parque' if place=='park' else 'Plaza',exact=False).click()
                frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=24000);before=self.progress();frame.wait_for_timeout(150)
                data=frame.evaluate('window.DosMundosOutdoorLegacy.snapshot()');self.assertEqual(data['time'],time)
                if label=='lluvia':self.assertTrue(data['weather']['isWet'])
                brightness.append(game.locator('#dm-outdoor-canvas').evaluate('''c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
                    let sum=0,n=0;for(let i=0;i<p.length;i+=128){sum+=p[i]+p[i+1]+p[i+2];n+=3;}return sum/n;}'''))
                self.page.screenshot(path=str(support.ARTIFACTS/f'{place}-{label}-iphone.png'));self.assertEqual(self.progress(),before)
            self.assertLess(brightness[1],brightness[0]*.85)
        self.assertEqual(self.errors,[])

if __name__=='__main__':
    # Only the new tests here; run city_browser separately for existing coverage.
    suite=unittest.TestSuite(OutdoorTests(n) for n in OutdoorTests.__dict__ if n.startswith('test_'))
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(not result.wasSuccessful())
