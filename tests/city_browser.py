#!/usr/bin/env python3
"""Madrid rendering, native routes and actions; synthetic profiles, no Firebase."""
import json
import unittest

import browser_smoke as support
from playwright.sync_api import expect


class CityTests(support.BrowserTests):
    def open_city(self,role='jc',time=600,day=2,x=158,y=250,entry='casa-rpg.html',ready=True):
        self.tool()
        name='Gabi QA' if role=='gabi' else 'JC QA'
        values={
            'dos-mundos-v51-role':role,'dos-mundos-v60-prologue-seen-gabi':'yes',
            'dos-mundos-v29':json.dumps({'name':name,'money':753,'energy':82,'hunger':72,'hygiene':60,
                'fun':35,'day':day,'time':time,'x':x,'y':y,'inventory':['libro'],'skills':{'estudio':12},'worldExpanded':True}),
            'dos-mundos-61-duo-v1':'{"furniture":["sofa"],"invites":[],"memories":[],"updatedAt":42}',
            'dos-mundos-54-barrio-'+role:'{"inventory":[{"name":"postal"}],"friends":{"ines":2},"history":["QA"]}',
            'dos-mundos-future-unknown':'{ future raw data : keep }'
        }
        self.page.evaluate('v=>{localStorage.clear();for(const [k,x] of Object.entries(v))localStorage.setItem(k,x)}',values)
        self.page.goto(self.base+entry)
        game=self.page.frame_locator('#dm-frame');expect(game.locator('#game')).to_be_visible()
        frame=self.page.locator('#dm-frame').element_handle().content_frame()
        if entry=='casa-rpg.html' and ready:frame.wait_for_function('window.DosMundosCity?.getSnapshot()?.ready',timeout=24000)
        life='dos-mundos-55-progreso:'+('Gabi%20QA:gabi' if role=='gabi' else 'JC%20QA:jc')
        frame.wait_for_function('key=>{const p=JSON.parse(localStorage.getItem(key));return Number.isFinite(p?.decorBaseline)}',arg=life)
        return game,frame,values

    def snapshot(self,frame):return frame.evaluate('window.DosMundosCity.getSnapshot()')

    def raw(self):
        return self.page.evaluate('()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith("dos-mundos-")||k.startsWith("dm58-life-")))')

    def map_tap(self,game,frame,x,y):
        s=self.snapshot(frame);c=game.locator('#map');box=c.bounding_box()
        self.page.mouse.click(box['x']+(x-s['camera']['x'])*box['width']/s['viewWidth'],
                              box['y']+(y-s['camera']['y'])*box['height']/s['viewHeight'])

    def test_original_coordinates_all_routes_and_both_player_identities(self):
        for role in ['jc','gabi']:
            game,frame,values=self.open_city(role)
            s=self.snapshot(frame);self.assertEqual(s['role'],role)
            self.assertEqual([(p['x'],p['y'],p['w'],p['h']) for p in s['places']],
                [(x,y,126,100) for y in [84,352,620] for x in [75,347,619,891]])
            self.assertEqual([p['id'] for p in s['people']],['ines','leo','alma','dani','noa','omar'])
            self.assertEqual(len(s['citizens']),8)
            for p in s['places']:
                route=frame.evaluate('id=>window.DosMundosCityLegacy.planTo(id)',p['id'])
                self.assertGreater(len(route['path']),0,p['id'])
                self.assertEqual(route['entrance'],{'x':p['x']+63,'y':p['y']+127})
            self.assertEqual(self.page.evaluate('localStorage.getItem("dos-mundos-61-duo-v1")'),values['dos-mundos-61-duo-v1'])
            self.assertEqual(self.remote,[]);self.assertEqual(self.errors,[])

    def test_free_views_preserve_raw_saves_and_classic_view_can_be_restored(self):
        game,frame,_=self.open_city();before=self.raw()
        for _ in range(2):
            game.get_by_role('button',name='Plano del barrio',exact=True).click()
            expect(game.locator('#dm-city-plan')).to_be_visible()
            self.assertEqual(game.locator('.dm-city-destinations button').count(),14)
            self.page.keyboard.press('Tab');self.page.keyboard.press('Escape')
            game.get_by_role('button',name='Pasear',exact=True).click()
            self.page.keyboard.press('Escape')
            expect(game.locator('.worldWrap #map')).to_be_visible()
            game.get_by_role('button',name='Vista anterior',exact=True).click()
            self.assertFalse(self.snapshot(frame)['enabled'])
            game.get_by_role('button',name='Vista renovada',exact=True).click()
            self.assertTrue(self.snapshot(frame)['enabled'])
        self.assertEqual(self.raw(),before)
        self.assertEqual(self.errors,[])

    def test_walking_reaches_house_gym_cafe_and_cinema_and_returns_to_same_walk(self):
        game,frame,_=self.open_city()
        game.get_by_role('button',name='Pasear',exact=True).click()
        for destination,scene in [('Casa','#dm-house-scene'),('Gimnasio','#dm-gym-scene'),('Cafetería','#dm37-cafe-modal'),('Cine','#dm56-overlay[data-cinema]')]:
            game.locator('#dm-city-walk').get_by_role('button',name='Plano',exact=True).click()
            game.get_by_role('button',name='Caminar hasta '+destination,exact=True).click()
            expect(game.locator(scene)).to_be_visible(timeout=25000)
            self.assertFalse(self.snapshot(frame)['street'])
            expect(game.locator('#dm-city-walk')).to_have_count(0)
            if destination=='Casa':
                frame.wait_for_function('window.DosMundosHouse.getSnapshot()?.ready',timeout=18000)
                game.locator('#dm-house-scene').get_by_role('button',name='Menú',exact=True).click()
                game.locator('.dm-house-menu').get_by_role('button',name='Salir a Madrid',exact=True).click()
            elif destination=='Gimnasio':
                frame.wait_for_function('window.DosMundosGym.getSnapshot()?.ready',timeout=18000)
                game.locator(scene).get_by_role('button',name='Calle',exact=True).click()
            elif destination=='Cafetería':game.get_by_role('button',name='Salir del café',exact=True).click()
            else:game.get_by_role('button',name='Salir del cine',exact=True).click()
            expect(game.locator('#dm-city-walk')).to_be_visible()
            self.assertEqual(self.snapshot(frame)['view'],'walk')
        self.assertEqual(self.snapshot(frame)['money'],753)
        self.assertEqual(self.errors,[])

    def test_native_facade_tap_enters_the_real_house(self):
        game,frame,_=self.open_city('gabi')
        game.get_by_role('button',name='Pasear',exact=True).click()
        self.map_tap(game,frame,138,140)
        expect(game.locator('#dm-house-scene')).to_be_visible(timeout=20000)
        frame.wait_for_function('window.DosMundosHouse.getSnapshot()?.ready',timeout=18000)
        self.assertEqual(frame.evaluate('window.DosMundosHouse.getSnapshot().role'),'gabi')
        self.assertEqual(self.errors,[])

    def test_portrait_tap_on_lower_row_reaches_the_correct_native_building(self):
        game,frame,_=self.open_city();game.get_by_role('button',name='Pasear',exact=True).click()
        self.assertGreater(self.snapshot(frame)['viewHeight'],600)
        # At the old fixed 448px height this tap would select the cafe instead.
        self.map_tap(game,frame,410,680)
        frame.wait_for_function('window.DosMundosLegacy.room==="shop"',timeout=18000)
        expect(game.locator('#interior')).to_be_visible()
        game.get_by_role('button',name='Salir a la calle',exact=True).click()
        expect(game.locator('#dm-city-walk')).to_be_visible()
        self.assertEqual(self.errors,[])

    def test_original_street_actions_keep_their_prices_and_effects(self):
        results=[]
        for entry in ['index6.3.html','casa-rpg.html']:
            game,frame,_=self.open_city(x=475,y=209,entry=entry)
            # Native flowers hotspot: market centre + (65,15) = (475,199).
            before=json.loads(self.raw()['dos-mundos-v29'])
            if entry=='casa-rpg.html':game.locator('#dm-city-actions>summary').click()
            game.locator('#dm43-explore').click()
            expect(game.locator('.dm43-overlay')).to_be_visible()
            game.get_by_role('button',name='Comprar un ramo · 8 €',exact=True).click()
            after=json.loads(self.raw()['dos-mundos-v29'])
            self.assertEqual(after['money'],before['money']-8)
            self.assertEqual(after['time'],before['time']+10)
            results.append({k:after[k] for k in ['money','time','day','fun','social','energy','hunger','hygiene','inventory','skills']})
        self.assertEqual(results[0],results[1])
        self.assertEqual(self.errors,[])

    def test_named_neighbor_tap_preserves_conversation_and_friendship(self):
        game,frame,values=self.open_city(x=400,y=500)
        # Choose a scheduled neighbor close enough to the current player.
        people=self.snapshot(frame)['people']
        near=min((p for p in people if not p['hidden']),key=lambda p:(p['x']-400)**2+(p['y']-500)**2)
        frame.evaluate('p=>window.DosMundosCityLegacy.walk(p.x+20,p.y+12)',near)
        frame.wait_for_function('!window.DosMundosCity.getSnapshot().moving',timeout=18000)
        near=next(p for p in self.snapshot(frame)['people'] if p['id']==near['id'])
        self.map_tap(game,frame,near['x'],near['y'])
        expect(game.locator('#dm54-overlay')).to_be_visible()
        before=json.loads(self.raw()['dos-mundos-v29'])
        game.get_by_role('button',name='Conversar · 10 minutos',exact=False).click()
        after=json.loads(self.raw()['dos-mundos-v29'])
        self.assertEqual(after['time'],before['time']+10)
        self.assertEqual(after['money'],before['money'])
        friends=json.loads(self.raw()['dos-mundos-54-barrio-jc'])['friends']
        self.assertGreater(friends[near['id']],0)
        self.assertEqual(self.errors,[])

    def test_failed_atlas_keeps_city_and_house_then_retry_recovers(self):
        self.context.route('**/assets/city/neighbors.png',lambda route:route.abort())
        game,frame,_=self.open_city(ready=False)
        expect(game.get_by_role('button',name='Reintentar gráficos',exact=True)).to_be_visible(timeout=18000)
        self.assertFalse(self.snapshot(frame)['ready'])
        game.locator('#goHome').click();expect(game.locator('#dm-house-scene')).to_be_visible()
        game.locator('#dm-house-scene').get_by_role('button',name='Menú',exact=True).click()
        game.locator('.dm-house-menu').get_by_role('button',name='Salir a Madrid',exact=True).click()
        self.context.unroute('**/assets/city/neighbors.png')
        game.get_by_role('button',name='Reintentar gráficos',exact=True).click()
        frame.wait_for_function('window.DosMundosCity.getSnapshot()?.ready',timeout=20000)
        self.assertEqual(self.errors,[])

    def test_mobile_controls_layout_menu_and_portrait_landscape(self):
        game,frame,_=self.open_city();game.get_by_role('button',name='Pasear',exact=True).click()
        for width,height in [(390,844),(375,667),(844,390),(1440,1000)]:
            self.page.set_viewport_size({'width':width,'height':height});frame.wait_for_timeout(120)
            self.assertFalse(frame.evaluate('document.documentElement.scrollWidth>innerWidth'))
            for b in game.locator('#dm-city-walk button').all():
                box=b.bounding_box();self.assertGreaterEqual(box['width'],44);self.assertGreaterEqual(box['height'],44)
                self.assertLessEqual(box['x']+box['width'],width+.5)
            self.page.screenshot(path=str(support.ARTIFACTS/f'madrid-paseo-{width}x{height}.png'))
        self.page.set_viewport_size({'width':390,'height':844})
        game.locator('#dm-city-walk').get_by_role('button',name='Menú',exact=True).click()
        self.assertTrue(game.locator('#dm-city-actions').evaluate('e=>e.open'))
        game.locator('#dm-city-walk').get_by_role('button',name='Menú',exact=True).click()
        self.assertFalse(game.locator('#dm-city-actions').evaluate('e=>e.open'))
        game.locator('#dm-city-walk').get_by_role('button',name='Plano',exact=True).click()
        self.page.screenshot(path=str(support.ARTIFACTS/'madrid-plano-iphone.png'))
        self.page.keyboard.press('Escape');self.page.keyboard.press('Escape')
        expect(game.locator('.worldWrap #map')).to_be_visible()
        game.locator('[data-tab="life"]').click();expect(game.locator('#life')).to_be_visible()
        game.locator('[data-tab="travel"]').click();expect(game.locator('#travel')).to_be_visible()
        self.assertEqual(self.errors,[])

    def test_new_districts_and_museum_garden_bar_remain_available(self):
        game,frame,_=self.open_city()
        for zone,site in [('Distrito Cultural','Museo de los Recuerdos'),('Jardines del Este','Huerto Comunitario'),('Barrio Nocturno','Bar Eclipse')]:
            game.locator('#dm-city-actions>summary').click();game.locator('#dm54-trigger').click()
            game.locator('.dm59-barrio').get_by_role('button',name=zone,exact=False).click()
            expect(game.locator('#dm59-overlay')).to_be_visible()
            game.locator('.dm59-sites').get_by_role('button',name=site,exact=False).click()
            if site=='Huerto Comunitario':
                expect(game.locator('#dm-farm-scene')).to_be_visible()
                game.locator('#dm-farm-scene').get_by_role('button',name='Calle',exact=True).click()
            else:
                expect(game.locator('#dm58-overlay')).to_be_visible()
                game.locator('#dm58-overlay').get_by_role('button',name='Cerrar',exact=True).click()
        self.assertEqual(self.errors,[])

    def test_native_day_night_and_rain_keep_working_without_changing_progress(self):
        brightness=[]
        for label,day,time,role in [('dia',2,600,'jc'),('noche',2,1260,'gabi'),('lluvia',8,600,'jc')]:
            game,frame,_=self.open_city(role,time=time,day=day,x=820,y=520)
            game.get_by_role('button',name='Pasear',exact=True).click()
            before=self.raw();frame.wait_for_timeout(150)
            s=self.snapshot(frame);self.assertEqual(s['day'],day);self.assertEqual(s['time'],time)
            if label=='lluvia':self.assertTrue(s['weather']['isWet'])
            brightness.append(game.locator('#map').evaluate('''c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
                let total=0,count=0;for(let i=0;i<p.length;i+=128){total+=p[i]+p[i+1]+p[i+2];count+=3;}return total/count;}'''))
            self.page.screenshot(path=str(support.ARTIFACTS/f'madrid-{label}-iphone.png'))
            self.assertEqual(self.raw(),before)
        self.assertLess(brightness[1],brightness[0]*.85)
        self.assertEqual(self.errors,[])

    def test_drawing_failure_resets_canvas_transform_before_historical_fallback(self):
        game,frame,_=self.open_city();game.get_by_role('button',name='Pasear',exact=True).click()
        before=self.raw()
        frame.evaluate('''window.DosMundosCityLegacy.install({draw(g){g.save();g.translate(9999,9999);
            g.beginPath();g.rect(0,0,1,1);g.clip();throw new Error('QA drawing failure');}})''')
        self.assertFalse(self.snapshot(frame)['ready']);self.assertEqual(self.snapshot(frame)['viewHeight'],448)
        expect(game.locator('.worldWrap #map')).to_be_visible()
        painted=game.locator('#map').evaluate('''c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
            let n=0;for(let i=3;i<a.length;i+=1024)if(a[i]>0)n++;return n;}''')
        self.assertGreater(painted,500)
        self.assertEqual(self.raw(),before)
        game.locator('#goHome').click();expect(game.locator('#dm-house-scene')).to_be_visible()
        self.assertEqual(self.errors,[])


if __name__=='__main__':unittest.main(verbosity=2)
