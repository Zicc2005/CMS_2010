"""Local, file-based CMS. Exported websites need no Python or API server."""
import argparse
import hashlib
import json
import mimetypes
import os
import shutil
import threading
import uuid
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,parse_qs,unquote
from zipfile import ZipFile,ZIP_DEFLATED
from schema import validate_content,with_photo_defaults,content_assets,folder_name,IMAGE,AUDIO,VIDEO

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'
CONTENT=PUBLIC/'content/site.json'
EXPORTS=ROOT/'exports'
LOCK=threading.Lock()
mimetypes.add_type('text/javascript','.js')
mimetypes.add_type('audio/mp4','.m4a')
mimetypes.add_type('audio/webm','.webm')
mimetypes.add_type('audio/wav','.wav')

def current():
    raw=CONTENT.read_bytes()
    return with_photo_defaults(json.loads(raw)),hashlib.sha256(raw).hexdigest()

def save(data):
    temp=CONTENT.with_suffix('.tmp')
    temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    os.replace(temp,CONTENT)

def export_site(name,data,overwrite=False):
    name=folder_name(name)
    EXPORTS.mkdir(exist_ok=True)
    target=EXPORTS/name
    archive=EXPORTS/(name+'.zip')
    if target.exists() or archive.exists():
        if overwrite:
            if target.exists(): shutil.rmtree(target)
            archive.unlink(missing_ok=True)
        else:
            raise FileExistsError('Tên này đã được xuất. Hãy chọn tên mới để giữ nguyên bản trước.')
    staging=EXPORTS/('.building-'+uuid.uuid4().hex)
    assets=content_assets(data)
    try:
        for source in PUBLIC.rglob('*'):
            if not source.is_file():continue
            relative=source.relative_to(PUBLIC);path=relative.as_posix()
            managed=relative.parts[0] in ['uploads','background','sound'] or path.startswith('gift/assets/photo-') or path in ['gift/assets/music.m4a','gift/assets/calendar-melody.wav','gift/assets/greeting-20-10.mp3']
            if managed and path not in assets:continue
            destination=staging/relative;destination.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(source,destination)
        (staging/'content/site.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (staging/'DEPLOY.md').write_text((ROOT/'docs/DEPLOY.md').read_text(encoding='utf-8'),encoding='utf-8')
        (staging/'.gitignore').write_text('.vercel/\n.DS_Store\nThumbs.db\n',encoding='utf-8')
        # No build step: Vercel serves only this standalone folder.
        (staging/'vercel.json').write_text(json.dumps({'version':2,'framework':None,'buildCommand':None,'outputDirectory':'.','cleanUrls':True,'headers':[{'source':'/content/site.json','headers':[{'key':'Cache-Control','value':'no-store, no-cache, must-revalidate'}]}]},indent=2),encoding='utf-8')
        with ZipFile(archive,'w',ZIP_DEFLATED) as z:
            for file in staging.rglob('*'):
                if file.is_file():z.write(file,Path(name)/file.relative_to(staging))
        with ZipFile(archive) as z:
            if z.testzip():raise ValueError('Không kiểm tra được bản ZIP.')
        staging.rename(target)
        return {'name':name,'folder':str(target),'preview':f'/exports/{name}/','download':f'/api/download/{name}.zip'}
    except Exception:
        if staging.exists():
            assert staging.resolve().parent==EXPORTS.resolve() and staging.name.startswith('.building-')
            shutil.rmtree(staging)
        archive.unlink(missing_ok=True)
        raise

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(PUBLIC),**kwargs)
    def log_message(self,format,*args):pass
    def copyfile(self,source,outputfile):
        try:super().copyfile(source,outputfile)
        except (BrokenPipeError,ConnectionResetError):pass # Browser cancelled a media preview.
    def send_json(self,status,data):
        body=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
    def local_request(self,write=False):
        host=self.headers.get('Host','')
        if host not in [f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}']:return False
        origin=self.headers.get('Origin')
        if origin and origin!=f'http://{host}':return False
        return not write or self.headers.get('X-CMS-Request')=='1'
    def read_body(self,limit):
        length=int(self.headers.get('Content-Length','0'))
        if not 0<length<=limit:raise ValueError('Dung lượng tệp hoặc nội dung vượt giới hạn cho phép.')
        return self.rfile.read(length)
    def translate_path(self,path):
        path=unquote(urlsplit(path).path)
        if path.startswith('/admin/') or path=='/admin':base=ROOT/'admin';relative=path.removeprefix('/admin').lstrip('/') or 'index.html'
        elif path.startswith('/exports/'):base=EXPORTS;relative=path.removeprefix('/exports/')
        elif path.startswith('/api/download/'):base=EXPORTS;relative=path.removeprefix('/api/download/')
        else:base=PUBLIC;relative=path.lstrip('/')
        target=(base/relative).resolve()
        if not target.is_relative_to(base.resolve()):return str(ROOT/'__not_found__')
        return str(target)
    def list_directory(self,path):self.send_error(404);return None
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def do_GET(self):
        if not self.local_request():return self.send_json(403,{'error':'CMS chỉ truy cập từ máy này.'})
        path=urlsplit(self.path).path
        if path=='/api/content':
            with LOCK:data,revision=current()
            return self.send_json(200,{'content':data,'revision':revision})
        if path.startswith('/api/download/'):
            name=path.removeprefix('/api/download/')
            if '/' in name or not name.endswith('.zip'):return self.send_error(404)
        return super().do_GET()
    def do_HEAD(self):
        if not self.local_request():return self.send_error(403)
        return super().do_HEAD()
    def do_POST(self):self.mutate()
    def do_PUT(self):self.mutate()
    def mutate(self):
        if not self.local_request(write=True):return self.send_json(403,{'error':'Yêu cầu CMS không hợp lệ.'})
        path=urlsplit(self.path).path
        try:
            if path=='/api/upload' and self.command=='POST':
                name=parse_qs(urlsplit(self.path).query).get('name',[''])[0];extension=Path(name).suffix.lower()
                if extension not in IMAGE|AUDIO|VIDEO:raise ValueError('Chỉ nhận ảnh, âm thanh hoặc video được hỗ trợ.')
                limit=(15 if extension in IMAGE else 90 if extension in VIDEO else 30)*1024*1024
                body=self.read_body(limit)
                signatures={'.jpg':body.startswith(b'\xff\xd8'),'.jpeg':body.startswith(b'\xff\xd8'),'.png':body.startswith(b'\x89PNG\r\n\x1a\n'),'.webp':body[:4]==b'RIFF' and body[8:12]==b'WEBP','.gif':body[:6] in [b'GIF87a',b'GIF89a'],'.mp3':body[:3]==b'ID3' or (len(body)>2 and body[0]==255 and body[1]&224==224),'.wav':body[:4]==b'RIFF' and body[8:12]==b'WAVE','.ogg':body[:4]==b'OggS','.mp4':body[4:8]==b'ftyp','.m4a':body[4:8]==b'ftyp','.webm':body[:4]==b'\x1aE\xdf\xa3'}
                if not signatures[extension]:raise ValueError('Định dạng thực tế không khớp phần mở rộng tệp.')
                if extension in IMAGE:
                    # Reusing a file must not create another portrait under a new UUID.
                    digest=hashlib.sha256(body).digest()
                    with LOCK:
                        data,_=current()
                        candidates=set(data['photos']+data['bouquetPhotos']+[data['lockImage'],data['letterImage']])
                        candidates.update(p.relative_to(PUBLIC).as_posix() for p in (PUBLIC/'uploads').glob('*') if p.suffix.lower() in IMAGE)
                        for path in sorted(candidates):
                            existing=(PUBLIC/path).resolve()
                            if existing.is_relative_to(PUBLIC.resolve()) and existing.is_file() and existing.stat().st_size==len(body) and hashlib.sha256(existing.read_bytes()).digest()==digest:
                                return self.send_json(201,{'path':path,'name':Path(name).name,'size':len(body)})
                filename=uuid.uuid4().hex+extension
                uploads=PUBLIC/'uploads';uploads.mkdir(exist_ok=True);(uploads/filename).write_bytes(body)
                return self.send_json(201,{'path':'uploads/'+filename,'name':Path(name).name,'size':len(body)})
            payload=json.loads(self.read_body(2*1024*1024))
            if not isinstance(payload,dict):raise ValueError('Nội dung yêu cầu không hợp lệ.')
            with LOCK:
                data,revision=current()
                if payload.get('revision')!=revision:return self.send_json(409,{'error':'Nội dung đã được cập nhật ở tab khác. Tải lại CMS trước khi tiếp tục.'})
                if path=='/api/content' and self.command=='PUT':
                    data=validate_content(payload.get('content'),PUBLIC);save(data)
                    return self.send_json(200,{'content':data,'revision':current()[1]})
                if path=='/api/export' and self.command=='POST':
                    return self.send_json(201,export_site(payload.get('name'),validate_content(data,PUBLIC,publishing=True),overwrite=bool(payload.get('overwrite'))))
            self.send_json(404,{'error':'Không tìm thấy chức năng này.'})
        except FileExistsError as error:self.send_json(409,{'error':str(error)})
        except (ValueError,TypeError,KeyError) as error:self.send_json(400,{'error':str(error)})
        except Exception as error:
            print(type(error).__name__,str(error),flush=True)
            self.send_json(500,{'error':'Không thể hoàn tất. Kiểm tra dung lượng và quyền ghi thư mục.'})

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=2010);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'CMS: http://127.0.0.1:{args.port}/admin/ | Website: http://127.0.0.1:{args.port}/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
