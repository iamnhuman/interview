"use strict";

// Public Open Graph and oEmbed metadata for the links in the interview.
const linkCards = {
  "https://t.me/wronggateway502": {
    "title": "wrong/gateway .₅₀₂",
    "description": "нᴇᴨᴩᴀʙиᴧьный (нᴇʙᴇᴩный) ɯᴧюɜ - ⫿⫿⫿⫿⫿⫿⫿⫿ дᴇйᴄᴛʙующий ᴋᴀᴋ ɯᴧюɜ иᴧи ⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿ ᴨᴏᴧучиᴧ нᴇдᴇйᴄᴛʙиᴛᴇᴧьный ᴏᴛʙᴇᴛ ᴏᴛ ʙыɯᴇᴄᴛᴏящᴇᴦᴏ ⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿. dm: @jumpk1d2ooo",
    "image": "assets/link-thumbnails/8947b94b8170.jpg"
  },
  "https://t.me/archivenormis/818/8256": {
    "title": "archivenormis",
    "image": "assets/link-thumbnails/43c6e32090ee.jpg"
  },
  "https://fict.bandcamp.com/album/toyotathon": {
    "title": "TOYOTATHON, by First International Church of Toyota",
    "description": "78 track album",
    "image": "assets/link-thumbnails/6ac81f7a9ccc.jpg"
  },
  "http://t.me/toyotamuzik": {
    "title": "тойота мьюзик",
    "description": "соц. сети: linktr.ee/toyotamuzik сотрудничество: @idontbelieveinhumanrights",
    "image": "assets/link-thumbnails/81e7412b413c.jpg"
  },
  "https://soundcloud.com/4_ll": {
    "title": "4LL",
    "image": "assets/link-thumbnails/cb0f9bba00a8.jpg"
  },
  "https://bluenoise1.bandcamp.com/album/organa": {
    "title": "ORGANA, by BLUE NOISE",
    "description": "11 track album",
    "image": "assets/link-thumbnails/3aafd089c93c.jpg"
  },
  "https://t.me/egrooves": {
    "title": "ethereal grooves",
    "description": "Музыкальный блог и серия миксов VK: vk.com/etherealgrooves Soundcloud: https://soundcloud.com/etherealgroovesofficial eternal love",
    "image": "assets/link-thumbnails/4b3bf2ddefff.jpg"
  },
  "https://t.me/nphonix_linx/6291?comment=11954": {
    "title": "Сын Люцифера in ссылочки от нфоникса - чат",
    "description": "НОУКА!",
    "image": "assets/link-thumbnails/e2d8f74c2ca0.jpg"
  },
  "https://www.youtube.com/watch?v=d9t0eXNnT1c": {
    "title": "Vitman The Prince - Цветы (Official Music Video)",
    "description": "Vitman The Prince",
    "image": "assets/link-thumbnails/5e1b27ae3eda.jpg"
  },
  "https://www.youtube.com/watch?v=9eQUtOQXYgQ": {
    "title": "STARCRAFT | Announce Cinematic | Dominion",
    "description": "StarCraft",
    "image": "assets/link-thumbnails/7d23eef4334d.jpg"
  },
  "https://www.youtube.com/watch?v=uBeD_bZPYPU": {
    "title": "Hot Pursuit - 50 Caliber [Bassfunk Recordings] FREE DOWNLOAD",
    "description": "NeurofunkGrid",
    "image": "assets/link-thumbnails/b3b5eebcd4dc.jpg"
  },
  "https://iamnhuman.github.io/fakeboys/": {
    "title": "Калькулятор нормиса — fakeboys/1 ✨",
    "description": "Ты слышишь ноты. Но слышишь ли спектр? Проверь себя: 8 вопросов, психофизика слуха и манифест андерграунда.",
    "image": "assets/link-thumbnails/84eed4934ad9.jpg"
  },
  "http://t.me/spamnormis": {
    "title": "spamnormis",
    "image": "assets/link-thumbnails/25ca361f4746.jpg"
  },
  "https://t.me/warhol/14775": {
    "title": "WARHOL",
    "description": "Квинтэссенция лоуфайной психопатии от Польи Полья сейчас, по сути, один из самых интересных артистов. Его новый альбом — это будто муджус факнулся с al90…",
    "image": "assets/link-thumbnails/dae03c33502e.jpg"
  },
  "https://bandcamp.com/asvanyviz2": {
    "title": "asvany's collection | Bandcamp",
    "description": "Hungary • Electronic • 424 collection items • 74 followers",
    "image": "assets/link-thumbnails/78751f3e6260.jpg"
  },
  "https://t.me/addlist/_ofjN5bQcMEyMTQ6": {
    "title": "Telegram Chats: normis",
    "description": "Opening this link will add chats to your Telegram app.",
    "image": "assets/link-thumbnails/4facedf8b8a5.jpg"
  },
  "https://youtu.be/2tKuE8CjON8?si=d6ex2-ieuoI0FC1c&t=2771": {
    "title": "Noisia Radio S01E26",
    "description": "Noisia",
    "image": "assets/link-thumbnails/4d8c409668cd.jpg"
  },
  "https://t.me/antihauntologyhauntologyclub/885": {
    "title": "anti-hauntology hauntology club",
    "description": "​​ворплаг — самый странный поджанр Саундклауда пока в американском ТикТоке хайпит автотюновый максималист ki, которого я хайпил:а еще прошлой зимой…",
    "image": "assets/link-thumbnails/00d3ae50eabe.jpg"
  },
  "https://soundcloud.com/beatsandbliss/017-alparr": {
    "title": "b&b 017: Alparr by Beats&Bliss",
    "description": "Beats&Bliss",
    "image": "assets/link-thumbnails/596188af4e86.jpg"
  },
  "https://t.me/privatenormis/3457?single": {
    "title": "privatenormis",
    "description": "мое любимое занятие — вставлять цитаты хейтеров в промпт и добавлять туда тойоту, органы и гиперсигилизм. Есть ощущение, что покрасу лампасу пора выходить…",
    "image": "assets/link-thumbnails/cb46ff247494.jpg"
  },
  "https://t.me/privatenormis/3639": {
    "title": "privatenormis",
    "image": "assets/link-thumbnails/0cab45d2ebd5.jpg"
  },
  "https://t.me/hypernormis/4351": {
    "title": "antinormis 🚷",
    "description": "этот¹ профессор выглядит как один из последователей luigi russolo², только делает он всё это уже на современный лад³, с целой пачкой⁴ научных статей…",
    "image": "assets/link-thumbnails/7bdef8c43e9c.jpg"
  },
  "https://t.me/trollnormis/2639": {
    "title": "trollnormis",
    "description": "создатели 2hollis тайп бит before skrillex volatile / polymorphic / gtronic / proxy / belzebass / monophonique / dj antention / huoratron / kanji kinetic…",
    "image": "assets/link-thumbnails/35f3a1c89821.jpg"
  },
  "https://open.spotify.com/track/2Vjxr1mtSvlNkuuGsbCBoA?autoplay_ok=1": {
    "title": "Teddynator",
    "image": "assets/link-thumbnails/e34dec1f2b61.jpg"
  },
  "https://t.me/hypernormis/1144": {
    "title": "antinormis 🚷",
    "image": "assets/link-thumbnails/2a8b45766988.jpg"
  },
  "https://vk.ru/necrofuturism": {
    "title": "necrofuturism"
  },
  "https://t.me/archivenormis/818/828": {
    "title": "archivenormis",
    "image": "assets/link-thumbnails/43c6e32090ee.jpg"
  },
  "https://soundcloud.com/thereisnopointinlife": {
    "title": "thereisnopointinlife",
    "image": "assets/link-thumbnails/fa32d027c90e.jpg"
  },
  "https://soundcloud.com/thereisnopointinlife/hwh8hdmmdppr": {
    "title": "​ by .",
    "image": "assets/link-thumbnails/bdc25d17674d.jpg"
  },
  "https://t.me/hypernormis/1494": {
    "title": "antinormis 🚷",
    "description": "эхх, зочем я всё это удалил в 2015, хоть это и выглядит как попытки начинающего в дизайн и саунддизайн. Ну и ещё нюанс был в том, что такие уебищные лого…",
    "image": "assets/link-thumbnails/4be29c7afca3.jpg"
  },
  "https://bassfunk.bandcamp.com/": {
    "title": "Bassfunk",
    "description": "Bassfunk. Moscow, Russia.",
    "image": "assets/link-thumbnails/a7089e1b8e67.jpg"
  },
  "https://bassfunk.bandcamp.com/track/the-beginning-3": {
    "title": "The Beginning, by Voxxin",
    "description": "from the album The Beginning EP",
    "image": "assets/link-thumbnails/cbb68fafa5e0.jpg"
  },
  "https://bassfunk.bandcamp.com/track/the-beginning-igor-graphite-remix": {
    "title": "The Beginning (Igor Graphite Remix), by Voxxin",
    "description": "from the album The Beginning EP",
    "image": "assets/link-thumbnails/cbb68fafa5e0.jpg"
  },
  "https://www.youtube.com/watch?v=Z_oxrZUtPCM": {
    "title": "Les Petits Pilous - Wake Up (Official Video)",
    "description": "Boysnoize Records",
    "image": "assets/link-thumbnails/010a60046750.jpg"
  },
  "https://www.youtube.com/watch?v=ZsSYase1hJI": {
    "title": "ZZT - Lower State of Consciousness (Original Munich Version)",
    "description": "Party Central",
    "image": "assets/link-thumbnails/f48e4b316b69.jpg"
  },
  "https://www.youtube.com/watch?v=qmsbP13xu6k&list=RDEM00DUyPjxvRFDIDKBZSyQ6w&start_radio=1": {
    "title": "Mr Oizo - Flat beat (Official Video with Flat Eric - 1999 - F Communications)",
    "description": "fcommunications",
    "image": "assets/link-thumbnails/e32522eb71db.jpg"
  },
  "https://soundcloud.com/forddnb/joe-ford-culture": {
    "title": "Joe Ford - Culture by Joe Ford",
    "description": "Joe Ford",
    "image": "assets/link-thumbnails/07a5ed0ed776.jpg"
  },
  "https://t.me/archivenormis/818/822": {
    "title": "archivenormis",
    "image": "assets/link-thumbnails/43c6e32090ee.jpg"
  }
};
