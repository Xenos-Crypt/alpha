// Owner-managed house adverts. Google inventory stays disabled until configured.
export const ADVERTISING_CONFIG={
 contactEmail:'helpcenter@anotherworld.world',
 google:{enabled:false,videoAdTagUrl:null},
 programmes:[{id:'online-demo',title:'Online sample programme',url:'https://storage.googleapis.com/gvabox/media/samples/stock.mp4',credit:'Google IMA HTML5 sample video',creditUrl:'https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/get-started'}],
 campaigns:[
 {id:'explore',title:'ANOTHER WORLD',message:'Discover the cities. Find your story.',background:'#123b51',accent:'#8ee7d0',label:'House advert'},
 {id:'school',title:'ASHFORD SCHOOL',message:'Learn. Explore. Grow your skills.',background:'#244e68',accent:'#a9d8ff',label:'House advert'},
 {id:'travel',title:'YOUR NEXT ADVENTURE',message:'Ride the metro. Discover the islands.',background:'#204d3f',accent:'#d7ec9f',label:'House advert'},
 {id:'space',title:'ASHFORD SPACE CENTRE',message:'Your journey beyond Earth starts here.',background:'#292148',accent:'#d0b6ff',label:'House advert'},
 {id:'advertise',title:'ADVERTISE WITH US',message:'Customer service on your TV remote.',background:'#493322',accent:'#ffd18c',label:'Advertising space'}
 ]
};
export function advertisingContactUrl(config=ADVERTISING_CONFIG){return 'mailto:'+config.contactEmail+'?subject='+encodeURIComponent('Advertising enquiry for Another World')+'&body='+encodeURIComponent('Business name:\nWebsite:\nAdvert type (TV / balloons / electronic boards):\nPreferred cities:\nCampaign dates:\nBudget:\nMessage:\n');}
