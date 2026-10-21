const { contextBridge, ipcRenderer } = require('electron');
const call = (name, ...args) => ipcRenderer.invoke(`phoenix:${name}`, ...args);
contextBridge.exposeInMainWorld('phoenix', {
  settings:()=>call('settings'), setRoot:p=>call('setRoot',p), setSetting:(k,v)=>call('setSetting',k,v),
  songs:()=>call('songs'), search:q=>call('search',q), scan:()=>call('scan'), playlists:()=>call('playlists'),
  createPlaylist:n=>call('createPlaylist',n), deletePlaylist:id=>call('deletePlaylist',id), playlistSongs:id=>call('playlistSongs',id),
  addToPlaylist:(id,ids)=>call('addToPlaylist',id,ids), toggleFavorite:id=>call('toggleFavorite',id), favorites:()=>call('favorites'), artwork:id=>call('artwork',id),
  markPlayed:id=>call('markPlayed',id), chooseFolder:()=>call('chooseFolder'), fileUrl:p=>call('fileUrl',p)
});
