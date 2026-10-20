"""Regression checks for sparse galleries and old drafts with <6 bouquet photos."""
import json
from playwright.sync_api import sync_playwright
from support import isolated_cms, get_content, PROJECT

artifacts=PROJECT/'tests/artifacts';artifacts.mkdir(exist_ok=True)
with isolated_cms() as (root,base),sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    data=get_content(base)['content']
    available=data['photos'].copy()
    # Include enough distinct URLs to exercise scrolling as well as sparse rows.
    for i in range(7,25):
        path=f'gift/assets/layout-test-{i}.jpg'
        (root/'public'/path).write_bytes((root/'public'/available[(i-7)%6]).read_bytes())
        available.append(path)
    page.route('**/content/site.json',lambda route:route.fulfill(json=data))
    for width in [390,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for count in [1,2,3,4,5,6,24]:
            data['photos']=available[:count]
            page.goto(base)
            page.wait_for_selector('#numpad button')
            page.evaluate('''() => {
                document.querySelector('#lock-screen').hidden=true;
                document.querySelector('#btn-image').click();
            }''')
            page.wait_for_timeout(650)
            stats=page.locator('#gallery-top').evaluate('''grid=>{
                const images=[...grid.querySelectorAll('img')],modal=grid.closest('.image-modal').getBoundingClientRect();
                const cards=[...grid.children].map(n=>n.getBoundingClientRect());
                return {count:images.length,unique:new Set(images.map(n=>n.src)).size,
                    loaded:images.every(n=>n.complete&&n.naturalWidth>0),
                    horizontal:cards.every(r=>r.left>=modal.left&&r.right<=modal.right),
                    modalFits:modal.top>=0&&modal.bottom<=innerHeight+1,
                    blankLastRow:cards.length===1?false:Math.abs(cards.at(-1).right-grid.getBoundingClientRect().right)>2};
            }''')
            assert stats['count']==count and stats['unique']==count,stats
            assert stats['loaded'] and stats['horizontal'] and stats['modalFits'],(width,count,stats)
            if count==5:
                assert not stats['blankLastRow'],stats
                page.screenshot(path=str(artifacts/f'gallery-five-{width}.png'))
            page.locator('#gallery-top button').last.scroll_into_view_if_needed()
            page.locator('#gallery-top button').last.click()
            page.locator('#lightbox-overlay.active').wait_for()
            assert page.locator('#lightbox-img').get_attribute('src').endswith(data['photos'][-1])
        print('PASS gallery layouts:',width,'px, 1/2/3/4/5/6/24 photos, unique cards, contained modal, lightbox',flush=True)
    data['photos']=available[:5]
    del data['bouquetPhotos'];del data['letterImage'] # Legacy five-photo draft.
    page.goto(base+'/gift/')
    page.wait_for_function('document.querySelectorAll(".bouquet-photo").length===5')
    assert page.locator('.bouquet-photo img').evaluate_all('(nodes)=>new Set(nodes.map(n=>n.src)).size')==5
    page.evaluate('''() => {
        document.querySelectorAll('.scene').forEach(n=>n.classList.remove('active'));
        document.querySelector('#flowers').classList.add('active','revealing');
    }''')
    page.wait_for_timeout(2600)
    page.screenshot(path=str(artifacts/'bouquet-five.png'))
    assert not errors,errors
    print('PASS legacy bouquet: five unique photos, no repeated sixth photo',flush=True)
    browser.close()
