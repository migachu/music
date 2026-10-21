const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

let win;
let dbPath;
let artworkDir;
let db = { settings: { library_root: '' }, songs: [], playlists: [], playlistTracks: {}, favorites: [], nextSongId: 1, nextPlaylistId: 1 };
const now = () => Math.floor(Date.now()/1000);
async function persist(){
  await fs.mkdir(path.dirname(dbPath), {recursive:true});
  // Keep large embedded cover images out of the JSON database. Serializing thousands
  // of base64 images can exceed V8's maximum string length on Windows.
  const serializable = {
    ...db,
    songs: db.songs.map(({ artwork, ...song }) => song)
  };
  const tempPath = `${dbPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(serializable), 'utf8');
  await fs.rename(tempPath, dbPath);
}
async function saveArtwork(songId, picture){
  if (!picture) return null;
  await fs.mkdir(artworkDir, { recursive: true });
  const ext = /png/i.test(picture.format || '') ? 'png' : /webp/i.test(picture.format || '') ? 'webp' : 'jpg';
  const filePath = path.join(artworkDir, `${songId}.${ext}`);
  await fs.writeFile(filePath, picture.data);
  return filePath;
}
async function load(){
  dbPath = path.join(app.getPath('userData'), 'phoenix-library.json');
  artworkDir = path.join(app.getPath('userData'), 'artwork');
  try { const parsed=JSON.parse(await fs.readFile(dbPath,'utf8')); db={...db,...parsed}; }
  catch(e){ if(e.code!=='ENOENT') console.error('Could not load library cache:',e); }
}
function songShape(s){ return { id:s.id,path:s.path,title:s.title||path.basename(s.path,'.mp3'),artist:s.artist||'Unknown artist',album:s.album||'Unknown album',genre:s.genre||'',duration:s.duration||0,trackNumber:s.trackNumber??null,collection:s.collection||'Music',online:!!s.online,dateAdded:s.dateAdded||now(),playCount:s.playCount||0 }; }
async function walk(root){
  const out=[]; const stack=[root];
  while(stack.length){ const dir=stack.pop(); let entries; try{entries=await fs.readdir(dir,{withFileTypes:true});}catch{continue;}
    for(const ent of entries){ const full=path.join(dir,ent.name); if(ent.isDirectory()){stack.push(full);} else if(ent.isFile() && ent.name.toLowerCase().endsWith('.mp3')) out.push(full); }
  }
  return out;
}
async function metadata(file){
  const mm=await import('music-metadata'); const m=await mm.parseFile(file,{duration:true,skipCovers:false});
  const c=m.common||{}; const pic=c.picture?.[0];
  return {title:c.title||path.basename(file,path.extname(file)),artist:c.artist||c.artists?.join(', ')||'Unknown artist',album:c.album||'Unknown album',genre:Array.isArray(c.genre)?c.genre.join(', '):(c.genre||''),duration:m.format?.duration||0,trackNumber:c.track?.no??null,artwork:pic?`data:${pic.format||'image/jpeg'};base64,${pic.data.toString('base64')}`:null};
}
async function scan(){
  const root=db.settings.library_root;
  if(!root) throw new Error('Choose a music folder in Settings first.');
  const stat=await fs.stat(root).catch(()=>null); if(!stat?.isDirectory()) throw new Error(`Music folder is unavailable: ${root}`);
  const files=await walk(root); let updated=0;
  const oldByPath=new Map(db.songs.map(s=>[path.resolve(s.path).toLowerCase(),s]));
  const seen=new Set(); const mm=await import('music-metadata');
  for(let i=0;i<files.length;i++){
    const file=files[i], key=path.resolve(file).toLowerCase(); seen.add(key); const old=oldByPath.get(key);
    let st; try{st=await fs.stat(file);}catch{continue;}
    const fingerprint=`${st.size}:${Math.floor(st.mtimeMs)}`;
    if(old && old.fingerprint===fingerprint){old.online=true;continue;}
    try{
      const m=await mm.parseFile(file,{duration:true,skipCovers:false}); const c=m.common||{}; const pic=c.picture?.[0];
      const rel=path.relative(root,file); const parts=rel.split(path.sep); const collection=parts.length>1?parts[0]:path.basename(root);
      const info={title:c.title||path.basename(file,path.extname(file)),artist:c.artist||c.artists?.join(', ')||'Unknown artist',album:c.album||'Unknown album',genre:Array.isArray(c.genre)?c.genre.join(', '):(c.genre||''),duration:m.format?.duration||0,trackNumber:c.track?.no??null,artwork:null};
      let song=old;
      if(!song){song={id:db.nextSongId++,path:file,dateAdded:now(),playCount:0};db.songs.push(song);} else updated++;
      if(pic){ song.artworkPath = await saveArtwork(song.id, pic); }
      else { song.artworkPath = null; }
      Object.assign(song,info,{path:file,collection,online:true,fingerprint,mtime:st.mtimeMs,size:st.size});
      if(!db.playlists.some(p=>p.kind==='folder'&&p.name===collection)){db.playlists.push({id:db.nextPlaylistId++,name:collection,kind:'folder',count:0});}
    }catch(e){ if(old)old.online=true; else { const rel=path.relative(root,file); const parts=rel.split(path.sep); db.songs.push({id:db.nextSongId++,path:file,title:path.basename(file,path.extname(file)),artist:'Unknown artist',album:'Unknown album',genre:'',duration:0,trackNumber:null,collection:parts.length>1?parts[0]:path.basename(root),online:true,dateAdded:now(),playCount:0,fingerprint}); } }
  }
  for(const s of db.songs) if(path.resolve(s.path).toLowerCase().startsWith(path.resolve(root).toLowerCase()) && !seen.has(path.resolve(s.path).toLowerCase())) s.online=false;
  for(const p of db.playlists.filter(p=>p.kind==='folder')) p.count=db.songs.filter(s=>s.collection===p.name).length;
  db.playlists=db.playlists.filter(p=>p.kind!=='folder'||p.count>0);
  await persist(); return {found:files.length,updated,unavailable:db.songs.filter(s=>!s.online).length};
}
function playlistSongs(id){const ids=db.playlistTracks[String(id)]||[];return ids.map(id=>db.songs.find(s=>s.id===id)).filter(Boolean).map(songShape);}
function register(name,fn){ipcMain.handle(`phoenix:${name}`,async(_e,...args)=>fn(...args));}
register('settings',()=>db.settings);
register('setSetting',async(key,value)=>{db.settings[key]=value;await persist();});
register('setRoot',async(root)=>{db.settings.library_root=root;await persist();});
register('songs',()=>db.songs.map(songShape).sort((a,b)=>a.title.localeCompare(b.title)));
register('search',q=>db.songs.filter(s=>[s.title,s.artist,s.album,s.genre,s.collection].some(v=>String(v||'').toLowerCase().includes(String(q||'').trim().toLowerCase()))).sort((a,b)=>a.title.localeCompare(b.title)).slice(0,250).map(songShape));
register('scan',scan);
register('playlists',()=>db.playlists.map(p=>({...p,count:p.kind==='folder'?db.songs.filter(s=>s.collection===p.name).length:(db.playlistTracks[String(p.id)]||[]).length})));
register('createPlaylist',async name=>{name=String(name||'').trim();if(!name)throw new Error('Playlist name cannot be empty.');if(db.playlists.some(p=>p.kind==='custom'&&p.name.toLowerCase()===name.toLowerCase()))throw new Error('A playlist with that name already exists.');const id=db.nextPlaylistId++;db.playlists.push({id,name,kind:'custom',count:0});db.playlistTracks[String(id)]=[];await persist();return id;});
register('deletePlaylist',async id=>{db.playlists=db.playlists.filter(p=>!(p.id===id&&p.kind==='custom'));delete db.playlistTracks[String(id)];await persist();});
register('playlistSongs',id=>playlistSongs(id));
register('addToPlaylist',async(id,ids)=>{const p=db.playlists.find(p=>p.id===id&&p.kind==='custom');if(!p)throw new Error('Custom playlist not found.');const list=db.playlistTracks[String(id)]||[];for(const sid of ids)if(db.songs.some(s=>s.id===sid)&&!list.includes(sid))list.push(sid);db.playlistTracks[String(id)]=list;p.count=list.length;await persist();});
register('toggleFavorite',async id=>{const set=new Set(db.favorites);if(set.has(id))set.delete(id);else set.add(id);db.favorites=[...set];await persist();return set.has(id);});
register('favorites',()=>db.songs.filter(s=>db.favorites.includes(s.id)).map(songShape));
register('artwork',async id=>{
  const song = db.songs.find(s=>s.id===id);
  if(!song) return null;
  if(song.artworkPath){
    try{
      const data = await fs.readFile(song.artworkPath);
      const ext = path.extname(song.artworkPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${data.toString('base64')}`;
    }catch{}
  }
  return song.artwork || null;
});
register('markPlayed',async id=>{const s=db.songs.find(s=>s.id===id);if(s)s.playCount=(s.playCount||0)+1;await persist();});
register('chooseFolder',async()=>{const result=await dialog.showOpenDialog(win,{properties:['openDirectory']});return result.canceled?null:result.filePaths[0];});
register('fileUrl',p=>pathToFileURL(p).href);
function createWindow(){win=new BrowserWindow({width:1440,height:900,minWidth:900,minHeight:620,backgroundColor:'#101014',webPreferences:{preload:path.join(__dirname,'electron-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});win.loadFile(path.join(__dirname,'dist','index.html'));}
app.whenReady().then(async()=>{await load();createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
