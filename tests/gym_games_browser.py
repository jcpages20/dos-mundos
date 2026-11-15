#!/usr/bin/env python3
"""Play actual timed controls; preserve the original workout economy and saves."""
import unittest
import json
from gym_browser import GymTests
import browser_smoke as support
from playwright.sync_api import expect

class GymGamesTests(GymTests):
    def setup_game(self,type='weights',role='jc',practice=False,energy=82):
        game,frame,values=self.open_gym(role,energy=energy)
        life='dos-mundos-55-progreso:'+('Gabi%20QA:gabi' if role=='gabi' else 'JC%20QA:jc');frame.wait_for_function('k=>Number.isFinite(JSON.parse(localStorage.getItem(k))?.decorBaseline)',arg=life)
        self.open_challenge(game,frame,type)
        if practice:game.get_by_label('Ensayo gratis',exact=False).check()
        return game,frame,values
    def open_challenge(self,game,frame,type):
        game.get_by_role('button',name='Menú',exact=True).click();game.get_by_role('button',name={'weights':'Reto de fuerza','cardio':'Reto de cardio','silks':'Reto de telas','stretch':'Reto de movilidad'}[type],exact=True).click();expect(game.locator('#dm-gym-challenge')).to_be_visible(timeout=20000)
    def challenge(self,frame):return frame.evaluate('window.DosMundosGym.getSnapshot().challenge')
    def start(self,game,frame):game.get_by_role('button',name='Empezar reto',exact=True).click();frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge?.model')
    def strength(self,frame):
        for i in range(8):
            frame.wait_for_function('()=>{const s=window.DosMundosGym.getSnapshot().challenge.model;return s.cooldown<=0;}')
            self.page.keyboard.down('Space');frame.wait_for_function('()=>{const s=window.DosMundosGym.getSnapshot().challenge.model;return s.power>=s.targets[s.rep]-.015;}');self.page.keyboard.up('Space')
        frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="done"')
    def cardio(self,frame):
        notes=self.challenge(frame)['model']['notes']
        for n in notes:
            frame.wait_for_function('at=>window.DosMundosGym.getSnapshot().challenge.model.elapsed>=at-.025',arg=n['at'],timeout=6000)
            self.page.keyboard.press('ArrowLeft' if n['side']=='left' else 'ArrowRight')
        frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="done"',timeout=5000)
    def silks(self,game,frame):
        seq=self.challenge(frame)['model']['sequences'];mapping={'left':'ArrowLeft','right':'ArrowRight','up':'ArrowUp','down':'ArrowDown'}
        for i,sequence in enumerate(seq):
            frame.wait_for_function('i=>{const s=window.DosMundosGym.getSnapshot().challenge.model;return s.phase==="sequence"&&s.sequence===i;}',arg=i,timeout=6000)
            for d in sequence:self.page.keyboard.press(mapping[d])
        frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="balance"')
        self.page.keyboard.down('ArrowLeft');frame.wait_for_timeout(350);self.page.keyboard.up('ArrowLeft');self.page.keyboard.down('ArrowRight');frame.wait_for_timeout(400);self.page.keyboard.up('ArrowRight')
        self.page.screenshot(path=str(support.ARTIFACTS/'gym-retos-telas-equilibrio-iphone.png'))
        frame.wait_for_function('window.DosMundosGym.getSnapshot().challenge.phase==="figure"',timeout=8000)
        frame.wait_for_function('()=>{const t=window.DosMundosGym.getSnapshot().challenge.model.phaseTime;return t>.84&&t<1;}');self.page.keyboard.press('Space')
        expect(game.get_by_role('button',name='Guardar sesión y marca',exact=True)).to_be_visible();self.page.screenshot(path=str(support.ARTIFACTS/'gym-retos-telas-resultado-iphone.png'))

    def test_strength_is_playable_and_claims_native_rewards_exactly_once(self):
        game,frame,_=self.setup_game();before=self.progress(frame);self.start(game,frame);self.strength(frame)
        self.assertEqual(self.progress(frame),before);self.assertGreaterEqual(self.challenge(frame)['result']['score'],850)
        self.page.keyboard.press('Enter');after=self.progress(frame)
        self.assertEqual(after['time'],before['time']+60);self.assertEqual(after['sessions'],before['sessions']+1);self.assertEqual(after['fitnessXP'],before['fitnessXP']+20);self.assertEqual(after['money'],before['money'])
        state=frame.evaluate('window.DosMundosGymChallengeLegacy.snapshot()');id=state['active']['id'];result=self.challenge(frame)['result']
        response=frame.evaluate('a=>window.DosMundosGymChallengeLegacy.act(...a)',['weights',id,result]);self.assertTrue(response['already']);self.assertEqual(self.progress(frame),after);self.assertEqual(len(state['history']),1);self.assertEqual(self.errors,[])
    def test_cardio_uses_both_sides_and_retains_existing_session_effects(self):
        game,frame,_=self.setup_game('cardio');before=self.progress(frame);self.start(game,frame);self.cardio(frame)
        self.assertGreaterEqual(self.challenge(frame)['result']['hits'],10);game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();after=self.progress(frame)
        self.assertEqual(after['time'],before['time']+35);self.assertEqual(after['fitnessXP'],before['fitnessXP']+14);self.assertEqual(after['sessions'],before['sessions']+1);self.assertEqual(self.errors,[])
    def test_gabi_links_silks_sequences_balance_and_figure_with_original_identity(self):
        game,frame,_=self.setup_game('silks','gabi');before=self.progress(frame);self.start(game,frame);self.silks(game,frame)
        c=self.challenge(frame);self.assertEqual(self.scene(frame)['role'],'gabi');self.assertEqual(c['result']['errors'],0);self.assertGreater(c['result']['inputs'],6)
        game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();after=self.progress(frame);self.assertEqual(after['time'],before['time']+45);self.assertEqual(after['aerialXP'],before['aerialXP']+18);self.assertEqual(after['sessions'],before['sessions']+1)
        game.get_by_role('button',name='Volver al club',exact=True).click();game.get_by_role('button',name='Menú',exact=True).click();game.get_by_role('button',name='Mis marcas y códigos',exact=True).click();expect(game.locator('#dm-gym-challenge')).to_contain_text('Una secuencia en las telas');self.assertEqual(self.errors,[])
    def test_free_rehearsal_records_separately_and_does_not_change_native_progress(self):
        game,frame,_=self.setup_game('weights',practice=True);before=self.raw(frame);self.start(game,frame);self.strength(frame)
        game.get_by_role('button',name='Guardar ensayo',exact=True).click();self.assertEqual(self.raw(frame),before)
        records=frame.evaluate('window.DosMundosGymChallengeLegacy.snapshot()');self.assertEqual(records['bests'],{});self.assertEqual(records['history'][0]['practice'],True)
        game.get_by_role('button',name='Volver al club',exact=True).click();game.get_by_role('button',name='Menú',exact=True).click();game.get_by_role('button',name='Mis marcas y códigos',exact=True).click();expect(game.locator('#dm-gym-challenge')).to_contain_text('Ensayo · Fuerza');self.assertEqual(self.errors,[])
    def test_pause_hidden_page_and_reload_resume_without_awarding_early(self):
        game,frame,_=self.setup_game();before=self.progress(frame);self.start(game,frame);self.page.keyboard.down('Space');frame.wait_for_timeout(300);self.page.keyboard.up('Space');game.get_by_role('button',name='Pausa',exact=True).click()
        elapsed=self.challenge(frame)['model']['elapsed'];frame.wait_for_timeout(500);self.assertEqual(self.challenge(frame)['model']['elapsed'],elapsed);self.assertEqual(self.progress(frame),before)
        self.page.reload();game=self.page.frame_locator('#dm-frame');game.locator('#places').get_by_role('button',name='Gimnasio',exact=False).click();frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('window.DosMundosGym?.getSnapshot()?.ready',timeout=22000)
        self.open_challenge(game,frame,'weights');game.get_by_role('button',name='Retomar sesión',exact=True).click();expect(game.get_by_role('button',name='Continuar reto',exact=True)).to_be_visible(timeout=15000);self.assertEqual(self.challenge(frame)['model']['rep'],1);self.assertEqual(self.progress(frame)['time'],before['time']);self.assertEqual(self.errors,[])
    def test_saving_failure_rolls_back_workout_and_retry_does_not_duplicate_xp(self):
        game,frame,_=self.setup_game();self.start(game,frame);self.strength(frame);before=self.raw(frame)
        error=frame.evaluate('''()=>{const api=window.DosMundosGymChallengeLegacy,d=api.snapshot(),r=window.DosMundosGym.getSnapshot().challenge.result,old=Storage.prototype.setItem;
            Storage.prototype.setItem=function(k,v){if(k.startsWith('dos-mundos-gym-retos-v1:')&&JSON.parse(v).history.length)throw new DOMException('QA quota','QuotaExceededError');return old.call(this,k,v)};
            try{return api.act('weights',d.active.id,r);}finally{Storage.prototype.setItem=old;}}''')
        self.assertFalse(error['ok']);self.assertEqual(self.raw(frame),before);game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();self.assertEqual(self.progress(frame)['fitnessXP'],before['life']['skills'].get('fitness',0)+20);self.assertEqual(self.errors,[])
    def test_low_energy_requires_rehearsal_and_invalid_code_cannot_change_progress(self):
        game,frame,_=self.setup_game(energy=2);before=self.raw(frame);game.get_by_role('button',name='Empezar reto',exact=True).click();expect(game.locator('.gm-notice')).to_contain_text('energía');self.assertEqual(self.challenge(frame)['phase'],'briefing')
        game.get_by_role('combobox',name='Dificultad del reto',exact=True).select_option('suave');code=game.get_by_role('textbox',name='Código de reto',exact=True);self.assertIn('-S-',code.input_value());code.fill('ATLAS-X-N-123456');game.get_by_role('button',name='Jugar este código',exact=True).click();expect(game.locator('.gm-notice')).to_contain_text('Escribe un código');self.assertEqual(self.raw(frame),before);self.assertEqual(self.errors,[])
    def test_same_code_routes_to_its_equipment_and_mobile_controls_fit(self):
        game,frame,_=self.setup_game();code=game.get_by_role('textbox',name='Código de reto',exact=True);code.fill('ATLAS-T-S-000B15');game.get_by_role('button',name='Jugar este código',exact=True).click();expect(game.locator('#dm-gym-challenge h2')).to_contain_text('telas',timeout=18000);self.start(game,frame)
        self.assertEqual(self.challenge(frame)['code'],'ATLAS-T-S-000B15')
        for w,h in [(390,844),(375,667),(375,480),(844,390),(1440,1100)]:
            self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(100);self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            for b in game.locator('#dm-gym-challenge button').all():
                if b.is_visible():box=b.bounding_box();self.assertGreaterEqual(box['height'],44);self.assertGreaterEqual(box['width'],44);self.assertLessEqual(box['x']+box['width'],w+.5)
            self.page.screenshot(path=str(support.ARTIFACTS/f'gym-retos-{w}x{h}.png'))
        self.assertEqual(self.errors,[])
    def test_leaving_with_active_challenge_saves_safe_approach_and_preserves_old_features(self):
        game,frame,_=self.setup_game('silks');before=self.progress(frame);self.start(game,frame);game.get_by_role('button',name='Calle',exact=True).click();expect(game.locator('#dm-gym-scene')).to_have_count(0)
        raw=self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-gym-rpg-v1:jc:JC%20QA"))');self.assertEqual(raw['position']['y'],748)
        game.locator('#goHome').click();frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready',timeout=22000);self.assertEqual(frame.evaluate('window.DosMundosLegacy.snapshot().time'),before['time']);self.assertEqual(self.errors,[])
    def test_mobility_hold_release_restores_energy_and_keeps_its_original_xp(self):
        game,frame,_=self.setup_game('stretch');before=self.progress(frame);self.start(game,frame)
        for i in range(5):
            frame.wait_for_function('t=>window.DosMundosGym.getSnapshot().challenge.model.elapsed>=t',arg=i*4);self.page.keyboard.down('Space');frame.wait_for_function('t=>window.DosMundosGym.getSnapshot().challenge.model.elapsed>=t',arg=i*4+2);self.page.keyboard.up('Space')
        expect(game.get_by_role('button',name='Guardar sesión y marca',exact=True)).to_be_visible(timeout=5000);self.assertGreater(self.challenge(frame)['result']['aligned'],90);game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();after=self.progress(frame)
        self.assertEqual(after['time'],before['time']+20);self.assertEqual(after['fitnessXP'],before['fitnessXP']+6);self.assertGreater(after['energy'],before['energy']);self.assertEqual(self.errors,[])
    def test_failed_reward_cannot_leave_mood_or_couple_plan_progress_in_memory(self):
        game,frame,_=self.setup_game();frame.evaluate('window.DosMundosLife.open("profile")');game.get_by_label('Deportista',exact=False).check();game.get_by_role('button',name='Guardar mi personalidad').click();game.get_by_role('button',name='Planes',exact=True).click();game.locator('[data-plan="active"]').get_by_role('button',name='Comenzar este plan').click();game.locator('#dm-life-modal').get_by_role('button',name='Cerrar',exact=True).click()
        self.start(game,frame);self.strength(frame);before=frame.evaluate('window.DosMundosLife.getSnapshot()')
        response=frame.evaluate('''()=>{const api=window.DosMundosGymChallengeLegacy,d=api.snapshot(),r=window.DosMundosGym.getSnapshot().challenge.result,old=Storage.prototype.setItem;
            Storage.prototype.setItem=function(k,v){if(k.startsWith('dos-mundos-gym-retos-v1:')&&JSON.parse(v).history.length)throw new DOMException('QA quota','QuotaExceededError');return old.call(this,k,v)};
            try{return api.act('weights',d.active.id,r);}finally{Storage.prototype.setItem=old;}}''')
        self.assertFalse(response['ok']);after=frame.evaluate('window.DosMundosLife.getSnapshot()');self.assertEqual(after['profile'],before['profile']);self.assertEqual(after['plans'],before['plans']);self.assertEqual(after['game']['clock'],before['game']['clock'])
        game.get_by_role('button',name='Guardar sesión y marca',exact=True).click();final=frame.evaluate('window.DosMundosLife.getSnapshot()');self.assertIn('strength',final['plans']['active']['members']['jc']['progress']);self.assertEqual(final['pending'],before['pending']+1);self.assertEqual(self.errors,[])

if __name__=='__main__':
    suite=unittest.TestSuite(GymGamesTests(n) for n in GymGamesTests.__dict__ if n.startswith('test_'));r=unittest.TextTestRunner(verbosity=2).run(suite);raise SystemExit(not r.wasSuccessful())
