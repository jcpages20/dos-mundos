#!/usr/bin/env python3
"""Tactile podenco vertical slice. Isolated local saves, all remote traffic blocked."""
import json,unittest,sys
from house_browser import HouseTests
import browser_smoke as support
from playwright.sync_api import expect

KEY='dos-mundos-mascota-v1'
class PetTests(HouseTests):
    def pet(self,frame):return frame.evaluate('window.DosMundosPets.getSnapshot()')
    def enter_pet(self,game,frame):
        game.locator('.dm-house-pet-open').click();expect(game.locator('#dm-pet-scene')).to_be_visible(timeout=15000)
        frame.wait_for_function('window.DosMundosPets.getSnapshot()?.care?.ready',timeout=20000)
    def adopt(self,role='jc',name='Canela QA'):
        game,frame,values=self.open_house(role);self.enter_pet(game,frame);game.get_by_label('¿Cómo se llamará?').fill(name);game.get_by_role('button',name='Adoptar a nuestro podenco',exact=True).click();expect(game.locator('#dm-pet-scene')).to_have_count(0);self.assertEqual(self.pet(frame)['pet']['name'],name);return game,frame,values
    def point(self,game,x,y):
        box=game.locator('#dm-pet-canvas').bounding_box();self.assertGreater(box['width'],100);self.assertAlmostEqual(box['width']/box['height'],4/3,delta=.01);return {'x':box['x']+x/640*box['width'],'y':box['y']+y/480*box['height']}
    def tap(self,game,x,y):self.page.touchscreen.tap(**self.point(game,x,y))
    def mode(self,game,kind):game.locator('[data-pet-mode="'+kind+'"]').click()
    def applied(self,frame):frame.wait_for_function('window.DosMundosPets.getSnapshot()?.care?.applied',timeout=12000)
    def touch_drag(self,game,a,b,cancel=False):
        a=self.point(game,*a);b=self.point(game,*b);cdp=self.context.new_cdp_session(self.page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**a,'id':0}]})
        for i in range(1,13):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':a['x']+(b['x']-a['x'])*i/12,'y':a['y']+(b['y']-a['y'])*i/12,'id':0}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel' if cancel else 'touchEnd','touchPoints':[]});cdp.detach()
    def hold(self,game,seconds=2.0):
        p=self.point(game,320,225);cdp=self.context.new_cdp_session(self.page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**p,'id':0}]});self.page.wait_for_timeout(seconds*1000);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
    def test_adoption_is_opt_in_and_original_progress_remains_intact(self):
        game,frame,values=self.open_house();before=frame.evaluate('window.DosMundosLegacy.snapshot()');self.assertIsNone(self.page.evaluate('(k)=>localStorage.getItem(k)',KEY));self.enter_pet(game,frame)
        self.page.screenshot(path=str(support.ARTIFACTS/'podenco-adopcion-iphone.png'));game.get_by_role('button',name='Volver a casa',exact=True).click();self.assertIsNone(self.page.evaluate('(k)=>localStorage.getItem(k)',KEY))
        self.enter_pet(game,frame);game.get_by_label('¿Cómo se llamará?').fill('Brisa');game.get_by_role('button',name='Adoptar a nuestro podenco',exact=True).click();expect(game.locator('#dm-pet-scene')).to_have_count(0)
        self.assertEqual(self.pet(frame)['pet']['name'],'Brisa');self.assertEqual(self.pet(frame)['pet']['breed'],'podenco');self.assertTrue(self.pet(frame)['localOnly']);self.assertGreater(self.pet(frame)['position']['x'],0)
        after=frame.evaluate('window.DosMundosLegacy.snapshot()');self.assertEqual(after['money'],before['money']);self.assertEqual(after['energy'],before['energy'])
        saved=self.page.evaluate('JSON.parse(localStorage.getItem("dos-mundos-v29"))');self.assertEqual(saved['inventory'],['libro'])
        for key in ['dos-mundos-40-hogar:JC%20QA','dos-mundos-61-duo-v1']:self.assertEqual(self.page.evaluate('k=>localStorage.getItem(k)',key),values[key])
        self.page.screenshot(path=str(support.ARTIFACTS/'podenco-en-casa-iphone.png'));self.assertEqual(self.errors,[])
    def test_all_care_actions_use_real_touch_and_save_once(self):
        game,frame,_=self.adopt();self.enter_pet(game,frame);self.hold(game);self.applied(frame);self.assertEqual(self.pet(frame)['pet']['care']['stroke'],1)
        self.page.wait_for_timeout(250);self.assertEqual(self.pet(frame)['pet']['care']['stroke'],1)
        self.mode(game,'brush');self.hold(game,2.8);self.applied(frame)
        for mode in ['feed','drink']:
            self.mode(game,mode);self.tap(game,453,361);self.applied(frame)
        self.mode(game,'fetch');self.touch_drag(game,(135,392),(490,220));frame.wait_for_function('window.DosMundosPets.getSnapshot().care.phase!=="ready"');self.applied(frame)
        self.page.screenshot(path=str(support.ARTIFACTS/'podenco-pelota-iphone.png'))
        for i in range(3):
            self.mode(game,'train');frame.wait_for_function('window.DosMundosPets.getSnapshot().care.phase==="reward"');self.tap(game,135,392);self.applied(frame)
        self.assertEqual(self.pet(frame)['pet']['training']['sit'],3)
        self.mode(game,'rest');self.applied(frame);self.page.screenshot(path=str(support.ARTIFACTS/'podenco-descanso-iphone.png'))
        p=self.pet(frame)['pet'];self.assertTrue(all(p['care'][k]>=1 for k in ['stroke','brush','feed','drink','fetch','train','rest']));self.assertGreater(p['bond']['jc'],0);self.assertEqual(p['bond']['gabi'],0)
        self.assertFalse(any('firebase' in u for u in self.remote));self.assertEqual(self.errors,[])
    def test_canceling_gestures_and_leaving_a_ball_throw_grants_nothing(self):
        game,frame,_=self.adopt();self.enter_pet(game,frame);self.touch_drag(game,(310,220),(325,230),cancel=True);self.assertEqual(self.pet(frame)['care']['progress'],0);self.assertEqual(self.pet(frame)['pet']['care']['stroke'],0)
        self.mode(game,'feed');p=self.point(game,453,361);cdp=self.context.new_cdp_session(self.page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**p,'id':0}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});cdp.detach();self.page.wait_for_timeout(300);self.assertEqual(self.pet(frame)['care']['phase'],'ready')
        self.mode(game,'train');frame.wait_for_function('window.DosMundosPets.getSnapshot().care.phase==="reward"');self.assertEqual(self.pet(frame)['pet']['training']['sit'],0)
        self.mode(game,'fetch');self.touch_drag(game,(135,392),(500,195));game.get_by_role('button',name='Volver a casa',exact=True).click();self.assertEqual(self.pet(frame)['pet']['care']['fetch'],0);self.assertEqual(self.errors,[])
    def test_failed_save_retries_same_action_without_double_credit(self):
        game,frame,_=self.adopt();self.enter_pet(game,frame);before=self.page.evaluate('(k)=>localStorage.getItem(k)',KEY)
        frame.evaluate('''()=>{window.qaOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dos-mundos-mascota-v1')throw new DOMException('QA quota','QuotaExceededError');return window.qaOriginalSet.call(this,k,v)}}''')
        self.hold(game);expect(game.get_by_role('button',name='Guardar cuidado',exact=True)).to_be_visible();self.assertEqual(self.page.evaluate('(k)=>localStorage.getItem(k)',KEY),before);self.assertEqual(self.pet(frame)['pet']['care']['stroke'],0)
        frame.evaluate('()=>{Storage.prototype.setItem=window.qaOriginalSet;}');game.get_by_role('button',name='Guardar cuidado',exact=True).click();self.applied(frame);self.assertEqual(self.pet(frame)['pet']['care']['stroke'],1);self.page.wait_for_timeout(350);self.assertEqual(self.pet(frame)['pet']['care']['stroke'],1);self.assertEqual(self.errors,[])
    def test_reload_roles_export_restore_and_future_record_compatibility(self):
        game,frame,_=self.adopt();self.enter_pet(game,frame);self.hold(game);self.applied(frame);pet_id=self.pet(frame)['pet']['id'];game.get_by_role('button',name='Volver a casa',exact=True).click()
        game,frame,_=self.open_house('gabi');self.assertEqual(self.pet(frame)['pet']['id'],pet_id);self.enter_pet(game,frame);self.hold(game);self.applied(frame);p=self.pet(frame)['pet'];self.assertEqual(p['care']['stroke'],2);self.assertEqual(p['bond'],{'jc':2,'gabi':2});game.get_by_role('button',name='Volver a casa',exact=True).click()
        self.tool();data=self.js('return await vault.exportCurrent()');pet_raw=self.page.evaluate('(k)=>localStorage.getItem(k)',KEY);self.assertEqual(json.loads(data)['data']['local'][KEY],pet_raw)
        self.page.evaluate('(k)=>localStorage.setItem(k,"changed only in QA")',KEY);self.js('const preview=await vault.previewImport(arg);await vault.restoreImport(preview);',data);self.assertEqual(self.page.evaluate('(k)=>localStorage.getItem(k)',KEY),pet_raw)
        raw=json.dumps({'version':99,'revision':42,'pet':{'name':'Futuro'}});self.page.evaluate('([k,v])=>localStorage.setItem(k,v)',[KEY,raw]);game,frame,_=self.open_house();self.enter_pet(game,frame);expect(game.locator('.pet-panel')).to_contain_text('se conserva');self.assertEqual(self.page.evaluate('(k)=>localStorage.getItem(k)',KEY),raw);game.get_by_role('button',name='Volver a casa',exact=True).click();expect(game.locator('#dm-house-scene')).to_be_visible();self.assertEqual(self.errors,[])
    def test_mobile_board_stays_still_and_controls_remain_reachable(self):
        game,frame,_=self.adopt();self.enter_pet(game,frame)
        for width,height in [(390,844),(375,667),(320,568),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height});self.page.wait_for_timeout(120);box=game.locator('#dm-pet-canvas').bounding_box();self.assertAlmostEqual(box['width']/box['height'],4/3,delta=.01)
            layout=game.locator('#dm-pet-scene').evaluate('''r=>({width:r.scrollWidth,client:r.clientWidth,buttons:[...r.querySelectorAll('button:not([hidden])')].map(b=>{const p=b.getBoundingClientRect();return {text:b.textContent,x:p.x,y:p.y,w:p.width,h:p.height,hit:r.ownerDocument.elementFromPoint(p.x+p.width/2,p.y+p.height/2)?.closest('button')===b}})})''')
            self.assertLessEqual(layout['width'],layout['client']+1)
            for b in layout['buttons']:self.assertGreaterEqual(b['h'],44);self.assertTrue(b['hit'],b);self.assertLessEqual(b['y']+b['h'],height+1)
        self.page.set_viewport_size({'width':390,'height':844});self.page.wait_for_timeout(150);before=game.locator('#dm-pet-canvas').bounding_box();p=self.point(game,320,225);cdp=self.context.new_cdp_session(self.page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**p,'id':0}]});self.page.wait_for_timeout(350);after=game.locator('#dm-pet-canvas').bounding_box();self.assertEqual(before,after);cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});cdp.detach();game.get_by_role('button',name='Volver a casa',exact=True).click();self.assertFalse(frame.evaluate('document.getElementById("dm-house-scene").inert'));self.assertEqual(self.errors,[])
    def test_missing_pet_art_keeps_the_house_playable(self):
        self.context.route('**/assets/pets/*.png',lambda route:route.abort());game,frame,_=self.open_house();game.locator('.dm-house-pet-open').click()
        expect(game.get_by_role('button',name='Reintentar',exact=True)).to_be_visible(timeout=20000);game.get_by_role('button',name='Volver a casa',exact=True).click();expect(game.locator('#dm-house-scene')).to_be_visible();game.locator('.dm-house-primary').click();expect(game.locator('#world')).to_be_visible();self.assertEqual(self.errors,[])
    def test_browser_height_changes_and_completed_hold_keep_board_stable_until_release(self):
        self.page.set_viewport_size({'width':375,'height':667});game,frame,_=self.adopt();before_styles=frame.evaluate('()=>({child:document.body.style.cssText,parent:parent.document.body.style.cssText,html:document.documentElement.style.cssText})');self.enter_pet(game,frame)
        box=game.locator('#dm-pet-canvas').bounding_box();p=self.point(game,320,225);cdp=self.context.new_cdp_session(self.page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**p,'id':0}]});self.page.wait_for_timeout(250);self.page.set_viewport_size({'width':375,'height':627});self.page.wait_for_timeout(300)
        for key in ['x','y','width','height']:self.assertAlmostEqual(box[key],game.locator('#dm-pet-canvas').bounding_box()[key],delta=.6)
        self.applied(frame)
        for key in ['x','y','width','height']:self.assertAlmostEqual(box[key],game.locator('#dm-pet-canvas').bounding_box()[key],delta=.6)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach();game.get_by_role('button',name='Volver a casa',exact=True).click();after=frame.evaluate('()=>({child:document.body.style.cssText,parent:parent.document.body.style.cssText,html:document.documentElement.style.cssText})');self.assertEqual(before_styles,after);self.assertEqual(self.errors,[])
    def test_house_pet_bar_fits_viewport_and_long_names_without_clipped_buttons(self):
        game,frame,_=self.adopt(name='Un nombre bastante largo')
        for width,height in [(390,844),(375,667),(320,568),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height});self.page.wait_for_timeout(100)
            layout=game.locator('.dm-house-pet-bar').evaluate('''r=>({width:r.getBoundingClientRect().width,buttons:[...r.querySelectorAll('button:not([hidden])')].map(b=>{const p=b.getBoundingClientRect();return {text:b.textContent,x:p.x,y:p.y,w:p.width,h:p.height,hit:r.ownerDocument.elementFromPoint(p.x+p.width/2,p.y+p.height/2)?.closest('button')===b}})})''')
            self.assertLessEqual(layout['width'],width)
            for b in layout['buttons']:self.assertGreaterEqual(b['h'],44);self.assertGreaterEqual(b['x'],0);self.assertLessEqual(b['x']+b['w'],width+.1);self.assertTrue(b['hit'],b)
        self.assertEqual(self.errors,[])

if __name__=='__main__':
    names=[n for n in PetTests.__dict__ if n.startswith('test_')]
    if len(sys.argv)>1:names=sys.argv[1:]
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(PetTests(n) for n in names));sys.exit(not result.wasSuccessful())
