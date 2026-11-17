#!/usr/bin/env python3
"""Original pantry economy with real cooking gestures; disposable profiles only."""
import json,math,unittest,sys
from house_browser import HouseTests
import browser_smoke as support
from playwright.sync_api import expect

class CookingTests(HouseTests):
    def open_cooking(self,recipe='omelet',role='jc',pantry=None,practice=False):
        self.tool();name='Gabi%20QA:gabi' if role=='gabi' else 'JC%20QA:jc'
        value={'pantry':pantry if pantry is not None else {'egg':8,'veg':8,'pasta':8,'tomato':8,'cheese':8,'rice':8,'chicken':8},'skills':{'cooking':0},'xp':0,'totalMeals':0,'lastDay':2,'decorBaseline':1,'daily':{'jobs':0,'bought':0,'cooked':0,'decorated':0,'claimed':[]}}
        self.page.evaluate('([k,v])=>localStorage.setItem(k,JSON.stringify(v))',['dos-mundos-55-progreso:'+name,value]);game,frame,_=self.open_house(role)
        self.enter_cooking(game,frame);game.locator('[data-dish="'+recipe+'"]').click()
        if practice:game.get_by_label('Ensayo gratis',exact=False).check()
        return game,frame
    def enter_cooking(self,game,frame):
        game.get_by_role('button',name='Menú',exact=True).click();game.get_by_role('button',name='Cocinar jugando · 3 platos',exact=True).click();expect(game.locator('#dm-kitchen-scene')).to_be_visible(timeout=15000);frame.wait_for_function('window.DosMundosKitchen.getSnapshot()?.ready',timeout=22000)
    def kitchen(self,frame):return frame.evaluate('window.DosMundosKitchen.getSnapshot()')
    def records(self,frame):return frame.evaluate('window.DosMundosKitchenLegacy.snapshot()')
    def native(self,frame):return frame.evaluate('''()=>{const s=window.DosMundosKitchenLegacy.snapshot(),base=JSON.parse(localStorage.getItem('dos-mundos-v29'));return {base,life:JSON.parse(localStorage.getItem('dos-mundos-55-progreso:'+encodeURIComponent(s.name)+':'+s.role)),barrio:JSON.parse(localStorage.getItem('dos-mundos-54-barrio-'+s.role)||'null'),duo:localStorage.getItem('dos-mundos-61-duo-v1')}}''')
    def point(self,game,x,y):
        box=game.locator('#dm-kitchen-canvas').bounding_box();self.assertAlmostEqual(box['width'],box['height'],delta=1);return {'x':box['x']+x*box['width'],'y':box['y']+y*box['height']}
    def drag(self,game,start,end,touch=False):
        a=self.point(game,*start);b=self.point(game,*end)
        if touch:
            cdp=self.context.new_cdp_session(self.page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**a,'id':0}]})
            for i in range(1,13):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':a['x']+(b['x']-a['x'])*i/12,'y':a['y']+(b['y']-a['y'])*i/12,'id':0}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
        else:self.page.mouse.move(**a);self.page.mouse.down();self.page.mouse.move(**b,steps=12);self.page.mouse.up()
    def circles(self,game,turns,touch=False):
        p=self.point(game,.72,.6);cdp=self.context.new_cdp_session(self.page) if touch else None
        if cdp:cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**p,'id':0}]})
        else:self.page.mouse.move(**p);self.page.mouse.down()
        for i in range(1,math.ceil(turns*36)+1):
            a=i/36*math.pi*2;p=self.point(game,.5+math.cos(a)*.22,.6+math.sin(a)*.22)
            if cdp:cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{**p,'id':0}]})
            else:self.page.mouse.move(**p)
        if cdp:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});cdp.detach()
        else:self.page.mouse.up()
    def heat(self,game,n=55):
        slider=game.get_by_role('slider',name='Potencia del fuego',exact=True);slider.focus();self.page.keyboard.press('Home')
        for _ in range(n):self.page.keyboard.press('ArrowRight')
    def play(self,game,frame,touch=False,capture=False):
        game.get_by_role('button',name='Empezar receta',exact=True).click();frame.wait_for_function('window.DosMundosKitchen.getSnapshot()?.model')
        recipe=self.kitchen(frame)['recipe']
        for index in range(4):
            state=self.kitchen(frame)['model'];kind={'omelet':['cut','mix','pan','plate'],'pasta':['cut','boil','sauce','plate'],'chickenrice':['cut','wash','saute','plate']}[recipe][index]
            self.assertEqual(state['step'],index)
            if kind=='cut':
                cuts=6 if recipe=='chickenrice' else 5
                for i in range(cuts):
                    x=(.3+i*.065) if cuts==6 else .34+i*.07;self.drag(game,(x,.35),(x,.85),touch)
                    if capture and i==1:self.page.screenshot(path=str(support.ARTIFACTS/('cocina-'+recipe+'-corte.png')))
            elif kind in ('mix','wash'):
                if kind=='mix':
                    for x in (.32,.68):
                        p=self.point(game,x,.54);self.page.touchscreen.tap(**p) if touch else self.page.mouse.click(**p)
                self.circles(game,3.2,touch)
                if self.kitchen(frame)['phase']=='playing':self.circles(game,1,touch)
            elif kind in ('pan','boil','sauce','saute'):
                self.heat(game)
                if kind in ('sauce','saute'):
                    self.circles(game,2.2,touch)
                    if self.kitchen(frame)['model']['turns']<2:self.circles(game,1,touch)
                if kind=='pan':
                    frame.wait_for_function('window.DosMundosKitchen.getSnapshot().model.cooked>=9.8',timeout=18000);self.drag(game,(.5,.8),(.5,.4),touch)
                if capture:self.page.screenshot(path=str(support.ARTIFACTS/('cocina-'+recipe+'-fuego.png')))
                frame.wait_for_function('window.DosMundosKitchen.getSnapshot().model.cooked>=12' if kind!='sauce' else 'window.DosMundosKitchen.getSnapshot().model.cooked>=10',timeout=18000)
                if kind=='boil':self.drag(game,(.5,.6),(.86,.65),touch)
            else:
                for i in range(3):self.drag(game,(.2+i*.3,.38),(.5,.67),touch)
            frame.wait_for_function('window.DosMundosKitchen.getSnapshot().phase==="stepDone"',timeout=7000)
            game.get_by_role('button',name='Ver mi plato' if index==3 else 'Siguiente paso',exact=True).click()
        expect(game.get_by_role('button',name='Guardar ensayo' if self.records(frame)['active']['practice'] else 'Servir y comer',exact=True)).to_be_visible();return self.kitchen(frame)['result']

    def test_tortilla_real_touch_cuts_eggs_stirring_flip_and_native_meal_once(self):
        game,frame=self.open_cooking();before=self.native(frame);r=self.play(game,frame,True,True);self.assertTrue(r['effort']);self.assertGreater(r['score'],850);self.assertEqual(self.native(frame),before)
        game.get_by_role('button',name='Servir y comer',exact=True).click();after=self.native(frame);self.assertEqual(after['base']['time'],before['base']['time']+30);self.assertEqual(after['life']['skills']['cooking'],14);self.assertEqual(after['life']['totalMeals'],1);self.assertEqual(after['life']['pantry']['egg'],6);self.assertEqual(after['life']['pantry']['veg'],7);self.assertEqual(after['base']['money'],before['base']['money']);self.assertGreater(after['base']['hunger'],before['base']['hunger'])
        data=self.records(frame);response=frame.evaluate('v=>window.DosMundosKitchenLegacy.act(...v)',['omelet',data['active']['id'],r]);self.assertTrue(response['already']);self.assertEqual(self.native(frame),after);self.assertEqual(len(data['history']),1);self.page.screenshot(path=str(support.ARTIFACTS/'cocina-tortilla-servida.png'));self.assertEqual(self.errors,[])
    def test_pasta_uses_actual_boil_drain_sauce_and_its_original_costs(self):
        game,frame=self.open_cooking('pasta');before=self.native(frame);self.play(game,frame,capture=True);game.get_by_role('button',name='Servir y comer',exact=True).click();after=self.native(frame);self.assertEqual(after['base']['time'],before['base']['time']+35);self.assertEqual(after['life']['skills']['cooking'],18);self.assertEqual(after['life']['pantry']['pasta'],7);self.assertEqual(after['life']['pantry']['tomato'],7);self.assertEqual(after['life']['pantry']['cheese'],7);self.assertEqual(after['life']['totalMeals'],1);self.assertEqual(self.errors,[]);self.page.screenshot(path=str(support.ARTIFACTS/'cocina-pasta-servida.png'))
    def test_gabi_chicken_rice_has_washing_saute_plating_and_original_identity(self):
        game,frame=self.open_cooking('chickenrice','gabi');before=self.native(frame);self.play(game,frame,capture=True);game.get_by_role('button',name='Servir y comer',exact=True).click();after=self.native(frame);self.assertEqual(after['base']['time'],before['base']['time']+45);self.assertEqual(after['life']['skills']['cooking'],23);self.assertEqual(after['life']['pantry']['chicken'],7);self.assertEqual(after['life']['pantry']['rice'],7);self.assertEqual(after['life']['pantry']['veg'],7);self.assertEqual(self.kitchen(frame)['role'],'gabi');self.page.screenshot(path=str(support.ARTIFACTS/'cocina-pollo-servido-gabi.png'));self.assertEqual(self.errors,[])
    def test_missing_food_can_be_rehearsed_without_changing_native_progress(self):
        game,frame=self.open_cooking(pantry={});before=self.native(frame);game.get_by_role('button',name='Empezar receta',exact=True).click();expect(game.locator('.ck-notice')).to_contain_text('Faltan ingredientes');game.get_by_label('Ensayo gratis',exact=False).check();self.play(game,frame);game.get_by_role('button',name='Guardar ensayo',exact=True).click();self.assertEqual(self.native(frame),before);data=self.records(frame);self.assertEqual(data['bests'],{});self.assertTrue(data['history'][0]['practice']);self.assertEqual(self.errors,[])
    def test_pause_reload_resume_and_return_to_house_keep_ingredients_and_position(self):
        game,frame=self.open_cooking('pasta');before=self.native(frame);game.get_by_role('button',name='Empezar receta',exact=True).click();self.drag(game,(.34,.35),(.34,.85),True);game.get_by_role('button',name='Pausa',exact=True).click();s=self.kitchen(frame);frame.wait_for_timeout(300);self.assertEqual(self.kitchen(frame)['model']['elapsed'],s['model']['elapsed']);self.page.reload();game=self.page.frame_locator('#dm-frame');frame=self.page.locator('#dm-frame').element_handle().content_frame();game.locator('#goHome').click();frame.wait_for_function('window.DosMundosHouse?.getSnapshot()?.ready',timeout=22000);self.enter_cooking(game,frame);game.get_by_role('button',name='Retomar preparación',exact=True).click();expect(game.get_by_role('button',name='Continuar cocinando',exact=True)).to_be_visible();self.assertEqual(self.kitchen(frame)['model']['cuts'],[0]);self.assertEqual(self.native(frame)['life']['pantry'],before['life']['pantry']);game.get_by_role('button',name='Salir y conservar la preparación',exact=True).click();self.assertTrue(frame.evaluate('window.DosMundosHouse.getSnapshot().ready'));self.assertEqual(frame.evaluate('window.DosMundosHouse.getSnapshot().room'),'kitchen');self.assertEqual(self.errors,[])
    def test_failed_serving_rolls_back_pantry_inventory_personality_and_couple_plan(self):
        self.tool();self.page.evaluate('localStorage.setItem("dos-mundos-54-barrio-jc",JSON.stringify({inventory:[{id:"veg-qa",name:"🥕 Verduras frescas"}],friends:{},history:[]}))');game,frame=self.open_cooking(pantry={'egg':8});frame.evaluate('window.DosMundosLife.open("profile")');game.get_by_label('Creativo',exact=False).check();game.get_by_label('Casero',exact=False).check();game.get_by_label('Plato favorito',exact=True).select_option('omelet');game.get_by_role('button',name='Guardar mi personalidad',exact=True).click();game.get_by_role('button',name='Planes',exact=True).click();game.locator('[data-plan="dinner"]').get_by_role('button',name='Comenzar este plan').click();game.locator('#dm-life-modal').get_by_role('button',name='Cerrar',exact=True).click()
        self.play(game,frame);before=self.native(frame);life=frame.evaluate('window.DosMundosLife.getSnapshot()')
        response=frame.evaluate('''()=>{const api=window.DosMundosKitchenLegacy,d=api.snapshot(),r=window.DosMundosKitchen.getSnapshot().result,old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('dos-mundos-cocina-jugable-v1:')&&JSON.parse(v).history.length)throw new DOMException('QA quota','QuotaExceededError');return old.call(this,k,v)};try{return api.act('omelet',d.active.id,r)}finally{Storage.prototype.setItem=old}}''')
        self.assertFalse(response['ok']);self.assertEqual(self.native(frame),before);self.assertEqual(frame.evaluate('window.DosMundosLife.getSnapshot().profile'),life['profile']);self.assertEqual(frame.evaluate('window.DosMundosLife.getSnapshot().plans'),life['plans']);game.get_by_role('button',name='Servir y comer',exact=True).click();after=frame.evaluate('window.DosMundosLife.getSnapshot()');self.assertEqual(after['plans']['dinner']['members']['jc']['progress']['cook']['recipe'],'omelet');self.assertEqual(after['pending'],life['pending']+1);self.assertEqual(self.native(frame)['life']['totalMeals'],1);self.assertEqual(self.native(frame)['barrio']['inventory'],[]);self.assertEqual(self.native(frame)['life']['pantry']['egg'],6);self.assertEqual(self.errors,[])
    def test_kitchen_mobile_layout_and_touch_cancel_have_no_free_cuts(self):
        game,frame=self.open_cooking();game.get_by_role('button',name='Empezar receta',exact=True).click();p=self.point(game,.34,.35);cdp=self.context.new_cdp_session(self.page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**p,'id':0}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});self.assertEqual(self.kitchen(frame)['model']['cuts'],[]);game.get_by_role('button',name='Pausa',exact=True).click()
        for w,h in [(390,844),(375,667),(375,480),(844,390),(1440,1000)]:
            self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(100);self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            for b in game.locator('#dm-kitchen-scene button').all():
                if b.is_visible():box=b.bounding_box();self.assertGreaterEqual(box['height'],44);self.assertGreaterEqual(box['width'],44);self.assertLessEqual(box['x']+box['width'],w+.5)
            self.page.screenshot(path=str(support.ARTIFACTS/f'cocina-{w}x{h}.png'))
        self.assertEqual(self.errors,[])
    def test_classic_recipes_and_native_kitchen_entry_remain_available(self):
        game,frame=self.open_cooking();game.get_by_role('button',name='Salir',exact=True).click();game.get_by_role('button',name='Menú',exact=True).click();game.get_by_role('button',name='Recetas y cocina',exact=True).click();expect(game.locator('#dm55-overlay')).to_contain_text('Sándwich tostado');expect(game.locator('#dm55-overlay')).to_contain_text('Arroz salteado');game.locator('#dm55-overlay').get_by_role('button',name='Cocinar jugando · 3 platos',exact=True).click();expect(game.locator('#dm-kitchen-scene')).to_be_visible(timeout=15000);self.assertEqual(self.errors,[])
    def test_future_cooking_storage_is_not_replaced_and_early_serving_is_rejected(self):
        game,frame=self.open_cooking();before=self.native(frame);response=frame.evaluate('window.DosMundosKitchenLegacy.act("omelet","missing",{score:1000,effort:true})');self.assertFalse(response['ok']);self.assertEqual(self.native(frame),before)
        key='dos-mundos-cocina-jugable-v1:jc:JC%20QA';value='{"version":99,"active":null,"bests":{},"history":[],"future":"keep"}';frame.evaluate('([k,v])=>localStorage.setItem(k,v)',[key,value]);game.get_by_role('button',name='Empezar receta',exact=True).click();expect(game.locator('.ck-notice')).to_contain_text('se conserva');self.assertEqual(frame.evaluate('k=>localStorage.getItem(k)',key),value);self.assertEqual(self.errors,[])
    def test_missing_art_falls_back_to_original_recipes_without_touching_progress(self):
        self.context.route('**/assets/kitchen/kitchen-atlas.png',lambda r:r.abort());self.tool();game,frame,_=self.open_house();before=frame.evaluate('window.DosMundosLegacy.snapshot()');game.get_by_role('button',name='Menú',exact=True).click();game.get_by_role('button',name='Cocinar jugando · 3 platos',exact=True).click();expect(game.get_by_role('button',name='Abrir recetario rápido',exact=True)).to_be_visible(timeout=25000);game.get_by_role('button',name='Abrir recetario rápido',exact=True).click();expect(game.locator('#dm55-overlay')).to_contain_text('Recetario');self.assertEqual(frame.evaluate('window.DosMundosLegacy.snapshot()'),before);self.assertEqual(self.errors,[])

if __name__=='__main__':
    names=sys.argv[1:];suite=unittest.TestSuite(CookingTests(n) for n in CookingTests.__dict__ if n.startswith('test_') and (not names or n in names));r=unittest.TextTestRunner(verbosity=2).run(suite);raise SystemExit(not r.wasSuccessful())
