#!/usr/bin/env python3
"""Native actions, opt-in rewards, persistent plans and mobile UI; offline QA."""
import json
import unittest
from city_browser import CityTests
import browser_smoke as support
from playwright.sync_api import expect

class LifeTests(CityTests):
    def open_life(self,role='jc',profile=None,pantry=None):
        game,frame,values=self.open_city(role)
        frame.wait_for_function('!!window.DosMundosLife',timeout=20000)
        if profile is not None or pantry:
            who='Gabi%20QA:gabi' if role=='gabi' else 'JC%20QA:jc';key='dos-mundos-vida-v1:'+role+':'+('Gabi%20QA' if role=='gabi' else 'JC%20QA')
            self.page.evaluate('''v=>{if(v.profile!==null)localStorage.setItem(v.key,typeof v.profile==='string'?v.profile:JSON.stringify(v.profile));
                if(v.pantry){const k='dos-mundos-55-progreso:'+v.who,p=JSON.parse(localStorage.getItem(k));p.pantry=v.pantry;localStorage.setItem(k,JSON.stringify(p));}}''',{'profile':profile,'key':key,'pantry':pantry,'who':who})
            self.page.reload();game=self.page.frame_locator('#dm-frame');frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('!!window.DosMundosLife',timeout=20000)
        game.locator('#dm-city-actions>summary').click();game.get_by_role('button',name='Nuestros planes y personalidad',exact=True).click()
        expect(game.locator('#dm-life-modal')).to_be_visible();return game,frame,values
    def snap(self,frame):return frame.evaluate('window.DosMundosLife.getSnapshot()')
    def progress(self):return self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29"))')
    def close(self,game):game.locator('#dm-life-modal').get_by_role('button',name='Cerrar',exact=True).click()
    def reopen(self,frame,tab='plans'):frame.evaluate('tab=>window.DosMundosLife.open(tab)',tab)
    def test_profile_choices_are_free_persist_and_preserve_old_saves(self):
        game,frame,values=self.open_life();before=self.progress();game.get_by_role('button',name='Personalidad',exact=True).click()
        game.get_by_label('Creativo',exact=False).check();game.get_by_label('Casero',exact=False).check();game.get_by_label('Cocinar',exact=True).check();game.get_by_label('Telas aéreas',exact=True).check();game.get_by_label('Plato favorito',exact=True).select_option('omelet');game.get_by_role('button',name='Guardar mi personalidad').click()
        self.assertEqual(self.progress(),before);p=self.snap(frame)['profile'];self.assertEqual(p['traits'],['creative','homebody']);self.assertEqual(p['likes'],['cook','aerial'])
        self.page.screenshot(path=str(support.ARTIFACTS/'vida-personalidad-iphone.png'))
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'),values['dos-mundos-61-duo-v1'])
        self.page.reload();frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('!!window.DosMundosLife',timeout=20000);self.assertEqual(self.snap(frame)['profile'],p);self.assertEqual(self.errors,[])
    def test_real_reading_then_cooking_consumes_inspiration_once_and_keeps_recipe_costs(self):
        profile={'version':1,'configured':True,'traits':['creative','homebody'],'likes':['cook'],'favoriteFood':'omelet','moods':[]}
        game,frame,_=self.open_life(profile=profile,pantry={'egg':8,'veg':4});game.locator('[data-plan="dinner"]').get_by_role('button',name='Comenzar este plan').click();self.close(game)
        game.locator('#places').get_by_role('button',name='Casa',exact=False).click();frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready',timeout=22000)
        frame.evaluate('window.DosMundosLegacy.act("read")');self.assertEqual(self.snap(frame)['moods'][0]['id'],'inspired')
        self.reopen(frame,'moods');self.page.screenshot(path=str(support.ARTIFACTS/'vida-inspiracion-iphone.png'));self.close(game)
        before=self.progress();frame.evaluate('window.DosMundosLifeLegacy.recipes()');life=game.locator('#dm55-overlay');life.get_by_role('button',name='Tortilla casera',exact=False).click()
        frame.wait_for_function('window.DosMundosLife.getSnapshot().plans.dinner.members.jc.progress.cook')
        first=self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-55-progreso:JC%20QA:jc"))')
        self.assertEqual(first['skills']['cooking'],16);self.assertEqual(first['pantry'],{'egg':6,'veg':3});self.assertEqual(self.progress()['money'],before['money']);self.assertEqual(self.progress()['time'],before['time']+30)
        self.assertNotIn('inspired',[m['id'] for m in self.snap(frame)['moods']]);life.get_by_role('button',name='Tortilla casera',exact=False).click();frame.wait_for_timeout(50)
        second=self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-55-progreso:JC%20QA:jc"))');self.assertEqual(second['skills']['cooking'],30)
        self.assertEqual(len(self.snap(frame)['plans']['dinner']['members']['jc']['progress']),1);self.assertEqual(self.errors,[])
    def test_gym_records_distinct_real_sessions_and_rejected_actions_do_not_count(self):
        game,frame,_=self.open_life();game.locator('[data-plan="active"]').get_by_role('button',name='Comenzar este plan').click();self.close(game)
        game.locator('#places').get_by_role('button',name='Gimnasio',exact=False).click();frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=22000)
        for action in ['weights','weights','cardio','silks']:self.assertTrue(frame.evaluate('x=>window.DosMundosGymLegacy.act(x).ok',action))
        plan=self.snap(frame)['plans']['active'];self.assertEqual(set(plan['members']['jc']['progress']),{'strength','cardio','aerial'});self.assertNotIn('gabi',plan['members']);self.assertEqual(plan['status'],'active')
        for _ in range(5):frame.evaluate('window.DosMundosGymLegacy.act("weights")')
        before=self.snap(frame)['plans'];self.assertFalse(frame.evaluate('window.DosMundosGymLegacy.act("stretch-not-real").ok'));self.assertEqual(self.snap(frame)['plans'],before);self.assertEqual(self.errors,[])
    def test_madrid_counts_park_cafe_and_paid_time_in_cinema_but_not_free_menus(self):
        game,frame,_=self.open_life();game.locator('[data-plan="madrid"]').get_by_role('button',name='Comenzar este plan').click();self.close(game)
        game.locator('#places').get_by_role('button',name='Parque',exact=False).click();frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=22000);frame.evaluate('window.DosMundosOutdoorLegacy.act("walk")');game.get_by_role('button',name='Calle',exact=True).click()
        game.locator('#places').get_by_role('button',name='Cafetería',exact=False).click();game.get_by_role('button',name='Café de especialidad',exact=False).click();frame.wait_for_timeout(50);game.get_by_role('button',name='Salir del café',exact=True).click()
        game.locator('#places').get_by_role('button',name='🎬 Cine',exact=True).click();game.get_by_role('button',name='Mirar la cartelera',exact=False).click();self.assertEqual(set(self.snap(frame)['plans']['madrid']['members']['jc']['progress']),{'park','coffee'})
        game.get_by_role('button',name='Sentarse en las butacas',exact=False).click();frame.wait_for_timeout(50);self.assertEqual(set(self.snap(frame)['plans']['madrid']['members']['jc']['progress']),{'park','coffee','cinema'});self.assertEqual(self.errors,[])
    def test_plan_limit_leaving_and_offline_reload_keep_contributions(self):
        game,frame,_=self.open_life()
        for name in ['dinner','madrid']:game.locator('[data-plan="'+name+'"]').get_by_role('button',name='Comenzar este plan').click()
        game.locator('[data-plan="active"]').get_by_role('button',name='Comenzar este plan').click();expect(game.locator('.dm-life-message')).to_contain_text('dos planes activos');self.assertEqual(len(self.snap(frame)['plans']),2)
        self.close(game);game.locator('#places').get_by_role('button',name='Parque',exact=False).click();frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=22000);frame.evaluate('window.DosMundosOutdoorLegacy.act("walk")');self.reopen(frame)
        game.locator('[data-plan="madrid"]').get_by_role('button',name='Dejar este plan').click();self.page.reload();frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('!!window.DosMundosLife',timeout=22000)
        self.assertEqual(self.snap(frame)['plans']['madrid']['status'],'paused');self.assertIn('park',self.snap(frame)['plans']['madrid']['members']['jc']['progress']);self.assertGreater(self.snap(frame)['pending'],0);self.assertEqual(self.errors,[])
    def test_personality_is_owned_by_role_and_future_profile_is_never_rewritten(self):
        game,frame,_=self.open_life('gabi',profile={'version':99,'custom':'keep raw'});raw=self.page.evaluate('localStorage.getItem("dos-mundos-vida-v1:gabi:Gabi%20QA")');game.get_by_role('button',name='Personalidad',exact=True).click();expect(game.get_by_role('button',name='Guardar mi personalidad')).to_be_disabled()
        self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-vida-v1:gabi:Gabi%20QA")'),raw);self.assertEqual(self.snap(frame)['game']['role'],'gabi');self.assertEqual(self.errors,[])
    def test_profile_storage_failure_cannot_grant_a_bonus_or_replace_the_previous_mood(self):
        profile={'version':1,'configured':True,'traits':['creative'],'likes':['reading'],'moods':[]};game,frame,_=self.open_life(profile=profile);self.close(game);game.locator('#places').get_by_role('button',name='Casa',exact=False).click();frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready',timeout=22000)
        result=frame.evaluate('''()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('dos-mundos-vida-v1:'))throw new DOMException('QA quota','QuotaExceededError');return original.call(this,k,v)};try{window.DosMundosLegacy.act('read');return window.DosMundosLife.getSnapshot().profile;}finally{Storage.prototype.setItem=original;}}''')
        self.assertEqual(result['moods'],[]);self.assertEqual(self.progress()['skills']['estudio'],22);self.assertEqual(self.errors,[])
    def test_mobile_layout_focus_escape_and_phone_access_from_original_scenes(self):
        game,frame,_=self.open_life()
        for w,h in [(390,844),(375,667),(844,390),(1440,1100)]:
            self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(80)
            self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            for b in game.locator('#dm-life-modal button').all():
                if b.is_visible():box=b.bounding_box();self.assertGreaterEqual(box['height'],44);self.assertGreaterEqual(box['width'],44);self.assertLessEqual(box['x']+box['width'],w+.5)
            self.page.screenshot(path=str(support.ARTIFACTS/f'vida-planes-{w}x{h}.png'))
        self.close(game);self.page.set_viewport_size({'width':390,'height':844});game.locator('#places').get_by_role('button',name='Gimnasio',exact=False).click();frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=22000)
        self.reopen(frame,'profile');self.page.keyboard.press('Escape');expect(game.locator('#dm-life-modal')).to_have_count(0);expect(game.locator('#dm-gym-scene')).to_be_visible();self.assertFalse(game.locator('#dm-gym-scene').evaluate('e=>e.inert'))
        frame.evaluate('window.DosMundosLifeLegacy.phone()');game.locator('#dm42-phone').get_by_role('button',name='Nuestros planes y personalidad',exact=True).click();expect(game.locator('#dm-life-modal')).to_be_visible();self.close(game);expect(game.locator('#dm42-phone')).to_be_visible();self.assertEqual(self.errors,[])
    def test_completed_plans_extend_album_without_rewriting_existing_memories_or_running_titles(self):
        game,frame,values=self.open_life();self.close(game)
        frame.evaluate('''()=>{localStorage.setItem('dos-mundos-planes-v1',JSON.stringify({version:1,receipts:{},plans:{active:{id:'active',status:'completed',finishedAt:1700000000000,title:'<script>window.QA_XSS=true</script>',members:{jc:{progress:{aerial:{label:'Telas'}}},gabi:{progress:{cardio:{label:'Cardio'}}}}}}}));}''')
        self.page.reload();game=self.page.frame_locator('#dm-frame');frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('!!window.DosMundosLife',timeout=22000)
        frame.evaluate('window.DosMundosLifeLegacy.album()');expect(game.locator('.dm-life-album')).to_contain_text('<script>window.QA_XSS=true</script>');self.assertFalse(frame.evaluate('!!window.QA_XSS'));self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'),values['dos-mundos-61-duo-v1']);self.assertEqual(self.errors,[])
    def test_moods_survive_wall_clock_changes_and_expire_with_native_game_time(self):
        profile={'version':1,'configured':True,'traits':['creative'],'likes':[],'moods':[]};game,frame,_=self.open_life(profile=profile);self.close(game);game.locator('#places').get_by_role('button',name='Casa',exact=False).click();frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready',timeout=22000);frame.evaluate('window.DosMundosLegacy.act("read")');saved=self.snap(frame)['moods']
        self.page.add_init_script('Date.now=()=>2200000000000');self.page.reload();game=self.page.frame_locator('#dm-frame');frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('!!window.DosMundosLife',timeout=22000);self.assertEqual(self.snap(frame)['moods'],saved)
        game.locator('#places').get_by_role('button',name='Casa',exact=False).click();frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready',timeout=22000)
        for _ in range(2):frame.evaluate('window.DosMundosLegacy.act("rest")')
        self.assertNotIn('inspired',[m['id'] for m in self.snap(frame)['moods']]);self.assertEqual(self.errors,[])
    def test_plan_directions_leave_gym_and_cafe_with_their_native_cleanup(self):
        game,frame,_=self.open_life();game.locator('[data-plan="madrid"]').get_by_role('button',name='Comenzar este plan').click();self.close(game)
        game.locator('#places').get_by_role('button',name='Gimnasio',exact=False).click();frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=22000);self.reopen(frame)
        game.locator('[data-plan="madrid"]').get_by_role('button',name='Ir a la cafetería',exact=True).click();expect(game.locator('#dm-gym-scene')).to_have_count(0);expect(game.locator('#dm37-cafe-modal')).to_be_visible(timeout=22000)
        self.reopen(frame);game.locator('[data-plan="madrid"]').get_by_role('button',name='Ir al parque',exact=True).click();expect(game.locator('#dm37-cafe-modal')).to_have_count(0);frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=22000)
        game.get_by_role('button',name='Calle',exact=True).click();game.locator('#places').get_by_role('button',name='Tienda',exact=False).click();self.assertFalse(game.locator('#interior').evaluate('e=>e.inert'));self.assertEqual(self.errors,[])
    def test_library_inspiration_uses_its_existing_reading_skill(self):
        profile={'version':1,'configured':True,'traits':['creative'],'likes':[],'moods':[]};game,frame,_=self.open_life(profile=profile);self.close(game)
        game.locator('#places').get_by_role('button',name='Biblioteca',exact=False).click();game.get_by_role('button',name='Leer un capítulo',exact=False).click();game.get_by_role('button',name='Leer un capítulo',exact=False).click()
        frame.wait_for_timeout(100);life=self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-55-progreso:JC%20QA:jc"))');self.assertEqual(life['skills']['reading'],18);self.assertEqual(self.progress()['skills']['estudio'],12);self.assertEqual(self.errors,[])
    def test_returning_from_browser_cache_keeps_pending_plans_usable(self):
        game,frame,_=self.open_life();game.locator('[data-plan="active"]').get_by_role('button',name='Comenzar este plan').click();self.close(game)
        frame.evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));')
        game.locator('#places').get_by_role('button',name='Gimnasio',exact=False).click();frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=22000);frame.evaluate('window.DosMundosGymLegacy.act("silks")')
        self.assertIn('aerial',self.snap(frame)['plans']['active']['members']['jc']['progress']);self.assertEqual(self.snap(frame)['pending'],2);self.assertEqual(self.errors,[])

if __name__=='__main__':
    suite=unittest.TestSuite(LifeTests(n) for n in LifeTests.__dict__ if n.startswith('test_'))
    r=unittest.TextTestRunner(verbosity=2).run(suite);raise SystemExit(not r.wasSuccessful())
