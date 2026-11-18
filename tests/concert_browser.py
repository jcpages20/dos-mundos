#!/usr/bin/env python3
"""Concerts with disposable mobile profiles. No real Firebase accounts or audio."""
import json
import unittest
from city_browser import CityTests
from playwright.sync_api import expect
import browser_smoke as support

class ConcertTests(CityTests):
    def open_park(self,role='jc'):
        game,frame,values=self.open_city(role)
        game.locator('#places').get_by_role('button',name='Parque',exact=False).click()
        frame.wait_for_function('window.DosMundosOutdoors?.getSnapshot()?.ready',timeout=24000)
        return game,frame,values
    def enter_concert(self,game,frame,index=0):
        game.get_by_role('button',name='Ver conciertos del Retiro',exact=True).click()
        cards=game.locator('.dm-concert-card');self.assertEqual(cards.count(),3);artist=cards.nth(index).get_attribute('data-artist')
        cards.nth(index).get_by_role('button').click()
        frame.wait_for_function('window.DosMundosConcerts.getSnapshot()?.ready',timeout=22000)
        return artist
    def concert(self,frame):return frame.evaluate('window.DosMundosConcerts.getSnapshot()')
    def progress(self):return self.page.evaluate('localStorage.getItem("dos-mundos-v29")')
    def test_physical_entry_original_roles_free_actions_and_return_to_same_park(self):
        for role in ['jc','gabi']:
            game,frame,values=self.open_park(role);before=self.progress();artist=self.enter_concert(game,frame)
            s=self.concert(frame);self.assertEqual(s['artist'],artist);self.assertEqual(s['role'],role);self.assertIsNone(s['peer']);self.assertEqual(frame.evaluate('window.DosMundosOutdoors.getSnapshot().position'),{'x':214,'y':737})
            game.get_by_role('button',name='Bailar',exact=True).click();self.assertEqual(self.concert(frame)['pose'],'dance');game.get_by_role('button',name='Dejar de bailar',exact=True).click()
            game.get_by_role('button',name='Aplaudir',exact=True).click();self.assertEqual(self.concert(frame)['pose'],'clap');game.get_by_role('button',name='Pedir otra',exact=True).click();self.assertTrue(self.concert(frame)['encore'])
            presence=frame.evaluate('window.DosMundosOutdoorLegacy.presence()');frame.wait_for_timeout(60);presence=frame.evaluate('window.DosMundosOutdoorLegacy.presence()');self.assertEqual(presence['room'],'park');self.assertIn(artist,presence['place']);self.assertEqual(set(presence),{'name','x','y','room','place','roomX','roomY','face','online','updated'})
            game.get_by_role('button',name='Volver al parque',exact=True).click();self.assertIsNone(self.concert(frame));self.assertFalse(game.locator('#dm-outdoor-canvas').evaluate('e=>e.inert'));self.assertEqual(frame.evaluate('window.DosMundosOutdoorLegacy.presence().place'),'park');self.assertEqual(self.progress(),before)
            game.get_by_role('button',name='Calle',exact=True).click();expect(game.locator('#dm-outdoor-scene')).to_have_count(0);self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'),values['dos-mundos-61-duo-v1']);self.assertEqual(self.errors,[])
    def test_touch_walk_stays_on_the_floor_and_keyboard_stops_after_release(self):
        game,frame,_=self.open_park();self.enter_concert(game,frame);c=game.locator('.dm-concert-stage canvas');box=c.bounding_box()
        # Renderer centres the fixed logical stage; convert a free floor point.
        def tap(x,y):
            view=self.concert(frame)['view'];self.page.mouse.click(box['x']+view['offset']['x']+x*view['scale'],box['y']+view['offset']['y']+y*view['scale'])
        tap(438,490);frame.wait_for_function('()=>{const s=window.DosMundosConcerts.getSnapshot();return !s.walking&&Math.abs(s.position.y-490)<3}')
        tap(480,150);frame.wait_for_timeout(120);self.assertGreater(self.concert(frame)['position']['y'],380)
        c.focus();self.page.keyboard.down('ArrowRight');frame.wait_for_timeout(220);self.page.keyboard.up('ArrowRight');a=self.concert(frame)['position'];frame.wait_for_timeout(150);self.assertEqual(self.concert(frame)['position'],a);self.assertEqual(self.errors,[])
    def test_one_memory_per_gig_survives_reload_and_extends_existing_album(self):
        game,frame,values=self.open_park('gabi');before=self.progress();self.enter_concert(game,frame)
        game.get_by_role('button',name='Guardar mi recuerdo',exact=True).click();game.get_by_role('button',name='Recuerdo guardado',exact=True).click();self.assertEqual(len(self.concert(frame)['memories']),1);self.assertEqual(self.progress(),before)
        game.get_by_role('button',name='Volver al parque',exact=True).click();game.get_by_role('button',name='Calle',exact=True).click();frame.evaluate('window.DosMundosLifeLegacy.album()');expect(game.locator('.dm-concert-album')).to_be_visible();self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'),values['dos-mundos-61-duo-v1'])
        self.page.reload();game=self.page.frame_locator('#dm-frame');frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('!!window.DosMundosConcerts',timeout=22000);frame.evaluate('window.DosMundosLifeLegacy.album()');self.assertEqual(game.locator('.dm-concert-memory').count(),1);self.assertEqual(self.errors,[])
    def test_spotify_loads_only_after_user_action_and_is_removed_on_close(self):
        game,frame,_=self.open_park();self.enter_concert(game,frame);self.assertEqual(self.remote,[])
        game.get_by_role('button',name='Escuchar canción',exact=True).click();expect(game.locator('.dm-concert-player iframe')).to_have_count(1);url=game.locator('.dm-concert-player iframe').get_attribute('src');self.assertTrue(url.startswith('https://open.spotify.com/embed/track/'))
        self.assertGreaterEqual(game.locator('.dm-concert-player a').count(),1);game.get_by_role('button',name='Cerrar música',exact=True).click();expect(game.locator('.dm-concert-player iframe')).to_have_count(0);self.assertIsNotNone(self.concert(frame));self.page.keyboard.press('Escape');self.assertIsNone(self.concert(frame));self.assertEqual(self.errors,[])
    def test_mobile_layout_focus_reduced_motion_and_original_scenes_remain_available(self):
        self.page.emulate_media(reduced_motion='reduce');game,frame,_=self.open_park();self.enter_concert(game,frame)
        for w,h in [(390,844),(375,667),(844,390),(1280,900)]:
            self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(100);self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'));canvas=game.locator('.dm-concert-stage canvas').bounding_box();self.assertGreater(canvas['height'],130)
            for b in game.locator('#dm-concert-view button').all():
                if b.is_visible():box=b.bounding_box();self.assertGreaterEqual(box['height'],44);self.assertGreaterEqual(box['width'],44);self.assertGreaterEqual(box['x'],0);self.assertLessEqual(box['x']+box['width'],w+.5);self.assertLessEqual(box['y']+box['height'],h+.5)
            self.page.screenshot(path=str(support.ARTIFACTS/f'concierto-{w}x{h}.png'))
        self.page.set_viewport_size({'width':390,'height':844});self.page.keyboard.press('Escape');game.get_by_role('button',name='Calle',exact=True).click();game.locator('#places').get_by_role('button',name='Casa',exact=False).click();frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready',timeout=22000);expect(game.locator('#dm-house-scene')).to_be_visible();self.assertEqual(self.errors,[])
    def test_all_current_acts_have_working_art_and_visiting_does_not_change_the_bill(self):
        game,frame,_=self.open_park();ids=[]
        for i in range(3):
            ids.append(self.enter_concert(game,frame,i));self.assertTrue(game.locator('.dm-concert-stage canvas').evaluate('c=>Array.from(c.getContext("2d").getImageData(0,0,c.width,c.height).data).some(x=>x>0)'));game.get_by_role('button',name='Volver al parque',exact=True).click()
        self.assertEqual(len(set(ids)),3);game.get_by_role('button',name='Ver conciertos del Retiro',exact=True).click();self.assertEqual(game.locator('.dm-concert-card').evaluate_all('cs=>cs.map(c=>c.dataset.artist)'),ids);self.assertEqual(self.errors,[])
    def test_camera_keeps_player_visible_near_the_far_path_after_rotating(self):
        game,frame,_=self.open_park();self.enter_concert(game,frame);game.locator('.dm-concert-stage canvas').focus();self.page.keyboard.down('ArrowDown');frame.wait_for_timeout(1800);self.page.keyboard.up('ArrowDown');self.assertGreater(self.concert(frame)['position']['y'],850)
        for w,h in [(390,844),(844,390),(375,667)]:
            self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(120);s=self.concert(frame);box=game.locator('.dm-concert-stage canvas').bounding_box();y=s['position']['y']*s['view']['scale']+s['view']['offset']['y'];self.assertGreater(y,40);self.assertLess(y,box['height']-10)
        self.assertEqual(self.errors,[])
    def test_matching_presence_and_all_nine_designs_in_an_isolated_visual_fixture(self):
        game,frame,_=self.open_park();self.page.set_viewport_size({'width':1280,'height':1050})
        result=frame.evaluate('''async base=>{
          const {ConcertView}=await import(base+'src/concerts/concert-view.mjs');const {ConcertRenderer}=await import(base+'src/concerts/concert-renderer.mjs');const {ARTISTS}=await import(base+'src/concerts/catalogue.mjs');const {programme,presenceLabel,encodeConcert}=await import(base+'src/concerts/concert-model.mjs');
          const original=window.DosMundosOutdoorLegacy.snapshot(),bill=programme(),artist=bill.artists[0],root=document.createElement('section');root.style.cssText='position:fixed;inset:0;z-index:999999;background:#213932';document.body.append(root);
          const api={snapshot:()=>({...original,peer:null}),position:()=>{}},parent={root,api,actor:{role:'jc'},data:original,closeConcert:()=>{}},view=new ConcertView(parent,artist,bill);await view.mount();
          const peer={...encodeConcert({x:507,y:600,face:'up'}),updated:Date.now(),room:'park',online:true,place:presenceLabel(bill.edition,artist.id,'dance')};view.update(0,performance.now(),{...original,peer});const visible=view.snapshot();view.update(0,performance.now()+50,{...original,peer:{...peer,updated:Date.now()-60000}});const stale=view.snapshot().peer;view.update(0,performance.now()+100,{...original,peer:{...peer,place:presenceLabel(bill.edition,'different','dance')}});const other=view.snapshot().peer;view.destroy();root.remove();
          const gallery=document.createElement('section');gallery.id='concert-qa-gallery';gallery.style.cssText='position:fixed;inset:0;z-index:999999;background:#213932;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:8px;padding:8px;';document.body.append(gallery);window.__concertRenderers=[];
          for(const a of ARTISTS){const fig=document.createElement('figure');fig.style.cssText='margin:0;display:grid;grid-template-rows:25px minmax(0,1fr);min-height:0';const caption=document.createElement('figcaption');caption.textContent=a.name;caption.style.cssText='font:700 14px system-ui;color:#f6dfb0;text-align:center';const canvas=document.createElement('canvas');canvas.style.cssText='width:100%;height:100%;image-rendering:pixelated;min-height:0';fig.append(caption,canvas);gallery.append(fig);const renderer=new ConcertRenderer(canvas,a);await renderer.load();renderer.render({x:458,y:600,role:'jc',face:'up',pose:'stand'},null,0);window.__concertRenderers.push(renderer);}
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));for(const renderer of window.__concertRenderers)renderer.render({x:458,y:600,role:'jc',face:'up',pose:'stand'},null,0);
          const rendered=[...gallery.querySelectorAll('canvas')].every(c=>c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3]>0);return {visible,stale,other,count:gallery.querySelectorAll('canvas').length,rendered};
        }''',self.base)
        self.assertEqual(result['visible']['role'],'jc');self.assertEqual(result['visible']['peer']['role'],'gabi');self.assertEqual(result['visible']['peer']['pose'],'dance');self.assertIsNone(result['stale']);self.assertIsNone(result['other']);self.assertEqual(result['count'],9);self.assertTrue(result['rendered']);self.assertEqual(self.remote,[]);self.assertEqual(self.errors,[]);self.page.screenshot(path=str(support.ARTIFACTS/'conciertos-nueve-disenos.png'));frame.evaluate('for(const r of window.__concertRenderers)r.destroy();document.getElementById("concert-qa-gallery").remove()')

if __name__=='__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(ConcertTests(n) for n in ConcertTests.__dict__ if n.startswith('test_')));raise SystemExit(not result.wasSuccessful())
