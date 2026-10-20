import copy
import json
import unittest
from pathlib import Path
from zipfile import ZipFile
from support import isolated_cms,request,get_content

class CMSChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.context=isolated_cms();cls.root,cls.base=cls.context.__enter__()
    @classmethod
    def tearDownClass(cls):cls.context.__exit__(None,None,None)

    def setUp(self):self.initial=get_content(self.base)['content']

    def tearDown(self):
        saved=get_content(self.base)
        self.assertEqual(request(self.base,'/api/content','PUT',{'content':self.initial,'revision':saved['revision']})[0],200)

    def test_independent_images_and_incomplete_bouquet(self):
        saved=get_content(self.base);data=saved['content']
        lock=data['lockImage'];letter=data['letterImage']
        data['photos']=[data['photos'][3]];data['bouquetPhotos']=data['bouquetPhotos'][:5]
        # A renamed copy is still the same photo, and cannot satisfy the minimum.
        duplicate='uploads/duplicate.jpg';(self.root/'public/uploads').mkdir(exist_ok=True)
        (self.root/'public'/duplicate).write_bytes((self.root/'public'/data['bouquetPhotos'][0]).read_bytes())
        data['bouquetPhotos'].append(duplicate)
        self.assertEqual(request(self.base,'/api/content','PUT',saved)[0],200)
        draft=get_content(self.base)
        self.assertEqual(len(draft['content']['bouquetPhotos']),5)
        self.assertEqual(draft['content']['lockImage'],lock)
        self.assertEqual(draft['content']['letterImage'],letter)
        code,body=request(self.base,'/api/export','POST',{'name':'incomplete','revision':draft['revision']})
        self.assertEqual(code,400);self.assertIn('6 ảnh',json.loads(body)['error'])
        self.assertFalse((self.root/'exports/incomplete').exists())
        draft['content']['bouquetPhotos'].append('gift/assets/photo-6.jpg')
        self.assertEqual(request(self.base,'/api/content','PUT',draft)[0],200)
        self.assertEqual(request(self.base,'/api/export','POST',{'name':'complete','revision':get_content(self.base)['revision']})[0],201)

    def test_legacy_content_defaults(self):
        saved=get_content(self.base);data=saved['content']
        del data['letterImage'];del data['bouquetPhotos']
        self.assertEqual(request(self.base,'/api/content','PUT',saved)[0],200)
        restored=get_content(self.base)['content']
        self.assertEqual(restored['letterImage'],data['lockImage'])
        self.assertEqual(restored['bouquetPhotos'],data['photos'])

    def test_save_reload_conflict_and_invalid_data(self):
        old=get_content(self.base);new=copy.deepcopy(old['content']);new['recipient']='Ngọc Quỳnh';new['letter']='Một lời chúc dành riêng cho em ♥'
        code,body=request(self.base,'/api/content','PUT',{'content':new,'revision':old['revision']});self.assertEqual(code,200)
        self.assertEqual(get_content(self.base)['content']['recipient'],'Ngọc Quỳnh')
        self.assertEqual(request(self.base,'/api/content','PUT',old)[0],409)
        saved=get_content(self.base);bad=copy.deepcopy(saved);bad['content']['photos']=['../cms/server.py']
        self.assertEqual(request(self.base,'/api/content','PUT',bad)[0],400)
        self.assertEqual(get_content(self.base),saved)
        bad=copy.deepcopy(saved);bad['content']['pin']='12'
        self.assertEqual(request(self.base,'/api/content','PUT',bad)[0],400)

    def test_upload_type_and_export_portability(self):
        raw=(self.root/'public/gift/assets/photo-2.jpg').read_bytes()
        code,body=request(self.base,'/api/upload?name=my-photo.jpg','POST',raw,{'Content-Type':'application/octet-stream'})
        self.assertEqual(code,201);asset=json.loads(body)['path']
        self.assertEqual(request(self.base,'/api/upload?name=fake.jpg','POST',b'<script>bad</script>')[0],400)
        self.assertEqual(request(self.base,'/api/upload?name=bad.html','POST',raw)[0],400)
        saved=get_content(self.base);saved['content']['photos']=[asset];saved['content']['lockImage']=asset
        for song in saved['content']['music']['playlist']:song['cover']=asset
        self.assertEqual(request(self.base,'/api/content','PUT',saved)[0],200)
        revision=get_content(self.base)['revision']
        for name in ['../outside','CON','folder/name','a b']:
            self.assertEqual(request(self.base,'/api/export','POST',{'name':name,'revision':revision})[0],400)
        code,body=request(self.base,'/api/export','POST',{'name':'gui-quynh','revision':revision});self.assertEqual(code,201)
        result=json.loads(body);target=self.root/'exports/gui-quynh'
        self.assertTrue((target/asset).is_file());self.assertTrue((target/'vercel.json').is_file())
        self.assertFalse((target/'admin').exists());self.assertFalse((target/'cms').exists())
        self.assertTrue((target/'gift/assets/photo-1.jpg').exists()) # Separate bouquet selection.
        for image in saved['content']['bouquetPhotos']+[saved['content']['letterImage']]:
            self.assertTrue((target/image).is_file())
        self.assertEqual(json.loads((target/'content/site.json').read_text(encoding='utf-8'))['photos'],[asset])
        self.assertEqual(request(self.base,result['preview'])[0],200)
        with ZipFile(self.root/'exports/gui-quynh.zip') as z:
            self.assertIsNone(z.testzip());self.assertIn('gui-quynh/index.html',z.namelist())
            self.assertTrue(all(x.startswith('gui-quynh/') for x in z.namelist()))
        self.assertEqual(request(self.base,'/api/export','POST',{'name':'gui-quynh','revision':revision})[0],409)

    def test_local_only_and_no_source_exposure(self):
        self.assertEqual(request(self.base,'/api/content',headers={'Origin':'https://example.com'})[0],403)
        self.assertEqual(request(self.base,'/api/content',headers={'Host':'example.com'})[0],403)
        self.assertEqual(request(self.base,'/api/content','PUT',{}, {'X-CMS-Request':''})[0],403)
        self.assertEqual(request(self.base,'/cms/server.py')[0],404)
        self.assertEqual(request(self.base,'/admin/../../cms/server.py')[0],404)

if __name__=='__main__':unittest.main()
