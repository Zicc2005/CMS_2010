// One published content file for every scene. Works under a subdirectory too.
window.SITE_READY = (() => {
  const base = new URL('.', document.currentScript.src);
  const asset = path => path ? new URL(path, base).href : '';
  return fetch(new URL('content/site.json', base), {cache:'no-store'})
    .then(response => {if(!response.ok)throw new Error('Không tải được nội dung website.');return response.json();})
    .then(site => {
      window.GIFT_CONFIG = {
        ...site, gallery:[...new Set(site.photos)].map(asset), lockImage:asset(site.lockImage || site.photos[0]),
        letterImage:asset(site.letterImage || site.lockImage || site.photos[0]),
        bouquetPhotos:[...new Set(site.bouquetPhotos || site.photos)].map(asset),
        background:{...site.background,src:asset(site.background.src)},
        music:{intro:asset(site.music.intro),gallery:asset(site.music.gallery),gift:asset(site.music.gift),letter:asset(site.music.letter)},
        songs:site.music.playlist.map(song=>({...song,src:asset(song.src),cover:asset(song.cover || site.photos[0])}))
      };
      window.GIFT_PERSONAL = {name:site.recipient,sender:site.sender,title:site.cardTitle,signature:site.signature,button:site.holdHint,letter:site.giftLetter,wishes:site.wishes};
      const heading=document.querySelector('#mail-paper h2');if(heading)heading.textContent=`Gửi ${site.recipient} thương,`;
      const signature=document.querySelector('.mail-signature');if(signature)signature.textContent=site.signature;
      const insSpan = document.querySelector('.mail-inscription span');
      if (insSpan) insSpan.textContent = site.envelopeSub || 'Dành tặng em';
      const insStrong = document.querySelector('.mail-inscription strong');
      if (insStrong) insStrong.textContent = site.envelopeTitle || (site.recipient ? `Thương ${site.recipient}` : 'Thương em');
      const insSmall = document.querySelector('.mail-inscription small');
      if (insSmall) insSmall.textContent = site.envelopeDesc || 'Một chút yêu thương';
      document.title=site.title;
      return site;
    });
})();
