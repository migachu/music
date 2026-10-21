export type Song = { id:number; path:string; title:string; artist:string; album:string; genre:string; duration:number; trackNumber:number|null; collection:string; online:boolean; dateAdded:number; playCount:number };
export type Playlist = { id:number; name:string; kind:'folder'|'custom'; count:number };
declare global { interface Window { phoenix: any } }
const bridge = () => { if(!window.phoenix) throw new Error('Phoenix Music desktop runtime is not available. Launch the packaged Windows app.'); return window.phoenix; };
let audio: HTMLAudioElement | null = null;
let currentSongId: number | null = null;
let knownSongs: Song[] = [];
function player(){ if(!audio){ audio=new Audio(); audio.preload='auto'; audio.addEventListener('ended',()=>{currentSongId=null;}); } return audio; }
export const api = {
  isTauri: () => !!window.phoenix,
  settings: () => bridge().settings() as Promise<Record<string,string>>,
  chooseFolder: () => bridge().chooseFolder() as Promise<string|null>,
  setRoot: (path:string) => bridge().setRoot(path) as Promise<void>,
  setSetting: (key:string,value:string) => bridge().setSetting(key,value) as Promise<void>,
  scan: () => bridge().scan() as Promise<{found:number;updated:number;unavailable:number}>,
  songs: async () => { const s=await bridge().songs() as Song[]; knownSongs=s; return s; },
  search: (query:string) => bridge().search(query) as Promise<Song[]>,
  playlists: () => bridge().playlists() as Promise<Playlist[]>,
  createPlaylist: (name:string) => bridge().createPlaylist(name) as Promise<number>,
  deletePlaylist: (id:number) => bridge().deletePlaylist(id) as Promise<void>,
  playlistSongs: (playlistId:number) => bridge().playlistSongs(playlistId) as Promise<Song[]>,
  addToPlaylist: (playlistId:number,songIds:number[]) => bridge().addToPlaylist(playlistId,songIds) as Promise<void>,
  toggleFavorite: (songId:number) => bridge().toggleFavorite(songId) as Promise<boolean>,
  favorites: () => bridge().favorites() as Promise<Song[]>,
  play: async (songId:number) => { const s=knownSongs.find(x=>x.id===songId) || (await bridge().songs() as Song[]).find((x:Song)=>x.id===songId); if(!s) throw new Error('Track was not found in the library.'); if(!s.online)throw new Error('This track is unavailable. Reconnect the music share and rescan.'); const a=player(); a.src=await bridge().fileUrl(s.path); currentSongId=songId; await a.play(); await bridge().markPlayed(songId); },
  action: async (action:string) => { const a=player(); if(action==='pause'||(action==='toggle'&&!a.paused))a.pause(); else if(action==='resume'||action==='play'||action==='toggle')await a.play(); else if(action==='stop'){a.pause();a.currentTime=0;} },
  volume: async (volume:number) => { player().volume=Math.max(0,Math.min(1,volume)); },
  seek: async (seconds:number) => { const a=player(); if(Number.isFinite(a.duration))a.currentTime=Math.max(0,Math.min(a.duration,seconds)); },
  status: async () => { const a=player(); if(a.ended)currentSongId=null; return {songId:currentSongId,paused:a.paused,empty:!a.src,position:Number.isFinite(a.currentTime)?a.currentTime:0}; },
  artwork: (songId:number) => bridge().artwork(songId) as Promise<string|null>,
};
