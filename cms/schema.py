"""Content validation shared by save and export. Only local published assets."""
import re
import hashlib
from pathlib import Path

IMAGE={'.jpg','.jpeg','.png','.webp','.gif'}
AUDIO={'.mp3','.m4a','.wav','.ogg','.webm'}
VIDEO={'.mp4','.webm'}
TEXT_LIMITS={'title':120,'hint':160,'sender':60,'recipient':60,'cardTitle':150,
             'signature':160,'holdHint':160,'letter':10000,'giftLetter':10000,'flyingText':200,
             'envelopeSub':100,'envelopeTitle':100,'envelopeDesc':150}

def with_photo_defaults(data):
    """Preserve existing gifts while giving each new image slot its own value."""
    music=dict(data.get('music',{})) if isinstance(data.get('music'),dict) else {}
    if 'letter' not in music:
        music['letter']=''
    if 'playlist' in music and isinstance(music['playlist'], list):
        for s in music['playlist']:
            if isinstance(s, dict) and 'artist' not in s:
                s['artist'] = 'Dành tặng em'
    return {**data, 'letterImage': data.get('letterImage', data.get('lockImage')),
            'bouquetPhotos': list(data.get('bouquetPhotos', data.get('photos', []))),
            'galleryMode': data.get('galleryMode', 'rails'),
            'galleryInterval': int(data.get('galleryInterval', 4) if str(data.get('galleryInterval', 4)).isdigit() else 4),
            'galleryEffect': data.get('galleryEffect', 'fade'),
            'envelopeSub': data.get('envelopeSub', 'Dành tặng em'),
            'envelopeTitle': data.get('envelopeTitle', f"Thương {data.get('recipient', 'em')}" if data.get('recipient') else 'Thương em'),
            'envelopeDesc': data.get('envelopeDesc', 'Một chút yêu thương'),
            'music': music}

def validate_content(data, public, publishing=False):
    if not isinstance(data,dict) or data.get('version')!=1:
        raise ValueError('Phiên bản nội dung không hợp lệ.')
    data=with_photo_defaults(data)
    result={'version':1,
            'galleryMode': str(data.get('galleryMode', 'rails')).strip().lower() if str(data.get('galleryMode', 'rails')).strip().lower() in ['rails', 'grid', 'slideshow'] else 'rails',
            'galleryInterval': int(data.get('galleryInterval')) if str(data.get('galleryInterval')).isdigit() and 2 <= int(data.get('galleryInterval')) <= 10 else 4,
            'galleryEffect': str(data.get('galleryEffect')).strip().lower() if str(data.get('galleryEffect')).strip().lower() in ['fade', 'slide', 'zoom'] else 'fade'}
    for field,limit in TEXT_LIMITS.items():
        value=data.get(field)
        if not isinstance(value,str) or not value.strip() or len(value)>limit:
            raise ValueError(f'Nội dung {field} phải có từ 1 đến {limit} ký tự.')
        result[field]=value.strip()
    if not isinstance(data.get('pin'),str) or not re.fullmatch(r'\d{4}',data['pin'],flags=re.ASCII):
        raise ValueError('Mật khẩu cần đúng 4 chữ số.')
    result['pin']=data['pin']
    def asset(value, extensions):
        if not isinstance(value,str) or '\\' in value or ':' in value or value.startswith('/'):
            raise ValueError('Đường dẫn tài nguyên không hợp lệ.')
        target=(public/value).resolve()
        if not target.is_relative_to(public.resolve()) or not target.is_file() or target.suffix.lower() not in extensions:
            raise ValueError('Không tìm thấy tài nguyên phù hợp: '+value)
        return target.relative_to(public.resolve()).as_posix()
    photos=data.get('photos')
    if not isinstance(photos,list) or not 1<=len(photos)<=24:
        raise ValueError('Chọn từ 1 đến 24 ảnh.')
    def unique_images(paths):
        seen=set();unique=[]
        for path in paths:
            path=asset(path,IMAGE)
            digest=hashlib.sha256((public/path).read_bytes()).digest()
            if digest not in seen:unique.append(path);seen.add(digest)
        return unique
    result['photos']=unique_images(photos)
    result['lockImage']=asset(data.get('lockImage'),IMAGE)
    result['letterImage']=asset(data.get('letterImage'),IMAGE)
    bouquet=data.get('bouquetPhotos')
    if not isinstance(bouquet,list) or len(bouquet)>24:
        raise ValueError('Bộ ảnh bó hoa có tối đa 24 ảnh.')
    result['bouquetPhotos']=unique_images(bouquet)
    if publishing and len(result['bouquetPhotos'])<6:
        raise ValueError(f"Bó hoa cần ít nhất 6 ảnh khác nhau để xuất website. Hiện có {len(result['bouquetPhotos'])} ảnh; hãy thêm ảnh trong mục Ảnh bó hoa.")
    wishes=data.get('wishes')
    if not isinstance(wishes,list) or not 1<=len(wishes)<=30 or any(not isinstance(x,str) or not x.strip() or len(x)>180 for x in wishes):
        raise ValueError('Cần 1–30 lời chúc, mỗi lời tối đa 180 ký tự.')
    result['wishes']=[x.strip() for x in wishes]
    background=data.get('background',{})
    if not isinstance(background,dict) or background.get('type') not in ['image','video']:
        raise ValueError('Nền phải là ảnh hoặc video.')
    result['background']={'type':background['type'],'src':asset(background.get('src'),VIDEO if background['type']=='video' else IMAGE)}
    music=data.get('music',{})
    if not isinstance(music,dict):raise ValueError('Âm nhạc không hợp lệ.')
    result['music']={'intro':asset(music.get('intro'),AUDIO),'gift':asset(music.get('gift'),AUDIO)}
    for key in ['gallery','letter']:
        val=music.get(key)
        if val and str(val).strip():
            result['music'][key]=asset(str(val).strip(),AUDIO)
        else:
            result['music'][key]=''
    playlist=music.get('playlist')
    if not isinstance(playlist,list) or not 1<=len(playlist)<=12:raise ValueError('Chọn 1–12 bài nhạc.')
    result['music']['playlist']=[]
    for song in playlist:
        if not isinstance(song,dict) or not isinstance(song.get('title'),str) or not 1<=len(song['title'].strip())<=100:
            raise ValueError('Tên bài nhạc cần từ 1 đến 100 ký tự.')
        artist=str(song.get('artist','Dành tặng em') or 'Dành tặng em').strip()
        if len(artist)>100:
            raise ValueError('Lời đề từ / nghệ sĩ bài nhạc tối đa 100 ký tự.')
        result['music']['playlist'].append({'title':song['title'].strip(),'artist':artist,'src':asset(song.get('src'),AUDIO),'cover':asset(song.get('cover'),IMAGE)})
    return result

def content_assets(data):
    return set(data['photos']+data['bouquetPhotos']+[data['lockImage'],data['letterImage'],data['background']['src']]+
               [data['music'][k] for k in ['intro','gallery','gift','letter'] if data['music'].get(k)]+
               [s[k] for s in data['music']['playlist'] for k in ['src','cover']])

def folder_name(value):
    if not isinstance(value,str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,59}',value):
        raise ValueError('Tên thư mục dùng 1–60 chữ thường, số hoặc dấu gạch ngang.')
    if value.lower().split('.')[0] in {'con','prn','aux','nul',*(f'com{i}' for i in range(10)),*(f'lpt{i}' for i in range(10))}:
        raise ValueError('Tên thư mục này được hệ điều hành dành riêng.')
    return value
