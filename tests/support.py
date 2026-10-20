import contextlib
import copy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import threading
import urllib.request
import urllib.error

PROJECT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(PROJECT/'cms'))
import server

@contextlib.contextmanager
def isolated_cms():
    with tempfile.TemporaryDirectory(prefix='gift-cms-test-') as directory:
        root=Path(directory).resolve()
        assert root.parent==Path(tempfile.gettempdir()).resolve() and root.name.startswith('gift-cms-test-')
        for name in ['public','admin','docs']:shutil.copytree(PROJECT/name,root/name)
        # Deterministic fixtures; never depend on or change the user's live selections.
        content_path=root/'public/content/site.json'
        fixture=json.loads(content_path.read_text(encoding='utf-8'))
        fixture['photos']=[f'gift/assets/photo-{i}.jpg' for i in range(1,7)]
        fixture['bouquetPhotos']=fixture['photos'].copy()
        fixture['lockImage']=fixture['photos'][0];fixture['letterImage']=fixture['photos'][1]
        content_path.write_text(json.dumps(fixture,ensure_ascii=False),encoding='utf-8')
        old=(server.ROOT,server.PUBLIC,server.CONTENT,server.EXPORTS)
        server.ROOT=root;server.PUBLIC=root/'public';server.CONTENT=server.PUBLIC/'content/site.json';server.EXPORTS=root/'exports'
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        try:yield root,f'http://127.0.0.1:{http.server_port}'
        finally:
            http.shutdown();http.server_close();thread.join()
            server.ROOT,server.PUBLIC,server.CONTENT,server.EXPORTS=old

def request(base,path,method='GET',data=None,headers=None):
    payload=json.dumps(data).encode() if isinstance(data,dict) else data
    request_headers={'X-CMS-Request':'1','Content-Type':'application/json'}
    if headers:request_headers.update(headers)
    req=urllib.request.Request(base+path,data=payload,headers=request_headers,method=method)
    try:
        with urllib.request.urlopen(req) as response:return response.status,response.read()
    except urllib.error.HTTPError as error:return error.code,error.read()

def get_content(base):return json.loads(request(base,'/api/content')[1])
