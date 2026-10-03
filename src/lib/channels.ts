export type Channel={
  id:string;
  channel_name:string;
  url:string;
  /** Optional authorized direct HLS/MP4 source. When present, CricketHub can use its custom player controls. */
  playbackUrl?:string;
  nowPlaying?:string;
  teams?:string[];
};

export const channels:Channel[]=[
  {id:"willow-cricket",channel_name:"Willow Cricket",url:"https://embed.st/embed/admin/admin-willow-cricket/1"},
  {id:"willow-2-cricket",channel_name:"Willow 2 Cricket",url:"https://embed.st/embed/admin/admin-willow-cricket/2"},
  {id:"willow-sports",channel_name:"Willow Sports",url:"https://embed.st/embed/admin/admin-willow-cricket/6"},
  {id:"sony-ten-1",channel_name:"SONY TEN 1",url:"https://embed.st/embed/foxtrot/india-vs-brazil/1"},
  {id:"sony-ten-2",channel_name:"SONY TEN 2",url:"https://embed.st/embed/admin/ppv-india-vs-brazil/1"},
  {id:"sony-ten-3",channel_name:"SONY TEN 3",url:"https://daddylive.app/player/embed.php?id=887"},
  {id:"star-sports-1-in",channel_name:"Star Sports 1 IN",url:"https://daddylive.app/player/embed.php?id=267"},
  {id:"star-sports-hindi-in",channel_name:"Star Sports Hindi IN",url:"https://daddylive.app/player/embed.php?id=268"},
  {id:"sky-sports-cricket",channel_name:"Sky Sports Cricket",url:"https://daddylive.app/player/embed.php?id=65"},
  {id:"sky-sports-cricket-uk",channel_name:"Sky Sports Cricket UK",url:"https://daddylive.app/player/embed.php?id=stream-65"}
];
