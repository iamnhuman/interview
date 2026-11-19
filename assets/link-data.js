"use strict";

const trollnormisAvatar = {
  imageLayout: "avatar",
  image: "assets/media/previews/trollnormis-avatar.jpg",
  video: "assets/media/previews/trollnormis-avatar.mp4",
  animatedImage: "assets/media/previews/trollnormis-avatar.webp"
};

// Link previews from the interview, Telegram publications, Open Graph and oEmbed.
const linkCards = {
  "https://fict.info/": {
    "title": "First International Church of Toyota",
    "meta": "fict.info",
    "description": "Los Angeles. Las Vegas. Tokyo.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/fict-info.png"
  },
  "https://t.me/thequietplace/9417": {
    "title": "S280F",
    "displayUrl": "t.me/quietplace",
    "meta": "Тихое Место · 12 нояб. 2024 г.",
    "description": "Об анонимном музыкальном проекте из Лос-Анджелеса. В посте есть ссылки на Bandcamp, YouTube и SoundCloud.",
    "image": "assets/media/previews/post-thequietplace-9417.jpg"
  },
  "https://hijinx.world/interactive/2026-ccru-graph/": {
    "title": "A Factual Account of the CCRU",
    "meta": "Hijinx World",
    "description": "Интерактивная карта истории CCRU. На ней можно проследить связи между людьми, идеями и событиями.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/hijinx-ccru-graph.jpg"
  },
  "https://t.me/slopnormis/2737/3590": {
    "title": "Nick Land",
    "displayUrl": "t.me/slop",
    "meta": "slopnormis · 2 нояб. 2026 г.",
    "description": "Запись разговора с Ником Ландом об искусственном интеллекте.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/slopnormis-avatar.jpg"
  },
  "https://t.me/slopnormis/2737/3642": {
    "title": "Palantir",
    "displayUrl": "t.me/slop",
    "meta": "slopnormis · 16 нояб. 2026 г.",
    "description": "Разговор о будущем ИИ и о Хайдеггере.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/slopnormis-avatar.jpg"
  },
  "https://t.me/hypernormis/3/4413": {
    "title": "Интервью 011668",
    "displayUrl": "t.me/hypernormis",
    "meta": "antinormis 🚷 · 1 авг. 2025 г.",
    "description": "Интервью для notesfromcake и sabukaru. Грязь динозавров и ключи от Тойоты.",
    "image": "assets/media/previews/post-hypernormis-4413.jpg"
  },
  "https://t.me/hypernormis/376/377": {
    "title": "WWWINGS",
    "displayUrl": "t.me/hypernormis",
    "meta": "antinormis 🚷 · 14 нояб. 2024 г.",
    "description": "PHOENIXXX на Bandcamp и материал VICE о WWWINGS.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/wwwings-phoenixxx.jpg"
  },
  "https://t.me/hypernormis/68/4740": {
    "title": "ZULI w/ S280F на NTS Radio",
    "meta": "antinormis 🚷 · 3 дек. 2025 г.",
    "description": "Запись эфира от 1 декабря 2025 года и архив передач NTS, в которых звучали треки S280F.",
    "imageLayout": "square",
    "image": "assets/media/previews/post-hypernormis-4740.jpg"
  },
  "https://t.me/hypernormis/68/4712": {
    "title": "radio:trauma",
    "displayUrl": "t.me/hypernormis",
    "meta": "antinormis 🚷 · 21 нояб. 2025 г.",
    "description": "Микс trngs с треками qebrus, wulffluw, John Object, Razmiel и S280F.",
    "imageLayout": "square",
    "image": "assets/media/previews/post-hypernormis-4712.jpg"
  },
  "https://vk.ru/wall-32943546_105968": {
    "title": "Tropical Interface Mix",
    "meta": "ВКонтакте · Журнал «Нож»",
    "description": "Перед выходом дебютного альбома музыкант из Eco Futurism Corporation записал для журнала эко-грайм-микс.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/tropical-interface-vk.jpg"
  },
  "https://t.me/trollnormis/4142": {
    "title": "SCP",
    "displayUrl": "t.me/trollnormis",
    "meta": "Публикация в «Telegram»",
    "description": "we secure. we contain. we protect.",
    ...trollnormisAvatar
  },
  "https://t.me/trollnormis/4041": {
    "title": "Когда дали бесплатные кредиты в Seedance 2",
    "displayUrl": "t.me/trollnormis",
    "meta": "trollnormis · 7 июня 2026 г.",
    "description": "Видео с тегом #редькин · 0:14",
    "imageLayout": "square",
    "image": "assets/media/previews/post-trollnormis-4041.jpg"
  },
  "https://t.me/archivenormis/5429/14918": {
    "title": "нишевый Редькин",
    "displayUrl": "t.me/archivenormis",
    "meta": "archivenormis · 6 нояб. 2026 г.",
    "description": "Видео в ответ на реплику «нишевый» · 0:20",
    "image": "assets/media/previews/post-archivenormis-14918.jpg"
  },
  "https://t.me/brokendance": {
    "title": "Сломанные пляски",
    "meta": "Канал в «Telegram»",
    "description": "Канал Николая Редькина о музыке.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/brokendance-avatar.jpg"
  },
  "https://t.me/bestdjchannel": {
    "title": "а можно потанцевальней?",
    "displayUrl": "t.me/bestdjchannel",
    "meta": "Канал в «Telegram»",
    "description": "Музыкальный канал Антона Савенко.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/bestdjchannel-avatar.jpg"
  },
  "https://www.instagram.com/______salibi/": {
    "title": "salibi",
    "description": "Участница 4LL",
    "imageLayout": "avatar",
    "image": "assets/media/previews/salibi-avatar.jpg"
  },
  "http://t.me/dailyslime": {
    "title": "Daily Slime",
    "imageLayout": "avatar",
    "image": "assets/media/previews/dailyslime-avatar.jpg"
  },
  "https://www.instagram.com/flt.n3sss/": {
    "title": "FITNESSS",
    "image": "assets/media/fitnesss-live.jpg"
  },
  "https://t.me/fakeboys01/22361": {
    "title": "Deescawa",
    "displayUrl": "t.me/fakeboys01",
    "meta": "Видео · 26 сент. 2026 г.",
    "description": "мам, можно аутекров? нет, у нас есть аутекры дома. аутекры дома: // Deescawa - Mixed Blessing EP",
    "image": "assets/media/previews/post-fakeboys01-22361.jpg"
  },
  "https://t.me/hypernormis/68/4720": {
    "title": "FITNESSS — S4 ENGINE",
    "displayUrl": "t.me/hypernormis",
    "meta": "Публикация · 24 нояб. 2025 г.",
    "description": "Новая версия костюма для диджеинга.",
    "image": "assets/media/previews/post-hypernormis-4720.jpg"
  },
  "https://iamnhuman.github.io/bassfunk-releases/": {
    "title": "Bassfunk Releases",
    "image": "assets/media/bassfunk-releases.jpg"
  },
  "https://iamnhuman.github.io/agi": {
    "title": "ИИзм",
    "description": "ИИзм — командный архив ИИ-сцены: досье художников и медиа, тактическая карта и видеохроника.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/iizm-social-preview-v5.jpg"
  },
  "https://higgsfield.ai/creator-partnership-program": {
    "title": "Creator Partnership Program",
    "description": "Ежемесячные кредиты, ранний доступ к моделям, закрытое сообщество и прямая связь с командой Higgsfield.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/higgsfield-creator-partnership.jpg"
  },
  "https://www.instagram.com/p/Dbt67C-MlM0/": {
    "title": "salibi",
    "image": "assets/media/video/salibi-01.jpg"
  },
  "https://panayiotiskokoras.com/writings/": {
    "title": "Writings",
    "image": "assets/media/video/kokoras-01.jpg"
  },
  "https://t.me/archivenormis/978/3147": {
    "title": "спор с подписчиком",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 19 нояб. 2025 г.",
    "description": "спор с подписчиком конада",
    "imageLayout": "avatar",
    "image": "assets/media/previews/archivenormis-avatar.jpg"
  },
  "https://t.me/vasily_konad": {
    "title": "Вася Конад",
    "meta": "Канал в «Telegram»",
    "description": "Продюсер и пиарщик.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/vasily-konad-avatar.jpg"
  },
  "http://vk.com/wall-27403455_245963": {
    "title": "Hard Dubstep",
    "meta": "ВКонтакте · Запись",
    "description": "Запись на стене сообщества «BASS † SQUAD».",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/bass-squad-vk.jpg"
  },
  "https://vk.ru/thebassland": {
    "title": "BASSLAND",
    "meta": "ВКонтакте · Сообщество",
    "description": "Новости и релизы дабстепа, драм-н-бейса, бэйс-хауса и трэпа.",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/bassland-vk.jpg"
  },
  "https://vk.ru/garudclub": {
    "title": "Гнездо Гаруда",
    "meta": "ВКонтакте · Сообщество",
    "description": "Я - Гаруд. Добро пожаловать в мое «Гнездо».",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/garuda-vk.jpg"
  },
  "https://www.youtube.com/watch?v=Iy6pJsx--tI": {
    "title": "Gypsyhook",
    "meta": "YouTube",
    "description": "Мини-альбом Sonny Moore целиком.",
    "image": "assets/link-thumbnails/sonny-gypsyhook.jpg"
  },
  "https://youtu.be/8sgu7yz73yU?si=r7nY01W7yejDMgi7&t=4374": {
    "title": "ИЗОБРЕТАЕМ НОВЫЕ НОТЫ. Пушной, Семихатов и Сурдин",
    "meta": "YouTube · Вселенная Плюс · 1:12:54",
    "image": "assets/link-thumbnails/izobretaem-novye-noty.jpg"
  },
  "https://www.youtube.com/watch?v=WSeNSzJ2-Jw": {
    "title": "Skrillex - Scary Monsters And Nice Sprites",
    "meta": "YouTube · Skrillex",
    "description": "Официальная аудиоверсия трека.",
    "image": "assets/link-thumbnails/skrillex-scary-monsters.jpg"
  },
  "https://t.me/wronggateway502": {
    "title": "wrong/gateway .₅₀₂",
    "description": "нᴇᴨᴩᴀʙиᴧьный (нᴇʙᴇᴩный) ɯᴧюɜ - ⫿⫿⫿⫿⫿⫿⫿⫿ дᴇйᴄᴛʙующий ᴋᴀᴋ ɯᴧюɜ иᴧи ⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿ ᴨᴏᴧучиᴧ нᴇдᴇйᴄᴛʙиᴛᴇᴧьный ᴏᴛʙᴇᴛ ᴏᴛ ʙыɯᴇᴄᴛᴏящᴇᴦᴏ ⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿⫿. dm: @jumpk1d2ooo",
    "image": "assets/link-thumbnails/8947b94b8170.jpg"
  },
  "https://t.me/archivenormis/818/8256": {
    "title": "list of minimixes",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 17 мар. 2026 г.",
    "image": "assets/media/previews/post-archivenormis-8256.jpg"
  },
  "https://gearspace.com/threads/how-can-burial-make-music-with-soundforge.968872/": {
    "title": "How can Burial make music with Sound Forge?",
    "meta": "Форум Gearspace",
    "description": "Обсуждение того, как Burial собирал свои треки в аудиоредакторе Sound Forge.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/gearspace.jpg"
  },
  "https://fict.bandcamp.com/album/toyotathon": {
    "title": "TOYOTATHON",
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
    "title": "Blue Noise - Organa LP",
    "description": "11 track album",
    "image": "assets/link-thumbnails/3aafd089c93c.jpg"
  },
  "https://t.me/egrooves": {
    "title": "ethereal grooves",
    "description": "Музыкальный блог и серия миксов VK: vk.com/etherealgrooves SoundCloud: https://soundcloud.com/etherealgroovesofficial eternal love",
    "image": "assets/link-thumbnails/4b3bf2ddefff.jpg"
  },
  "assets/media/raiika-vs-slava-marlow.pdf": {
    "title": "Научная формализация «продвинутости» музыки",
    "meta": "PDF · 6 страниц",
    "description": "Сравнение музыки Raiika, Slava Marlow и Max Martin по тембру, ритму и форме.",
    "image": "assets/link-thumbnails/raiika-vs-slava-marlow.png",
    "imageLayout": "page"
  },
  "https://www.youtube.com/watch?v=d9t0eXNnT1c": {
    "title": "Vitman The Prince - Цветы",
    "description": "Vitman The Prince",
    "image": "assets/link-thumbnails/5e1b27ae3eda.jpg"
  },
  "https://www.youtube.com/watch?v=9eQUtOQXYgQ": {
    "title": "STARCRAFT | Announce Cinematic | Dominion",
    "description": "StarCraft",
    "image": "assets/link-thumbnails/7d23eef4334d.jpg"
  },
  "https://t.me/archivenormis/5429/14893": {
    "title": "Редькин Seedance",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 4 нояб. 2026 г.",
    "description": "Видео · 0:21",
    "image": "assets/media/previews/post-archivenormis-14893.jpg"
  },
  "https://www.youtube.com/watch?v=uBeD_bZPYPU": {
    "title": "Hot Pursuit - 50 Caliber (Bassfunk Recordings)",
    "description": "NeurofunkGrid",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/b3b5eebcd4dc.jpg"
  },
  "https://iamnhuman.github.io/fakeboys/": {
    "title": "Калькулятор нормиса",
    "description": "Ты слышишь ноты. Но слышишь ли спектр? Проверь себя: 8 вопросов, психофизика слуха и манифест андерграунда.",
    "image": "assets/link-thumbnails/84eed4934ad9.jpg"
  },
  "http://t.me/spamnormis": {
    "title": "spamnormis",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/25ca361f4746.jpg",
    "video": "assets/media/previews/spamnormis-avatar.mp4",
    "animatedImage": "assets/media/previews/spamnormis-avatar.webp"
  },
  "https://t.me/warhol/14775": {
    "title": "Полья",
    "displayUrl": "t.me/warhol",
    "meta": "Публикация · 13 нояб. 2026 г.",
    "description": "Квинтэссенция лоуфайной психопатии от Польи Полья сейчас, по сути, один из самых интересных артистов. Его новый альбом — это будто муджус факнулся с al90 и у них родился Макс Корж. В общем, слова для «Рэмиза» ещё стоит…",
    "image": "assets/media/previews/post-warhol-14775.jpg"
  },
  "https://bandcamp.com/asvanyviz2": {
    "title": "asvany's collection",
    "description": "Hungary • Electronic • 424 collection items • 74 followers",
    "image": "assets/link-thumbnails/78751f3e6260.jpg"
  },
  "https://youtu.be/2tKuE8CjON8?si=d6ex2-ieuoI0FC1c&t=2771": {
    "title": "Noisia Radio S01E26",
    "description": "Noisia",
    "image": "assets/link-thumbnails/4d8c409668cd.jpg"
  },
  "https://aesthetics.fandom.com/wiki/Necrotrap": {
    "title": "Necrotrap",
    "meta": "Aesthetics Wiki",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/necrotrap-target-practice.webp"
  },
  "https://t.me/antihauntologyhauntologyclub/885": {
    "title": "anti-hauntology hauntology club",
    "meta": "Публикация · 9 окт. 2026 г.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/antihauntologyhauntologyclub-avatar.jpg",
    "description": "ворплаг — самый странный поджанр на SoundCloud пока в американском ТикТоке хайпит автотюновый максималист ki, которого я хайпил:а еще прошлой зимой (теперь про него есть материалы у Hyperpop Daily и Trending Raps), гики с RYM и…"
  },
  "https://soundcloud.com/beatsandbliss/017-alparr": {
    "title": "b&b 017: Alparr by Beats&Bliss",
    "description": "Beats&Bliss",
    "image": "assets/link-thumbnails/596188af4e86.jpg"
  },
  "https://t.me/trap_critics/2026?comment=87316": {
    "title": "PRNCHAT",
    "meta": "Комментарий в «Telegram» · 8 февр. 2024 г.",
    "description": "а это че-то модное щас? включил, звуки как будто ебут человека, прикованного к батарее",
    "imageLayout": "avatar",
    "image": "assets/media/previews/prnchat-avatar.jpg"
  },
  "https://t.me/archivenormis/3766/15088": {
    "title": "Порнорэп",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 15 нояб. 2026 г.",
    "description": "Видео · 0:18",
    "imageLayout": "square",
    "image": "assets/media/previews/post-archivenormis-15088.jpg"
  },
  "https://www.instagram.com/p/DehP5BAp2lU/": {
    "title": "FITNESSS — F11 x PASSAGE",
    "meta": "Instagram · 15 окт. 2026 г.",
    "description": "@lunchmeatfestivalprague · Съёмка — @machinetriste",
    "imageLayout": "square",
    "image": "assets/media/previews/fitnesss-f11-passage.jpg"
  },
  "https://t.me/privatenormis/3457?single": {
    "title": "Nano Banana",
    "displayUrl": "t.me/privatenormis",
    "meta": "Публикация · 13 февр. 2026 г.",
    "description": "мое любимое занятие — вставлять цитаты хейтеров в промпт и добавлять туда тойоту, органы и гиперсигилизм. Есть ощущение, что покрасу лампасу пора выходить из профессии t.me/normis/alparr скоро посмотрим, сможет ли midjourney…",
    "image": "assets/media/previews/post-privatenormis-3457.jpg"
  },
  "https://t.me/privatenormis/3639": {
    "title": "ElevenLabs finetune",
    "displayUrl": "t.me/privatenormis",
    "meta": "Публикация · 29 мая 2026 г.",
    "description": "различные генерации из ElevenLabs",
    "image": "assets/media/previews/post-privatenormis-3639.jpg"
  },
  "https://fict.bandcamp.com/track/toyotas-never-die-but-you-will": {
    "title": "S.A.D.E. - Toyotas Never Die, But You Will",
    "meta": "Bandcamp",
    "description": "track by S.A.D.E.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/sade-toyotas-never-die-bandcamp.jpg"
  },
  "https://www.reddit.com/r/audioengineering/comments/11wte7t/100_gecs_mastering_question/": {
    "title": "100 Gecs mastering question",
    "meta": "Reddit · r/audioengineering",
    "description": "Автор измерил громкость одного трека с CD — около −4 LUFS. Почему при этом пиковый уровень достигает +1 дБ?",
    "imageLayout": "avatar",
    "image": "assets/media/previews/reddit-audioengineering.png"
  },
  "https://t.me/archivenormis/3791/12385": {
    "title": "Темный Принц",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 10 июл. 2026 г.",
    "description": "Автору больше всего понравилось интро альбома Темного Принца. Он разбирает тексты и спорит с тем, что их называют футуристичными.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/archivenormis-avatar.jpg"
  },
  "https://open.spotify.com/track/2D94XNl9XV05mxKfG9wFst": {
    "title": "Arca - Throb",
    "meta": "«Spotify» · 31 июл. 2026 г.",
    "description": "XXXXX",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/arca-throb.jpg"
  },
  "https://t.me/hypernormis/4351": {
    "title": "Panayiotis Kokoras",
    "displayUrl": "t.me/hypernormis",
    "meta": "Публикация · 4 июл. 2025 г.",
    "description": "этот¹ профессор выглядит как один из последователей luigi russolo², только делает он всё это уже на современный лад³, с целой пачкой⁴ научных статей человек рассматривает⁵ связь musique concrète⁶ и mechatronics⁷, адаптирует⁸…",
    "image": "assets/media/previews/post-hypernormis-4351.jpg"
  },
  "https://t.me/trollnormis/2639": {
    "title": "Fidget History",
    "displayUrl": "t.me/trollnormis",
    "meta": "Публикация · 2 июн. 2025 г.",
    "description": "создатели 2hollis тайп бит before Skrillex volatile / polymorphic / gtronic / proxy / belzebass / monophonique / dj antention / huoratron / kanji kinetic / djedjotronic / ac slater / harvard bass / tai / ado / your ol' lady /…",
    ...trollnormisAvatar
  },
  "https://open.spotify.com/track/2Vjxr1mtSvlNkuuGsbCBoA?autoplay_ok=1": {
    "title": "Teddy Killerz - Teddynator",
    "meta": "«Spotify» · 22 мар. 2015 г.",
    "image": "assets/link-thumbnails/e34dec1f2b61.jpg"
  },
  "https://t.me/hypernormis/1144": {
    "title": "Старые Лого",
    "displayUrl": "t.me/hypernormis",
    "meta": "Публикация · 17 нояб. 2024 г.",
    "description": "как примерно выглядели логотипы того времени",
    "image": "assets/media/previews/post-hypernormis-1144.jpg"
  },
  "https://vk.ru/necrofuturism": {
    "title": "necrofuturism",
    "meta": "ВКонтакте · Сообщество",
    "description": "ИИ-артворки 2023 года на странице бывшего паблика «bassfunk».",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/necrofuturism-vk.jpg"
  },
  "https://t.me/archivenormis/818/828": {
    "title": "мини-миксы",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 17 нояб. 2025 г.",
    "description": "серия старых мини-миксов",
    "image": "assets/media/previews/post-archivenormis-828.jpg"
  },
  "https://soundcloud.com/thereisnopointinlife": {
    "title": "thereisnopointinlife",
    "image": "assets/link-thumbnails/fa32d027c90e.jpg"
  },
  "https://t.me/trollnormis/4108": {
    "title": "труп коли редькина",
    "displayUrl": "t.me/trollnormis",
    "meta": "Публикация · 12 авг. 2026 г.",
    ...trollnormisAvatar
  },
  "https://t.me/hypernormis/1494": {
    "title": "Старая Группа",
    "displayUrl": "t.me/hypernormis",
    "meta": "Публикация · 20 нояб. 2024 г.",
    "description": "эхх, зочем я всё это удалил в 2015, хоть это и выглядит как попытки начинающего в дизайн и саунддизайн. Ну и ещё нюанс был в том, что такие уебищные лого были у самих продюсеров. Уебищной была не только часть этих лого, но ещё…",
    "image": "assets/media/previews/post-hypernormis-1494.jpg"
  },
  "https://bassfunk.bandcamp.com/": {
    "title": "Bassfunk",
    "description": "старая страница лейбла",
    "image": "assets/link-thumbnails/a7089e1b8e67.jpg"
  },
  "https://soundcloud.com/uplinkaudio/sets/igor-graphite-revenge": {
    "title": "Igor Graphite — Revenge LP",
    "meta": "«SoundCloud»",
    "description": "Релиз на лейбле Uplink Audio.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/igor-graphite-revenge.jpg"
  },
  "https://bassfunk.bandcamp.com/track/the-beginning-3": {
    "title": "Voxxin - The Beginning",
    "description": "from the album The Beginning EP",
    "image": "assets/link-thumbnails/cbb68fafa5e0.jpg"
  },
  "https://bassfunk.bandcamp.com/track/the-beginning-igor-graphite-remix": {
    "title": "Igor Graphite Remix",
    "description": "from the album The Beginning EP",
    "image": "assets/link-thumbnails/cbb68fafa5e0.jpg"
  },
  "https://www.youtube.com/watch?v=Z_oxrZUtPCM": {
    "title": "Les Petits Pilous - Wake Up",
    "description": "Boysnoize Records",
    "image": "assets/link-thumbnails/010a60046750.jpg"
  },
  "https://www.youtube.com/watch?v=ZsSYase1hJI": {
    "title": "ZZT - Lower State of Consciousness",
    "meta": "YouTube · 2 июл. 2007 г.",
    "description": "Party Central",
    "image": "assets/link-thumbnails/f48e4b316b69.jpg"
  },
  "https://www.youtube.com/watch?v=qmsbP13xu6k&list=RDEM00DUyPjxvRFDIDKBZSyQ6w&start_radio=1": {
    "title": "Mr Oizo - Flat beat",
    "description": "fcommunications",
    "image": "assets/link-thumbnails/e32522eb71db.jpg"
  },
  "https://soundcloud.com/forddnb/joe-ford-culture": {
    "title": "Joe Ford - Culture",
    "description": "Joe Ford",
    "image": "assets/link-thumbnails/07a5ed0ed776.jpg"
  },
  "https://t.me/archivenormis/818/822": {
    "title": "Alon Mor",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 17 нояб. 2025 г.",
    "description": "старые треки Alon Mor",
    "image": "assets/media/previews/post-archivenormis-822.jpg"
  }
};
