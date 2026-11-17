#!/usr/bin/env python3
"""Play 45-second routines with actual keys/touch controls and disposable saves."""
import json
import unittest
from pathlib import Path
from gym_games_browser import GymGamesTests
import browser_smoke as support
from playwright.sync_api import expect


class GymRoutineTests(GymGamesTests):
    def open_challenge(self,game,frame,type):
        super().open_challenge(game,frame,type)
        if game.get_by_role('combobox',name='Formato del entrenamiento',exact=True).count():game.get_by_role('combobox',name='Formato del entrenamiento',exact=True).select_option('routine')

    def run_routine(self,game,frame,risk='safe',capture=False):
        """Read timing for assertions; all actions use browser keyboard/clicks."""
        self.start(game,frame)
        for round in range(3):
            frame.wait_for_function('i=>{const s=window.DosMundosGym.getSnapshot().challenge.model;return s.phase==="choose"&&s.round===i}',arg=round,timeout=10000)
            game.locator('[data-risk="'+risk+'"]').click()
            frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="exercise"',timeout=4000)
            s=self.challenge(frame)['model'];type=s['type']
            if type=='weights':
                for rep in range(3):
                    frame.wait_for_function('()=>window.DosMundosGym.getSnapshot().challenge.model.cooldown<=0')
                    self.page.keyboard.down('Space')
                    frame.wait_for_function('()=>{const s=window.DosMundosGym.getSnapshot().challenge.model;return s.power>=s.plan[s.round].targets[s.rep]-.015}',timeout=2000)
                    self.page.keyboard.up('Space')
                if capture and round==1:self.page.screenshot(path=str(support.ARTIFACTS/'gym-rutinas-fuerza-iphone.png'))
            elif type=='cardio':
                for n in s['notes']:
                    frame.wait_for_function('at=>window.DosMundosGym.getSnapshot().challenge.model.phaseTime>=at-.02',arg=n['at'],timeout=3000)
                    self.page.keyboard.press('ArrowLeft' if n['side']=='left' else 'ArrowRight')
                if capture and round==1:self.page.screenshot(path=str(support.ARTIFACTS/'gym-rutinas-cardio-iphone.png'))
            elif type=='silks':
                self.page.keyboard.down('Space')
                frame.wait_for_function('h=>window.DosMundosGym.getSnapshot().challenge.model.height>=h',arg=.82 if risk=='bold' else .57,timeout=2900)
                self.page.keyboard.up('Space')
                frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.model.phaseTime>=3',timeout=2000)
                held=None
                while True:
                    s=self.challenge(frame)['model']
                    if s['phaseTime']>=6 and abs(s['balance'])<.11:break
                    if s['phaseTime']>=7.4:break
                    key='ArrowLeft' if s['balance']>.015 else 'ArrowRight' if s['balance']<-.015 else None
                    if key!=held:
                        if held:self.page.keyboard.up(held)
                        if key:self.page.keyboard.down(key)
                        held=key
                    if capture and round==0 and 4<s['phaseTime']<4.3:self.page.screenshot(path=str(support.ARTIFACTS/'gym-rutinas-telas-iphone.png'))
                    frame.wait_for_timeout(60)
                if held:self.page.keyboard.up(held)
                self.page.keyboard.press('Space')
            else:
                held=False
                while True:
                    s=self.challenge(frame)['model']
                    if s['phase']!='exercise':break
                    period=5 if risk=='bold' else 4
                    wanted=s['phaseTime']%period<period/2
                    if wanted!=held:
                        self.page.keyboard.down('Space') if wanted else self.page.keyboard.up('Space');held=wanted
                    frame.wait_for_timeout(60)
                if held:self.page.keyboard.up('Space')
        frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="finale"',timeout=10000)
        if type=='weights':
            self.page.keyboard.down('Space');frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.model.finalHold>=1.98');self.page.keyboard.up('Space')
        elif type=='silks':
            self.page.keyboard.down('Space');frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.model.height<=.09',timeout=7000);self.page.keyboard.up('Space')
        elif type=='cardio':
            for n in self.challenge(frame)['model']['notes']:
                frame.wait_for_function('at=>window.DosMundosGym.getSnapshot().challenge.model.phaseTime>=at-.02',arg=n['at'],timeout=3000)
                self.page.keyboard.press('ArrowLeft' if n['side']=='left' else 'ArrowRight')
        else:
            held=False
            while self.challenge(frame)['phase']=='finale':
                s=self.challenge(frame)['model'];wanted=s['phaseTime']%4<2
                if wanted!=held:
                    self.page.keyboard.down('Space') if wanted else self.page.keyboard.up('Space');held=wanted
                frame.wait_for_timeout(60)
            if held:self.page.keyboard.up('Space')
        frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="done"',timeout=12000)
        label='Guardar ensayo' if self.career(frame)['active']['practice'] else 'Guardar sesión y marca'
        expect(game.get_by_role('button',name=label,exact=True)).to_be_visible(timeout=2000)
        return self.challenge(frame)['result']

    def career(self,frame):return frame.evaluate('window.DosMundosGymChallengeLegacy.snapshot()')

    def test_gabi_two_real_routines_unlock_figures_and_worn_accessory_persists(self):
        game,frame,_=self.setup_game('silks','gabi');before=self.progress(frame)
        result=self.run_routine(game,frame,'bold',True);self.assertEqual(result['elapsed'],45);self.assertTrue(result['effort']);self.assertGreater(result['score'],800);self.assertEqual(self.progress(frame),before)
        game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();after=self.progress(frame)
        self.assertEqual(after['time'],before['time']+45);self.assertEqual(after['aerialXP'],before['aerialXP']+18);self.assertEqual(after['sessions'],before['sessions']+1)
        self.assertEqual(self.career(frame)['journey']['sessions'],1);expect(game.locator('.gm-earned')).to_contain_text('Muñequeras Atlas')
        game.get_by_role('button',name='Volver al club',exact=True).click();game.get_by_role('button',name='Menú',exact=True).click();game.get_by_role('button',name='Mis rutinas y accesorios',exact=True).click();game.get_by_role('button',name='Usar Muñequeras Atlas',exact=True).click()
        self.assertEqual(self.scene(frame)['accessory'],'wraps');self.assertEqual(self.progress(frame),after);self.page.screenshot(path=str(support.ARTIFACTS/'gym-rutinas-armario-iphone.png'))
        game.get_by_role('button',name='Volver al club',exact=True).click();self.open_challenge(game,frame,'silks');self.run_routine(game,frame,'safe');game.get_by_role('button',name='Guardar sesión y marca',exact=True).click()
        self.assertEqual(self.career(frame)['journey']['sports']['silks'],2);expect(game.locator('.gm-earned')).to_contain_text('Vela y mariposa');self.page.screenshot(path=str(support.ARTIFACTS/'gym-rutinas-desbloqueo-iphone.png'))
        game.get_by_role('button',name='Volver al club',exact=True).click();self.open_challenge(game,frame,'silks');game.get_by_role('combobox',name='Rutina de Atlas',exact=True).select_option('flow');self.start(game,frame)
        frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="choose"',timeout=8000);game.locator('[data-risk="bold"]').click();frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="exercise"')
        self.page.keyboard.down('Space');frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.model.height>=.82');self.page.keyboard.up('Space');frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.model.phaseTime>=3.5');self.assertEqual(self.challenge(frame)['model']['figure'],'butterfly');self.page.screenshot(path=str(support.ARTIFACTS/'gym-rutinas-mariposa-iphone.png'))
        game.get_by_role('button',name='Pausa',exact=True).click();self.page.reload();game=self.page.frame_locator('#dm-frame');game.locator('#places').get_by_role('button',name='Gimnasio',exact=False).click();frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=25000)
        self.assertEqual(self.scene(frame)['accessory'],'wraps');self.assertEqual(self.career(frame)['journey']['sports']['silks'],2);self.assertEqual(self.errors,[])

    def test_strength_risk_and_final_hold_keep_native_reward_unique(self):
        game,frame,_=self.setup_game('weights');before=self.progress(frame);result=self.run_routine(game,frame,'bold',True);self.assertGreater(result['score'],900);self.assertEqual(self.progress(frame),before)
        game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();after=self.progress(frame);self.assertEqual(after['fitnessXP'],before['fitnessXP']+20);self.assertEqual(after['time'],before['time']+60);self.assertEqual(after['money'],before['money'])
        d=self.career(frame);r=frame.evaluate('a=>window.DosMundosGymChallengeLegacy.act(...a)',['weights',d['active']['id'],result]);self.assertTrue(r['already']);self.assertEqual(self.career(frame)['journey']['sessions'],1);self.assertEqual(self.progress(frame),after);self.assertEqual(self.errors,[])

    def test_cardio_intervals_are_played_with_both_feet_and_real_distance(self):
        game,frame,_=self.setup_game('cardio');before=self.progress(frame);result=self.run_routine(game,frame,'bold',True);self.assertGreater(result['score'],900);self.assertGreater(self.challenge(frame)['model']['distance'],100)
        game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();after=self.progress(frame);self.assertEqual(after['time'],before['time']+35);self.assertEqual(after['fitnessXP'],before['fitnessXP']+14);self.assertEqual(after['sessions'],before['sessions']+1);self.assertEqual(self.errors,[])

    def test_mobility_cycles_and_closing_keep_the_original_recovery(self):
        game,frame,_=self.setup_game('stretch');before=self.progress(frame);result=self.run_routine(game,frame,'safe');self.assertGreater(result['score'],700)
        game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();after=self.progress(frame);self.assertEqual(after['time'],before['time']+20);self.assertEqual(after['fitnessXP'],before['fitnessXP']+6);self.assertGreater(after['energy'],before['energy']);self.assertEqual(self.errors,[])

    def test_locked_routine_can_be_rehearsed_without_unlocks_or_native_effects(self):
        game,frame,_=self.setup_game('weights');before=self.raw(frame);game.get_by_role('combobox',name='Rutina de Atlas',exact=True).select_option('flow');game.get_by_role('button',name='Empezar reto',exact=True).click();expect(game.locator('.gm-notice')).to_contain_text('dos rutinas');self.assertEqual(self.challenge(frame)['phase'],'briefing')
        game.get_by_label('Ensayo gratis',exact=False).check();self.run_routine(game,frame,'bold');game.get_by_role('button',name='Guardar ensayo',exact=True).click();self.assertEqual(self.raw(frame),before);d=self.career(frame);self.assertEqual(d['journey']['sessions'],0);self.assertEqual(d['bests'],{});self.assertTrue(d['history'][0]['practice']);self.assertEqual(self.errors,[])

    def test_quota_failure_rolls_back_unlocks_and_retry_preserves_old_records(self):
        game,frame,_=self.setup_game('weights');frame.evaluate('''()=>{const k='dos-mundos-gym-retos-v1:jc:JC%20QA';localStorage.setItem(k,JSON.stringify({version:1,bests:{'weights:normal':{type:'weights',level:'normal',score:700,medal:'Plata',seed:1}},history:[],active:null,future:'keep'}));}''')
        self.run_routine(game,frame,'safe');before=self.raw(frame);d=self.career(frame)
        r=frame.evaluate('''()=>{const api=window.DosMundosGymChallengeLegacy,d=api.snapshot(),r=window.DosMundosGym.getSnapshot().challenge.result,old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('dos-mundos-gym-retos-v1:')&&JSON.parse(v).journey?.sessions)throw new DOMException('QA quota','QuotaExceededError');return old.call(this,k,v)};try{return api.act('weights',d.active.id,r)}finally{Storage.prototype.setItem=old}}''')
        self.assertFalse(r['ok']);self.assertEqual(self.raw(frame),before);self.assertEqual(self.career(frame)['journey']['sessions'],0);game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();after=self.career(frame);self.assertEqual(after['journey']['sessions'],1);self.assertEqual(after['future'],'keep');self.assertEqual(after['bests']['weights:normal']['score'],700);self.assertIn('weights:normal:routine:base',after['bests']);self.assertEqual(self.errors,[])

    def test_reload_recovers_risk_and_paused_timer_without_granting_progress(self):
        game,frame,_=self.setup_game('silks');before=self.progress(frame);self.start(game,frame);frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="choose"',timeout=8000);game.locator('[data-risk="bold"]').click();frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="exercise"');self.page.keyboard.down('Space');frame.wait_for_timeout(500);game.get_by_role('button',name='Pausa',exact=True).click();self.page.keyboard.up('Space');elapsed=self.challenge(frame)['model']['elapsed'];frame.wait_for_timeout(300);self.assertEqual(self.challenge(frame)['model']['elapsed'],elapsed)
        self.page.reload();game=self.page.frame_locator('#dm-frame');game.locator('#places').get_by_role('button',name='Gimnasio',exact=False).click();frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=25000);self.open_challenge(game,frame,'silks');game.get_by_role('button',name='Retomar sesión',exact=True).click();expect(game.get_by_role('button',name='Continuar reto',exact=True)).to_be_visible(timeout=15000)
        s=self.challenge(frame);self.assertEqual(s['engine'],'routine');self.assertTrue(s['paused']);self.assertEqual(s['model']['choices'][0],'bold');self.assertEqual(s['model']['held'],[]);self.assertEqual(self.progress(frame)['time'],before['time']);self.assertEqual(self.career(frame)['journey']['sessions'],0);self.assertEqual(self.errors,[])

    def test_new_codes_risk_buttons_and_phone_layouts_remain_usable(self):
        game,frame,_=self.setup_game('weights');code=game.get_by_role('textbox',name='Código de reto',exact=True);code.fill('ATLAS2-T-S-B-000B15 · 930/1000');game.get_by_role('button',name='Jugar este código',exact=True).click();expect(game.locator('#dm-gym-challenge h2')).to_contain_text('telas',timeout=18000);self.start(game,frame);frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="choose"',timeout=8000)
        self.assertEqual(self.challenge(frame)['code'],'ATLAS2-T-S-B-000B15');game.locator('[data-risk="bold"]').click();frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="exercise"');self.page.keyboard.down('Space');frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.model.height>=.82');self.page.keyboard.up('Space');game.get_by_role('button',name='Pausa',exact=True).click()
        for w,h in [(390,844),(375,667),(375,480),(844,390),(1440,1100)]:
            self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(80);self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            for b in game.locator('#dm-gym-challenge button').all():
                if b.is_visible():box=b.bounding_box();self.assertGreaterEqual(box['height'],44);self.assertGreaterEqual(box['width'],44);self.assertLessEqual(box['x']+box['width'],w+.5)
            self.page.screenshot(path=str(support.ARTIFACTS/f'gym-rutinas-{w}x{h}.png'))
        self.assertEqual(self.errors,[])

    def test_future_wardrobe_is_preserved_and_personal_accessory_cannot_be_claimed_early(self):
        game,frame,_=self.setup_game('silks','gabi');before=self.raw(frame,'gabi');r=frame.evaluate('window.DosMundosGymChallengeLegacy.equip("medal")');self.assertFalse(r['ok']);self.assertEqual(self.raw(frame,'gabi'),before)
        key='dos-mundos-gym-retos-v1:gabi:Gabi%20QA';value=json.dumps({'version':1,'bests':{},'history':[],'active':None,'journey':{'version':99,'sessions':20,'sports':{},'equipped':'none'}});frame.evaluate('([k,v])=>localStorage.setItem(k,v)',[key,value]);game.get_by_role('button',name='Empezar reto',exact=True).click();expect(game.locator('.gm-notice')).to_contain_text('armario se conserva');self.assertEqual(frame.evaluate('k=>localStorage.getItem(k)',key),value);self.assertEqual(self.errors,[])

    def test_wardrobe_previews_and_own_equipment_fit_phone_and_landscape(self):
        game,frame,_=self.setup_game('silks','gabi');before=self.raw(frame,'gabi')
        jc=json.dumps({'version':1,'bests':{},'history':[],'active':None,'journey':{'version':1,'sessions':6,'sports':{'weights':6},'equipped':'medal'}})
        frame.evaluate('''jc=>{localStorage.setItem('dos-mundos-gym-retos-v1:jc:JC%20QA',jc);localStorage.setItem('dos-mundos-gym-retos-v1:gabi:Gabi%20QA',JSON.stringify({version:1,bests:{},history:[],active:null,journey:{version:1,sessions:1,sports:{silks:1},equipped:'none'}}))}''',jc)
        game.get_by_role('button',name='Volver al club',exact=True).click();game.get_by_role('button',name='Menú',exact=True).click();game.get_by_role('button',name='Mis rutinas y accesorios',exact=True).click();game.get_by_role('button',name='Usar Muñequeras Atlas',exact=True).click()
        self.assertEqual(self.scene(frame)['accessory'],'wraps');self.assertEqual(self.raw(frame,'gabi'),before);self.assertEqual(frame.evaluate('localStorage.getItem("dos-mundos-gym-retos-v1:jc:JC%20QA")'),jc)
        self.assertEqual(game.locator('.gm-accessory-preview').count(),4)
        for c in game.locator('.gm-accessory-preview').all():self.assertGreater(c.evaluate('c=>new Set(c.getContext("2d").getImageData(0,0,100,100).data).size'),20)
        for w,h in [(390,844),(375,480),(844,390)]:
            self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(80);self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            for b in game.locator('.gm-wardrobe button').all():
                box=b.bounding_box();self.assertGreaterEqual(box['height'],44);self.assertGreaterEqual(box['width'],44);self.assertLessEqual(box['x']+box['width'],w+.5)
            self.page.screenshot(path=str(support.ARTIFACTS/f'gym-rutinas-armario-{w}x{h}.png'))
        self.assertEqual(self.errors,[])

    def test_real_touch_hold_release_and_background_pause_do_not_double_a_rep(self):
        game,frame,_=self.setup_game('weights');before=self.progress(frame);self.start(game,frame);frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="choose"',timeout=8000)
        box=game.locator('[data-risk="bold"]').bounding_box();self.page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2);frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="exercise"')
        box=game.locator('.gm-input[data-action="action"]').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2;cdp=self.context.new_cdp_session(self.page)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':0}]});frame.wait_for_function('()=>{const s=window.DosMundosGym.getSnapshot().challenge.model;return s.power>=s.plan[s.round].targets[0]}');cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        self.assertEqual(self.challenge(frame)['model']['rep'],1);self.assertEqual(self.challenge(frame)['model']['reps'],[1]);self.assertEqual(self.challenge(frame)['model']['choices'][0],'bold')
        frame.wait_for_timeout(450);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':0}]});frame.wait_for_timeout(100);frame.evaluate('window.dispatchEvent(new Event("blur"))');cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        s=self.challenge(frame);self.assertTrue(s['paused']);self.assertEqual(s['model']['held'],[]);self.assertEqual(s['model']['rep'],1);self.assertEqual(self.progress(frame),before);self.assertEqual(self.errors,[])


if __name__=='__main__':
    names=__import__('sys').argv[1:]
    suite=unittest.TestSuite(GymRoutineTests(n) for n in GymRoutineTests.__dict__ if n.startswith('test_') and (not names or n in names))
    r=unittest.TextTestRunner(verbosity=2).run(suite);raise SystemExit(not r.wasSuccessful())
