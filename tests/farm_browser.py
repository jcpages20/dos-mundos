#!/usr/bin/env python3
"""Real walking, farming and legacy economics, with disposable offline profiles."""
import json
import unittest
import browser_smoke as support
from playwright.sync_api import expect

NOW=1800000000000
def plant(kind='basil',hours=6,health=100):
    return {'type':kind,'planted':NOW-int(hours*36e5),'watered':NOW,'health':health,'dryApplied':0}

class FarmTests(support.BrowserTests):
    def open_farm(self,role='jc',plants=None,money=753,entry='casa-rpg.html',mode='barrio',ready=True):
        self.tool();self.page.add_init_script('Date.now=()=>1800000000000')
        name='Gabi QA' if role=='gabi' else 'JC QA';key='dm58-life-'+role+'-'+name
        values={'dos-mundos-v51-role':role,'dos-mundos-v60-prologue-seen-gabi':'yes',
            'dos-mundos-v29':json.dumps({'name':name,'day':2,'time':600,'money':money,'energy':82,'hunger':72,'hygiene':60,'fun':35,
                'x':158,'y':250,'inventory':['libro'],'skills':{'estudio':12},'worldExpanded':True}),
            key:json.dumps({'garden':plants if plants is not None else [None]*4,'harvests':7,'visits':{'museum':3},'dartsBest':42,'future':{'keep':'raw'}}),
            'dos-mundos-61-duo-v1':'{"furniture":["sofa"],"invites":[],"memories":[],"updatedAt":42}'}
        self.page.evaluate('v=>{localStorage.clear();for(const [k,x] of Object.entries(v))localStorage.setItem(k,x)}',values)
        self.page.goto(self.base+entry);game=self.page.frame_locator('#dm-frame');expect(game.locator('#game')).to_be_visible()
        frame=self.page.locator('#dm-frame').element_handle().content_frame()
        if mode=='city':
            frame.wait_for_function('window.DosMundosCity?.getSnapshot()?.ready',timeout=22000)
            game.get_by_role('button',name='Pasear',exact=True).click();game.locator('#dm-city-walk').get_by_role('button',name='Plano',exact=True).click()
            game.get_by_role('button',name='Caminar hasta Huerto Comunitario',exact=True).click()
        else:
            if entry=='casa-rpg.html':game.locator('#dm-city-actions>summary').click()
            game.locator('#dm54-trigger').click()
            if mode=='district':
                game.locator('.dm59-barrio').get_by_role('button',name='Jardines del Este',exact=False).click()
                game.locator('.dm59-sites').get_by_role('button',name='Huerto Comunitario',exact=False).click()
            else:game.get_by_role('button',name='Huerto Comunitario',exact=False).click()
        if entry=='casa-rpg.html' and ready:
            expect(game.locator('#dm-farm-scene')).to_be_visible(timeout=25000)
            frame.wait_for_function('window.DosMundosFarm?.getSnapshot()?.ready',timeout=22000)
        else:expect(game.locator('#dm58-overlay')).to_be_visible(timeout=22000)
        life='dos-mundos-55-progreso:'+('Gabi%20QA:gabi' if role=='gabi' else 'JC%20QA:jc')
        frame.wait_for_function('key=>Number.isFinite(JSON.parse(localStorage.getItem(key))?.decorBaseline)',arg=life)
        return game,frame,key,values

    def snap(self,frame):return frame.evaluate('window.DosMundosFarm.getSnapshot()')
    def raw(self,key):return self.page.evaluate('k=>({base:JSON.parse(localStorage.getItem("dos-mundos-v29")),farm:JSON.parse(localStorage.getItem(k)),duo:localStorage.getItem("dos-mundos-61-duo-v1")})',key)
    def reach(self,game,frame,index):
        root=game.locator('#dm-farm-scene');plan=root.get_by_role('button',name='Plano',exact=True)
        if plan.count():plan.click()
        plots=frame.evaluate('async u=>(await import(u)).FARM.plots',self.base+'src/farm/farm-map.mjs');p=plots[index]
        c=game.locator('#dm-farm-canvas');b=c.bounding_box();s=c.evaluate('e=>({w:e.width,h:e.height})');scale=min(s['w']/1120,s['h']/896)
        px=((s['w']-1120*scale)/2+(p['x']+p['w']/2)*scale)*b['width']/s['w']
        py=((s['h']-896*scale)/2+(p['y']+p['h']/2)*scale)*b['height']/s['h']
        self.page.mouse.click(b['x']+px,b['y']+py)
        frame.wait_for_function('id=>{const s=window.DosMundosFarm.getSnapshot();return s?.target===id&&!s.walking}',arg='plot-'+str(index),timeout=18000)
    def finish(self,game,frame):
        b=game.locator('#dm-farm-scene').get_by_role('button',name='Seguir caminando',exact=True)
        if b.count():b.click()
        frame.wait_for_function('!window.DosMundosFarm.getSnapshot().working')

    def test_plant_water_and_harvest_match_untouched_native_game(self):
        stages=[]
        for entry in ['index6.3.html','casa-rpg.html']:
            game,frame,key,_=self.open_farm(plants=[None,plant('tomato',10,70),None,None],entry=entry)
            results=[]
            if entry=='casa-rpg.html':self.reach(game,frame,0);game.get_by_role('button',name='Sembrar Albahaca · 4 €',exact=True).click()
            else:game.locator('.dm58-bed').nth(0).get_by_role('button',name='Albahaca · 4 €',exact=False).click()
            results.append(self.raw(key));self.assertEqual(results[-1]['base']['money'],749)
            if entry=='casa-rpg.html':self.finish(game,frame);game.get_by_role('button',name='Regar · 10 min',exact=True).click()
            else:game.locator('.dm58-bed').nth(0).get_by_role('button',name='Regar',exact=False).click()
            results.append(self.raw(key));self.assertEqual(results[-1]['base']['time'],610)
            if entry=='casa-rpg.html':self.finish(game,frame);self.reach(game,frame,1);game.get_by_role('button',name='Cosechar · +13 €',exact=True).click()
            else:game.locator('.dm58-bed').nth(1).get_by_role('button',name='Cosechar · +13 €',exact=False).click()
            results.append(self.raw(key));self.assertEqual(results[-1]['base']['money'],762);self.assertEqual(results[-1]['base']['time'],625);self.assertEqual(results[-1]['farm']['harvests'],8)
            stages.append(results)
        for a,b in zip(*stages):
            for k in ['money','time','day','energy','hunger','hygiene','fun','inventory','skills','x','y']:self.assertEqual(a['base'][k],b['base'][k],k)
            self.assertEqual(a['farm'],b['farm']);self.assertEqual(a['duo'],b['duo'])
        self.assertEqual(self.errors,[])

    def test_old_crops_both_roles_and_real_growth_survive_free_views(self):
        crops=[plant('basil',6),plant('tomato',3),plant('sunflower',10),plant('strawberry',13,70)]
        for role in ['jc','gabi']:
            game,frame,key,values=self.open_farm(role,plants=crops);before=self.raw(key)
            self.assertEqual(self.snap(frame)['role'],role);self.assertEqual(before['farm']['garden'],crops)
            game.get_by_role('button',name='Semillas',exact=True).click();expect(game.locator('.dm-farm-seed')).to_have_count(4)
            game.locator('.dm-farm-menu').get_by_role('button',name='Cerrar',exact=True).click()
            game.get_by_role('button',name='Plano',exact=True).click();game.get_by_role('button',name='Seguir',exact=True).click()
            self.assertEqual(self.raw(key),before)
            game.get_by_role('button',name='Calle',exact=True).click();self.page.reload()
            game=self.page.frame_locator('#dm-frame');game.locator('#dm-city-actions>summary').click();game.locator('#dm54-trigger').click();game.get_by_role('button',name='Huerto Comunitario',exact=False).click()
            frame=self.page.locator('#dm-frame').element_handle().content_frame();frame.wait_for_function('window.DosMundosFarm?.getSnapshot()?.ready',timeout=22000)
            self.assertEqual(self.raw(key)['farm']['garden'],crops);self.assertEqual(self.raw(key)['duo'],values['dos-mundos-61-duo-v1'])
        self.assertEqual(self.errors,[])

    def test_expansion_appends_preserves_records_and_classic_can_use_the_new_plot(self):
        crops=[plant(),None,None,None];game,frame,key,_=self.open_farm(plants=crops)
        self.reach(game,frame,4);game.get_by_role('button',name='Ampliar · 25 €',exact=True).click()
        p=self.raw(key);self.assertEqual(p['base']['money'],728);self.assertEqual(p['farm']['garden'],crops+[None]);self.assertEqual(p['base']['time'],630)
        self.finish(game,frame);game.get_by_role('button',name='Opciones',exact=True).click();game.get_by_role('button',name='Actividades anteriores',exact=True).click()
        expect(game.locator('#dm58-overlay')).to_be_visible();self.assertEqual(game.locator('.dm58-bed').count(),5)
        game.locator('.dm58-bed').nth(4).get_by_role('button',name='Tomates · 7 €',exact=False).click()
        game.get_by_role('button',name='Volver al huerto',exact=True).click()
        self.assertEqual(self.raw(key)['farm']['garden'][4]['type'],'tomato');self.assertEqual(self.raw(key)['base']['money'],721)
        self.assertEqual(self.errors,[])

    def test_insufficient_money_invalid_seed_and_double_harvest_cannot_change_progress(self):
        game,frame,key,_=self.open_farm(plants=[None,plant(),None,None],money=0);before=self.raw(key)
        for args in [['plant',0,'basil',None],['plant',0,'constructor',None],['expand',4,None,None],['harvest',0,None,None]]:
            result=frame.evaluate('a=>window.DosMundosFarmLegacy.act(...a)',args);self.assertFalse(result['ok'])
        self.assertEqual(self.raw(key),before)
        stamp=before['farm']['garden'][1]['planted']
        first=frame.evaluate('s=>window.DosMundosFarmLegacy.act("harvest",1,null,s)',stamp)
        once=self.raw(key);second=frame.evaluate('s=>window.DosMundosFarmLegacy.act("harvest",1,null,s)',stamp)
        self.assertTrue(first['ok']);self.assertFalse(second['ok']);self.assertEqual(self.raw(key),once);self.assertEqual(once['base']['money'],12)
        self.assertEqual(self.errors,[])

    def test_drought_compost_and_watering_recover_the_original_plant(self):
        crop=plant('basil',50);crop['watered']=NOW-48*36e5
        game,frame,key,_=self.open_farm(plants=[crop,None,None,None]);self.assertEqual(self.raw(key)['farm']['garden'][0]['health'],40)
        stamp=crop['planted'];r=frame.evaluate('s=>window.DosMundosFarmLegacy.act("fertilize",0,null,s)',stamp);self.assertTrue(r['ok'])
        p=self.raw(key);self.assertEqual(p['base']['money'],750);self.assertEqual(p['farm']['garden'][0]['health'],60);self.assertEqual(p['base']['time'],615)
        frame.evaluate('s=>window.DosMundosFarmLegacy.act("water",0,null,s)',stamp)
        self.assertEqual(self.raw(key)['farm']['garden'][0]['health'],72)
        self.assertEqual(self.raw(key)['farm']['garden'][0]['dryApplied'],0)
        self.assertEqual(self.errors,[])

    def test_storage_failure_rolls_back_seeds_and_money(self):
        game,frame,key,_=self.open_farm(plants=[None,plant('tomato',10),None,None]);before=self.raw(key)
        result=frame.evaluate('''key=>{const original=Storage.prototype.setItem;
            Storage.prototype.setItem=function(k,v){if(k===key&&v.includes('"type":"basil"'))throw new DOMException('QA quota','QuotaExceededError');return original.call(this,k,v)};
            try{return window.DosMundosFarmLegacy.act('plant',0,'basil');}finally{Storage.prototype.setItem=original;}}''',key)
        self.assertFalse(result['ok']);self.assertEqual(self.raw(key),before)
        self.assertTrue(frame.evaluate('window.DosMundosFarmLegacy.act("plant",0,"basil").ok'))
        self.assertEqual(self.raw(key)['base']['money'],749)
        before_harvest=self.raw(key);stamp=before_harvest['farm']['garden'][1]['planted']
        result=frame.evaluate('''stamp=>{const original=Storage.prototype.setItem;
            Storage.prototype.setItem=function(k,v){if(k==='dos-mundos-v29'&&JSON.parse(v).money>749)throw new DOMException('QA quota','QuotaExceededError');return original.call(this,k,v)};
            try{return window.DosMundosFarmLegacy.act('harvest',1,null,stamp);}finally{Storage.prototype.setItem=original;}}''',stamp)
        self.assertFalse(result['ok']);self.assertEqual(self.raw(key),before_harvest)
        self.assertTrue(frame.evaluate('s=>window.DosMundosFarmLegacy.act("harvest",1,null,s).ok',stamp))
        self.assertEqual(self.raw(key)['base']['money'],768);self.assertEqual(self.errors,[])

    def test_landmarks_route_from_city_and_museum_keeps_its_photos_and_actions(self):
        game,frame,key,_=self.open_farm(mode='city');self.assertFalse(frame.evaluate('window.DosMundosCity.getSnapshot().street'))
        game.get_by_role('button',name='Calle',exact=True).click();expect(game.locator('#dm-city-walk')).to_be_visible()
        game.locator('#dm-city-walk').get_by_role('button',name='Plano',exact=True).click()
        self.assertEqual(game.locator('.dm-city-destinations button').count(),14)
        game.get_by_role('button',name='Caminar hasta Museo de los Recuerdos',exact=True).click()
        expect(game.locator('#dm58-overlay')).to_be_visible(timeout=18000)
        expect(game.locator('#dm58-overlay h2')).to_contain_text('Museo de los Recuerdos')
        self.assertGreater(game.locator('#dm58-overlay .dm58-body button').count(),0)
        game.locator('#dm58-overlay').get_by_role('button',name='Cerrar',exact=True).click()
        expect(game.locator('#dm-city-walk')).to_be_visible();self.assertEqual(self.raw(key)['farm']['future'],{'keep':'raw'})
        game.locator('#dm-city-walk').get_by_role('button',name='Volver a la vista completa',exact=True).click()
        game.locator('#enter').click();expect(game.locator('#dm58-overlay h2')).to_contain_text('Museo de los Recuerdos')
        game.locator('#dm58-overlay').get_by_role('button',name='Cerrar',exact=True).click()
        self.assertEqual(self.errors,[])

    def test_original_district_door_still_enters_farm(self):
        game,frame,_,_=self.open_farm('gabi',mode='district');self.assertEqual(self.snap(frame)['role'],'gabi')
        game.get_by_role('button',name='Calle',exact=True).click();expect(game.locator('#world')).to_be_visible();self.assertEqual(self.errors,[])

    def test_mobile_controls_and_all_crops_visible_with_original_actors(self):
        crops=[plant('basil',6),plant('tomato',10),plant('sunflower',15),plant('strawberry',13)]
        game,frame,_,_=self.open_farm('gabi',plants=crops)
        self.reach(game,frame,3)
        for w,h in [(390,844),(375,667),(844,390),(1440,1100)]:
            self.page.set_viewport_size({'width':w,'height':h});frame.wait_for_timeout(120)
            self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            for b in game.locator('#dm-farm-scene button').all():
                if b.is_visible():
                    box=b.bounding_box();self.assertGreaterEqual(box['width'],44);self.assertGreaterEqual(box['height'],44);self.assertLessEqual(box['x']+box['width'],w+.5)
            self.page.screenshot(path=str(support.ARTIFACTS/f'huerto-{w}x{h}.png'))
        self.assertEqual(self.errors,[])

    def test_failed_assets_keep_previous_garden_playable(self):
        self.context.route('**/assets/farm/crops.png',lambda route:route.abort())
        game,frame,key,_=self.open_farm(ready=False)
        expect(game.locator('#dm-farm-scene')).to_have_count(0,timeout=22000)
        game.locator('.dm58-bed').nth(0).get_by_role('button',name='Albahaca · 4 €',exact=False).click()
        self.assertEqual(self.raw(key)['farm']['garden'][0]['type'],'basil');self.assertEqual(self.raw(key)['base']['money'],749)
        self.assertEqual(self.errors,[])

    def test_saved_exit_position_and_walking_out_resume_safely(self):
        game,frame,_,_=self.open_farm();game.get_by_role('button',name='Calle',exact=True).click()
        self.page.evaluate('localStorage.setItem("dos-mundos-huerto-rpg-v1:jc:JC%20QA",JSON.stringify({version:1,position:{x:552,y:878,face:"down"},seed:"tomato"}))')
        game.locator('#dm-city-actions>summary').click();game.locator('#dm54-trigger').click();game.get_by_role('button',name='Huerto Comunitario',exact=False).click()
        frame.wait_for_function('window.DosMundosFarm?.getSnapshot()?.ready',timeout=22000)
        self.assertEqual(self.snap(frame)['position'],{'x':552,'y':834});self.assertEqual(self.snap(frame)['seed'],'tomato')
        self.page.keyboard.down('ArrowDown');frame.wait_for_timeout(650);self.page.keyboard.up('ArrowDown');expect(game.locator('#dm-farm-scene')).to_have_count(0)
        self.assertEqual(self.errors,[])

    def test_watering_round_walks_to_each_crop_and_can_be_stopped_without_replaying(self):
        game,frame,key,_=self.open_farm(plants=[plant(health=40),plant('tomato',2,50),None,None])
        game.get_by_role('button',name='Opciones',exact=True).click();game.get_by_role('button',name='Regar cultivos',exact=True).click()
        game.get_by_role('button',name='Ronda de riego',exact=True).click()
        frame.wait_for_function('''()=>{const s=window.DosMundosFarmLegacy.snapshot(),v=window.DosMundosFarm.getSnapshot();
            return s.time===620&&!v.walking&&!v.working;}''',timeout=22000)
        p=self.raw(key);self.assertEqual(p['farm']['garden'][0]['health'],52);self.assertEqual(p['farm']['garden'][1]['health'],62)
        game.get_by_role('button',name='Opciones',exact=True).click();game.get_by_role('button',name='Regar cultivos',exact=True).click()
        game.get_by_role('button',name='Ronda de riego',exact=True).click()
        frame.wait_for_function('window.DosMundosFarm.getSnapshot().working==="water"',timeout=18000)
        game.get_by_role('button',name='Seguir caminando',exact=True).click();frame.wait_for_timeout(1800)
        self.assertEqual(self.raw(key)['base']['time'],630);self.assertEqual(self.raw(key)['base']['money'],753)
        self.assertEqual(self.errors,[])

if __name__=='__main__':unittest.main(verbosity=2)
