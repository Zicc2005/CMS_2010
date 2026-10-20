"""End-to-end CMS -> saved files -> standalone export -> recipient flow."""
import functools
import base64
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json
import math
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright
from support import isolated_cms,get_content,PROJECT

artifacts=PROJECT/'tests/artifacts';artifacts.mkdir(exist_ok=True)
class QuietStatic(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def copyfile(self,source,outputfile):
  try:super().copyfile(source,outputfile)
  except (BrokenPipeError,ConnectionResetError):pass

with isolated_cms() as (root,base),sync_playwright() as p:
 browser=p.chromium.launch()
 context=browser.new_context(viewport={'width':1440,'height':1000})
 page=context.new_page();errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:failed.append(r.url) if r.status>=400 and not r.url.endswith('favicon.ico') else None)
 page.goto(base+'/admin/');page.wait_for_function('!document.querySelector("#save").disabled')
 page.locator('[name=recipient]').fill('Ngọc Quỳnh');page.locator('[name=sender]').fill('Minh')
 page.locator('[name=pin]').fill('1020');page.locator('[name=letter]').fill('Một lá thư từ CMS, gửi Ngọc Quỳnh ngày 20/10 ♥')
 page.locator('[name=hint]').fill('Gợi ý riêng từ CMS')
 # Duplicate uploads must not add another card.
 page.locator('#photo-files').set_input_files(str(root/'public/gift/assets/photo-6.jpg'))
 page.wait_for_function('document.querySelector("#status").textContent.includes("bỏ qua")')
 assert page.locator('#photo-grid .photo-card').count()==6
 uploaded=root/'new-photo.png'
 uploaded.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='))
 page.locator('#photo-files').set_input_files(str(uploaded))
 page.wait_for_function('document.querySelectorAll("#photo-grid .photo-card").length===7')
 # Distinct image uploads must remain independent from gallery and bouquet edits.
 page.locator('#lock-image-slot input').set_input_files(str(root/'public/gift/assets/photo-4.jpg'))
 page.wait_for_function('document.querySelector("#lock-image-slot img").src.endsWith("photo-4.jpg")')
 page.locator('#letter-image-slot input').set_input_files(str(root/'public/gift/assets/photo-5.jpg'))
 page.wait_for_function('document.querySelector("#letter-image-slot img").src.endsWith("photo-5.jpg")')
 page.locator('#bouquet-grid .photo-card').last.locator('button').last.click()
 assert 'Cần thêm 1' in page.locator('#bouquet-warning').inner_text()
 page.locator('#bouquet-files').set_input_files(str(root/'public/gift/assets/photo-6.jpg'))
 page.wait_for_function('document.querySelectorAll("#bouquet-grid .photo-card").length===6')
 page.locator('#audio-slots input[type=file]').nth(1).set_input_files(str(root/'public/gift/assets/greeting-20-10.mp3'))
 page.wait_for_function('document.querySelectorAll("#audio-slots audio")[1].src.includes("uploads/")')
 page.locator('#background-file').set_input_files(str(root/'public/gift/assets/photo-3.jpg'))
 page.wait_for_selector('#background-preview img')
 page.locator('#save').click();page.wait_for_function('document.querySelector("#save-state").textContent.startsWith("Đã lưu")')
 page.reload();page.wait_for_function('!document.querySelector("#save").disabled')
 assert page.locator('[name=recipient]').input_value()=='Ngọc Quỳnh'
 assert page.locator('#photo-grid .photo-card').count()==7
 assert page.locator('#bouquet-grid .photo-card').count()==6
 assert page.locator('#lock-image-slot img').get_attribute('src').endswith('photo-4.jpg')
 assert page.locator('#letter-image-slot img').get_attribute('src').endswith('photo-5.jpg')
 page.screenshot(path=str(artifacts/'cms-desktop.png'))
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(artifacts/'cms-mobile.png'))
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':1440,'height':1000})
 page.locator('#folder-name').fill('thu-gui-quynh');page.locator('#export').click()
 page.locator('#export-result').wait_for(state='visible',timeout=15000)
 assert '/api/download/thu-gui-quynh.zip' in page.locator('#download').get_attribute('href')
 page.screenshot(path=str(artifacts/'cms-export.png'))
 assert not errors,errors
 assert not failed,failed
 data=get_content(base)['content'];assert data['music']['gallery'].startswith('uploads/')
 print('PASS CMS: upload photo/audio/background, save, reload, mobile layout, named folder + ZIP',flush=True)
 context.close()

 exported=root/'exports/thu-gui-quynh'
 static=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietStatic,directory=str(exported)))
 thread=threading.Thread(target=static.serve_forever,daemon=True);thread.start()
 standalone=f'http://127.0.0.1:{static.server_port}'
 try:
  for mobile in [False,True]:
   context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},is_mobile=mobile,has_touch=mobile)
   page=context.new_page();errors=[];failed=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('response',lambda r:failed.append(r.url) if r.status>=400 and not r.url.endswith('favicon.ico') else None)
   page.goto(standalone)
   page.wait_for_function('document.querySelector("#lock-photo").src.endsWith("photo-4.jpg")')
   assert page.locator('#hint-text').inner_text()=='Gợi ý riêng từ CMS'
   for digit in '1020':page.locator(f'#numpad [data-value="{digit}"]').click()
   intro=page.frame_locator('#intro-frame');intro.locator('#card.active').wait_for()
   assert intro.locator('.recipient').first.text_content()=='Ngọc Quỳnh'
   assert intro.locator('.puzzle-tile').count()==62
   page.locator('#intro-continue').click();page.wait_for_timeout(800)
   def menu(selector):page.locator(selector).hover(force=True);page.locator(selector).click()
   menu('#btn-image');page.wait_for_function('document.querySelector("#image-sound").currentTime>0')
   assert '/uploads/' in page.locator('#image-sound').get_attribute('src')
   assert page.locator('#gallery-top img').count()==7
   assert page.locator('#gallery-top img').evaluate_all('(nodes)=>new Set(nodes.map(n=>n.src)).size')==7
   page.screenshot(path=str(artifacts/f'gallery-{mobile}.png'))
   page.locator('#close-image').click();page.wait_for_timeout(600)
   assert page.locator('#image-sound').evaluate('(a)=>a.paused')
   menu('#btn-letter');page.locator('#open-envelope').click();page.wait_for_timeout(1600)
   assert 'CMS' in page.locator('#letter-body').inner_text()
   assert page.locator('#mail-photo').get_attribute('src').endswith('photo-5.jpg')
   assert 'Ngọc Quỳnh' in page.locator('#mail-paper h2').inner_text()
   page.locator('#close-letter').click();page.wait_for_timeout(3500)
   page.locator('#bloom-gift').click()
   gift=page.frame_locator('.gift-iframe');heart=gift.locator('#begin');heart.wait_for(state='visible')
   assert gift.locator('#edit').count()==0 and gift.locator('dialog').count()==0
   box=heart.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(1400);page.mouse.up()
   gift.locator('#flowers.active').wait_for();page.wait_for_timeout(1200)
   assert gift.locator('.bouquet-photo img').count()==6
   assert gift.locator('.bouquet-photo img').evaluate_all('(nodes)=>new Set(nodes.map(n=>n.src)).size')==6
   gift.locator('#flowerHeart').click();gift.locator('#spiral.active').wait_for(timeout=8000);page.wait_for_timeout(1000)
   stage=gift.locator('#spiralItems');box=stage.bounding_box()
   positions=lambda:gift.locator('.flying-photo').evaluate_all('(nodes)=>nodes.map(n=>{const m=new DOMMatrix(getComputedStyle(n).transform);return [m.m41,m.m42]})')
   before=positions()
   x=box['x']+box['width']*.25;y=box['y']+box['height']*.45
   if mobile:
    cdp=context.new_cdp_session(page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for i in range(1,9):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+box['width']*.42*i/8,'y':y+box['height']*.2*i/8}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+box['width']*.42,y+box['height']*.2,steps=14);page.mouse.up()
   page.wait_for_timeout(650);after=positions()
   movement=sum(math.hypot(a[0]-b[0],a[1]-b[1]) for a,b in zip(before,after))/len(before)
   assert movement>(40 if mobile else 80),(mobile,movement)
   page.screenshot(path=str(artifacts/f'universe-{mobile}.png'))
   if not mobile:
    stage.focus();before=positions();page.keyboard.press('ArrowUp');page.wait_for_timeout(400);after=positions()
    assert sum(abs(a[1]-b[1]) for a,b in zip(before,after))/len(before)>5
   gift.locator('#spiral [data-go=sphere]').click();gift.locator('#sphere.active').wait_for();page.wait_for_timeout(1000)
   assert gift.locator('#globeView canvas').count()==1
   page.locator('#close-gift').click()
   assert not errors,errors
   assert not failed,failed
   print('PASS standalone export:',mobile,'PIN/calendar, custom media, letter/bloom, heart/flowers, wide orbit, globe; average drag movement',round(movement),'px',flush=True)
   context.close()
 finally:static.shutdown();static.server_close();thread.join()
 browser.close()
