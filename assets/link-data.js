"use strict";

const trollnormisAvatar = {
  imageLayout: "avatar",
  image: "assets/media/previews/trollnormis-avatar.jpg",
  video: "assets/media/previews/trollnormis-avatar.mp4",
  animatedImage: "assets/media/previews/trollnormis-avatar.webp"
};

const archivenormisAvatar = {
  imageLayout: "avatar",
  image: "assets/media/previews/archivenormis-avatar.jpg",
  video: "assets/media/previews/archivenormis-avatar.mp4",
  animatedImage: "assets/media/previews/archivenormis-avatar.webp"
};

const aginormisAvatar = {
  imageLayout: "avatar",
  image: "assets/media/previews/aginormis-avatar.jpg",
  video: "assets/media/previews/aginormis-avatar.mp4",
  animatedImage: "assets/media/previews/aginormis-avatar.webp"
};

const slopnormisAvatar = {
  imageLayout: "avatar",
  image: "assets/media/previews/slopnormis-avatar.jpg",
  video: "assets/media/previews/slopnormis-avatar.mp4",
  animatedImage: "assets/media/previews/slopnormis-avatar.webp"
};

const spamnormisCard = {
  title: "spamnormis",
  meta: "«Telegram»",
  description: "Бесконечный поток ссылок и находок.",
  imageLayout: "avatar",
  image: "assets/link-thumbnails/25ca361f4746.jpg",
  video: "assets/media/previews/spamnormis-avatar.mp4",
  animatedImage: "assets/media/previews/spamnormis-avatar.webp"
};

// Link previews from the interview, Telegram publications, Open Graph and oEmbed.
const linkCards = {
  "https://t.me/addlist/gx2YCKe_ynxkODJi": {
    "title": "папка normis",
    "meta": "Папка в «Telegram»",
    "description": "Каналы и группы Тойоты.",
    "imageLayout": "square",
    "image": "assets/media/previews/normis-folder-avatar.jpg",
    "video": "assets/media/previews/normis-folder-avatar.mp4",
    "animatedImage": "assets/media/previews/normis-folder-avatar.webp"
  },
  "https://t.me/hypernormis": {
    "title": "hypernormis",
    "meta": "«Telegram»",
    "description": "Основной канал. Саунддизайн и экспериментальная музыка с разделами по жанрам.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/hypernormis-avatar.jpg"
  },
  "https://t.me/spamnormis": spamnormisCard,
  "http://t.me/spamnormis": spamnormisCard,
  "https://t.me/subnormis": {
    "title": "subnormis",
    "meta": "«Telegram»",
    "description": "Находки из мира дизайна и экспериментальной электроники.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/subnormis-avatar.jpg",
    "video": "assets/media/previews/subnormis-avatar.mp4",
    "animatedImage": "assets/media/previews/subnormis-avatar.webp"
  },
  "https://t.me/slopnormis": {
    "title": "slopnormis",
    "meta": "«Telegram»",
    "description": "Новости о новых моделях ИИ и материалы об акселерационизме.",
    ...slopnormisAvatar
  },
  "https://t.me/aginormis": {
    "title": "aginormis",
    "meta": "«Telegram»",
    "description": "Хайлайты из мира ИИ. Видеоклипы музыкантов, реклама и кино с использованием ИИ.",
    ...aginormisAvatar
  },
  "https://t.me/aginormis/1363": {
    "title": "новая волна ИИшников",
    "displayUrl": "t.me/aginormis",
    "meta": "aginormis · 20 окт. 2026 г.",
    "description": "Заметка о визуальном тренде и подборка роликов из разных каналов.",
    "image": "assets/media/previews/post-aginormis-1363.jpg?v=2",
    "video": "assets/media/previews/post-aginormis-1363.mp4?v=2"
  },
  "https://t.me/archivenormis": {
    "title": "archivenormis",
    "meta": "«Telegram»",
    "description": "Архив от кино до репостов комментариев из музыкальных каналов.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/archivenormis-channel-avatar.jpg",
    "video": "assets/media/previews/archivenormis-channel-avatar.mp4",
    "animatedImage": "assets/media/previews/archivenormis-channel-avatar.webp"
  },
  "https://t.me/archivenormis/5429/12636": {
    "title": "Arca live",
    "displayUrl": "t.me/archivenormis",
    "meta": "Сын Люцифера · 24 июл. 2026 г.",
    "description": "Сходство костюма Arca и FITNESSS",
    "image": "assets/media/previews/post-archivenormis-12636.jpg"
  },
  "https://t.me/archivenormis/3766/12512": {
    "title": "Max Headroom",
    "displayUrl": "t.me/archivenormis",
    "meta": "archivenormis · 17 июл. 2026 г.",
    "description": "Мнение по поводу известного в определённых кругах культуролога.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/headroom-inc-avatar.jpg"
  },
  "https://t.me/archivenormis/3657": {
    "title": "Zapret",
    "displayUrl": "t.me/archivenormis",
    "meta": "Тема в «Telegram»",
    "description": "Раздел, посвящённый запретам, в группе archivenormis.",
    ...archivenormisAvatar
  },
  "https://t.me/bad_zu/1466": {
    "title": "Bad Zu",
    "displayUrl": "t.me/bad_zu",
    "meta": "Публикация · 27 окт. 2026 г.",
    "description": "Лекция Филиппа Александрова о восприятии звука и его роли в медиа.",
    "image": "assets/media/previews/post-bad-zu-1466.jpg",
    "imageLayout": "square-fill-trim"
  },
  "https://t.me/trollnormis": {
    "title": "trollnormis",
    "meta": "«Telegram»",
    "description": "Скандалы, интриги и расследования. Подборки о музыкальных журналистах по хештегам.",
    ...trollnormisAvatar
  },
  "https://t.me/hatenormis": {
    "title": "hatenormis",
    "meta": "«Telegram»",
    "description": "Борьба с неолуддитами, запрещенка и всякий хлам",
    "imageLayout": "avatar",
    "image": "assets/media/previews/hatenormis-avatar.jpg",
    "video": "assets/media/previews/hatenormis-avatar.mp4",
    "animatedImage": "assets/media/previews/hatenormis-avatar.webp"
  },
  "https://t.me/privatenormis": {
    "title": "privatenormis",
    "meta": "«Telegram»",
    "description": "заметки про ИИ",
    "imageLayout": "avatar",
    "image": "assets/media/previews/privatenormis-avatar.jpg",
    "video": "assets/media/previews/privatenormis-avatar.mp4",
    "animatedImage": "assets/media/previews/privatenormis-avatar.webp"
  },
  "https://t.me/stocknormis": {
    "title": "stocknormis",
    "meta": "«Telegram»",
    "description": "Тесты нейросетей и материалы для ссылок из основных каналов.",
    "imageLayout": "avatar",
    "image": "assets/media/previews/stocknormis-avatar.jpg"
  },
  "https://fict.info/": {
    "title": "First International Church of Toyota",
    "meta": "fict.info",
    "description": "Los Angeles. Las Vegas. Tokyo.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/fict-info.png?v=2"
  },
  "https://t.me/thequietplace/8490": {
    "title": "Анна Виленская о тембральном слухе",
    "displayUrl": "t.me/thequietplace",
    "meta": "Тихое Место · 3 мар. 2024 г.",
    "description": "Фрагмент интервью о том, чем тембральный слух отличается от гармонического.",
    "imageLayout": "square",
    "image": "assets/media/previews/post-thequietplace-8490.jpg"
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
    "imageLayout": "stretch",
    "image": "assets/link-thumbnails/hijinx-ccru-graph.jpg"
  },
  "https://t.me/slopnormis/942/3538": {
    "title": "MyHooD_Recordzz",
    "displayUrl": "t.me/slopnormis",
    "meta": "slopnormis · 19 окт. 2026 г.",
    "description": "Реплика о конкурсе с призовым фондом 220 USDT.",
    "imageLayout": "portrait",
    "image": "assets/media/previews/post-slopnormis-3538.jpg",
    "video": "assets/media/previews/post-slopnormis-3538.mp4"
  },
  "https://t.me/slopnormis/942/3578": {
    "title": "М О Р И А Р Т И",
    "displayUrl": "t.me/slopnormis",
    "meta": "slopnormis · 28 окт. 2026 г.",
    "description": "Реакция на ИИ-контент канала Мориарти.",
    "image": "assets/media/previews/post-slopnormis-3578.jpg"
  },
  "https://t.me/slopnormis/2737/3590": {
    "title": "Nick Land",
    "displayUrl": "t.me/slop",
    "meta": "slopnormis · 2 нояб. 2026 г.",
    "description": "Запись разговора с Ником Ландом об искусственном интеллекте.",
    ...slopnormisAvatar
  },
  "https://t.me/slopnormis/2737/3642": {
    "title": "Palantir",
    "displayUrl": "t.me/slop",
    "meta": "slopnormis · 16 нояб. 2026 г.",
    "description": "Разговор о будущем ИИ и о Хайдеггере.",
    ...slopnormisAvatar
  },
  "https://t.me/hypernormis/3/4413": {
    "title": "Интервью 011668",
    "displayUrl": "t.me/hypernormis",
    "meta": "antinormis 🚷 · 1 авг. 2025 г.",
    "description": "Интервью для notesfromcake и sabukaru. Грязь динозавров и ключи от Тойоты.",
    "image": "assets/media/previews/post-hypernormis-4413.jpg"
  },
  "https://www.instagram.com/0ll668/": {
    "title": "@0ll668",
    "meta": "Instagram",
    "image": "assets/media/previews/011668-instagram-avatar.jpg"
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
  "https://t.me/trollnormis/4134": {
    "title": "Виленская",
    "displayUrl": "t.me/trollnormis",
    "meta": "trollnormis · 1 сент. 2026 г.",
    "description": "Ироничная подборка ссылок на интервью и материалы об Анне Виленской.",
    ...trollnormisAvatar
  },
  "https://t.me/trollnormis/140": {
    "title": "Многоножка",
    "displayUrl": "t.me/trollnormis",
    "meta": "Сын Люцифера · 13 янв. 2025 г.",
    "description": "подборка различных старых комментов",
    "image": "assets/media/previews/post-trollnormis-140.png"
  },
  "https://t.me/trollnormis/4142": {
    "title": "SCP",
    "displayUrl": "t.me/trollnormis",
    "meta": "Публикация в «Telegram»",
    "description": "we secure. we contain. we protect.",
    ...trollnormisAvatar
  },
  "https://t.me/trollnormis/4041": {
    "title": "Seedance Редькин",
    "displayUrl": "t.me/trollnormis",
    "meta": "trollnormis · 7 июня 2026 г.",
    "description": "когда дали бесплатные кредиты в Seedance 2",
    "imageLayout": "square",
    "image": "assets/media/previews/post-trollnormis-4041.jpg",
    "video": "assets/media/previews/post-trollnormis-4041.mp4"
  },
  "https://t.me/archivenormis/5429/14801": {
    "title": "Савенко про клип Сира Сойлока",
    "displayUrl": "t.me/archivenormis",
    "meta": "а можно потанцевальней? · 28 окт. 2026 г.",
    "description": "Пост о новом клипе и недавней EP артиста. Видео · 0:25",
    "imageLayout": "square-fill",
    "image": "assets/media/previews/post-archivenormis-14801.jpg",
    "video": "assets/media/previews/post-archivenormis-14801.mp4"
  },
  "https://t.me/archivenormis/5429/14918": {
    "title": "нишевый Редькин",
    "displayUrl": "t.me/archivenormis",
    "meta": "archivenormis · 6 нояб. 2026 г.",
    "description": "Видео в ответ на реплику «нишевый» · 0:20",
    "image": "assets/media/previews/post-archivenormis-14918.jpg",
    "video": "assets/media/previews/post-archivenormis-14918.mp4"
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
  "http://t.me/salibium/2251?comment=3326": {
    "title": "Комментарий к публикации salibi",
    "meta": "«Telegram»",
    "imageLayout": "avatar",
    "image": "assets/media/previews/salibium-avatar.jpg"
  },
  "http://t.me/ushko2000/3386?comment=19246": {
    "title": "Сравнение трека с Suno по громкости",
    "meta": "Комментарий в «Telegram»",
    "image": "assets/media/previews/ushko-suno-comparison-cover.webp"
  },
  "http://t.me/dailyslime": {
    "title": "Daily Slime",
    "imageLayout": "avatar",
    "image": "assets/media/previews/dailyslime-avatar.jpg"
  },
  "https://www.instagram.com/flt.n3sss/": {
    "title": "FITNESSS",
    "imageLayout": "avatar",
    "image": "assets/media/previews/fitnesss-instagram-avatar.jpg"
  },
  "https://www.instagram.com/oscarcarreteero/": {
    "title": "Óscar Carretero",
    "description": "автор костюма",
    "image": "assets/media/previews/oscar-carretero-helmet.webp"
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
    "imageLayout": "natural",
    "image": "assets/link-thumbnails/iizm-social-preview-v5.jpg"
  },
  "https://higgsfield.ai/creator-partnership-program": {
    "title": "Creator Partnership Program",
    "description": "Ежемесячные кредиты, ранний доступ к моделям, закрытое сообщество и прямая связь с командой Higgsfield.",
    "image": "assets/link-thumbnails/higgsfield-logo.webp"
  },
  "https://www.instagram.com/p/Dbt67C-MlM0/": {
    "title": "salibi",
    "image": "assets/media/previews/salibi-dbt67c-instagram.jpg?v=2"
  },
  "https://panayiotiskokoras.com/writings/": {
    "title": "Writings",
    "image": "assets/link-thumbnails/panayiotis-kokoras.png"
  },
  "https://t.me/archivenormis/978/3147": {
    "title": "спор с подписчиком",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 19 нояб. 2025 г.",
    "description": "спор с подписчиком конада",
    ...archivenormisAvatar
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
    "description": "Запись на стене бывшего паблика «Hard Dubstep».",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/hard-dubstep-legion.png?v=2"
  },
  "https://vk.ru/thebassland": {
    "title": "BASSLAND",
    "meta": "ВКонтакте · Сообщество",
    "description": "Новости и релизы дабстепа, драм-н-бейса, бэйс-хауса и трэпа.",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/bassland-vk.jpg"
  },
  "https://vk.ru/zerojke": {
    "title": "Денис Жданов",
    "meta": "ВКонтакте · Профиль",
    "displayUrl": "vk.ru/zerojke",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/denis-zhdanov.jpg"
  },
  "https://vk.ru/garudclub": {
    "title": "Гнездо Гаруда",
    "meta": "ВКонтакте · Сообщество",
    "description": "Я - Гаруд. Добро пожаловать в мое «Гнездо».",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/garuda-vk.jpg"
  },
  "https://owsla.com/release/teddy-killerz-teddy-massacre/": {
    "title": "Teddy Killerz — Teddy Massacre",
    "meta": "OWSLA · 12 нояб. 2013 г.",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/owsla-logo.png"
  },
  "https://www.youtube.com/watch?v=Iy6pJsx--tI": {
    "title": "Gypsyhook",
    "meta": "YouTube",
    "description": "Мини-альбом Sonny Moore целиком.",
    "image": "assets/link-thumbnails/sonny-gypsyhook.jpg",
    "imageLayout": "square-fill-right"
  },
  "https://youtu.be/8sgu7yz73yU?si=r7nY01W7yejDMgi7&t=4374": {
    "title": "ИЗОБРЕТАЕМ НОВЫЕ НОТЫ. Пушной, Семихатов и Сурдин",
    "meta": "YouTube · Вселенная Плюс · 1:12:54",
    "description": "ссылка на отрывок из выпуска",
    "image": "assets/link-thumbnails/izobretaem-novye-noty.jpg",
    "imageLayout": "square-fill"
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
  "https://t.me/hypernormis/1/4749": {
    "title": "Новая EP 4LL",
    "displayUrl": "t.me/hypernormis",
    "meta": "antinormis 🚷 · 13 дек. 2025 г.",
    "description": "Видео из поста о релизе · 0:26",
    "image": "assets/media/previews/post-hypernormis-4749.jpg",
    "video": "assets/media/previews/post-hypernormis-4749.mp4"
  },
  "https://bluenoise1.bandcamp.com/album/organa": {
    "title": "Blue Noise - Organa LP",
    "description": "11 track album",
    "image": "assets/link-thumbnails/3aafd089c93c.jpg"
  },
  "https://t.me/egrooves": {
    "title": "ethereal grooves",
    "description": "Музыкальный блог и серия миксов VK: vk.com/etherealgrooves SoundCloud: https://soundcloud.com/etherealgroovesofficial eternal love",
    "imageLayout": "avatar",
    "image": "assets/link-thumbnails/4b3bf2ddefff.jpg"
  },
  "https://t.me/egrooves/10103": {
    "title": "Антон Савенко — ethereal selection",
    "displayUrl": "t.me/egrooves",
    "meta": "ethereal grooves · 13 сент. 2025 г.",
    "description": "Плейлист Антона Савенко с любимой классикой и новым треком Iglooghost.",
    "imageLayout": "square",
    "image": "assets/media/previews/post-egrooves-10103.jpg"
  },
  "https://t.me/egrooves/10648": {
    "title": "Daily Slime — ethereal selection",
    "displayUrl": "t.me/egrooves",
    "meta": "ethereal grooves · 25 окт. 2025 г.",
    "description": "Мультижанровый плейлист, который Виталя Daily Slime собрал для ethereal selection.",
    "imageLayout": "square",
    "image": "assets/media/previews/post-egrooves-10648.jpg"
  },
  "assets/media/raiika-vs-slava-marlow.pdf": {
    "title": "Научная формализация «продвинутости» музыки",
    "meta": "PDF · 6 страниц",
    "description": "Сравнение музыки Raiika, Slava Marlow и Max Martin по тембру, ритму и форме.",
    "image": "assets/link-thumbnails/raiika-vs-slava-marlow.png",
    "imageLayout": "page"
  },
  "https://www.youtube.com/watch?v=bBsShBdDuxk": {
    "title": "Дора | ASMR",
    "meta": "YouTube · goshakartsev",
    "image": "assets/link-thumbnails/dora-asmr.jpg",
    "imageLayout": "square-fill-right"
  },
  "https://www.youtube.com/watch?v=d9t0eXNnT1c": {
    "title": "Vitman The Prince - Цветы",
    "description": "Vitman The Prince",
    "image": "assets/link-thumbnails/5e1b27ae3eda.jpg",
    "imageLayout": "square-fill"
  },
  "https://www.youtube.com/watch?v=9eQUtOQXYgQ": {
    "title": "STARCRAFT | Announce Cinematic | Dominion",
    "description": "StarCraft",
    "imageLayout": "square-fill-left",
    "image": "assets/link-thumbnails/7d23eef4334d.jpg"
  },
  "https://t.me/archivenormis/5429/14893": {
    "title": "Редькин vs Gundam",
    "displayUrl": "t.me/archivenormis",
    "meta": "Публикация · 4 нояб. 2026 г.",
    "description": "Видео · 0:21",
    "image": "assets/media/previews/post-archivenormis-14893.jpg",
    "video": "assets/media/previews/post-archivenormis-14893.mp4"
  },
  "https://www.youtube.com/watch?v=uBeD_bZPYPU": {
    "title": "Hot Pursuit - 50 Caliber",
    "description": "NeurofunkGrid",
    "imageLayout": "square-fill",
    "image": "assets/link-thumbnails/b3b5eebcd4dc.jpg"
  },
  "https://iamnhuman.github.io/fakeboys/": {
    "title": "Калькулятор нормиса",
    "description": "Ты слышишь ноты. Но слышишь ли спектр? Проверь себя: 8 вопросов, психофизика слуха и манифест андерграунда.",
    "imageLayout": "left",
    "image": "assets/link-thumbnails/84eed4934ad9.jpg"
  },
  "https://t.me/dailyslime/15038": {
    "title": "Платина — новый Пелевин",
    "displayUrl": "t.me/dailyslime",
    "meta": "Daily Slime · 18 апр. 2025 г.",
    "description": "Автор сравнивает эстетику Платины с Пелевиным и противопоставляет её альбому I AM MUSIC.",
    "imageLayout": "square",
    "image": "assets/media/previews/post-dailyslime-15038.jpg"
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
    "imageLayout": "square-fill",
    "image": "assets/link-thumbnails/4d8c409668cd.jpg"
  },
  "https://aesthetics.fandom.com/wiki/Necrotrap": {
    "title": "Necrotrap",
    "meta": "Aesthetics Wiki",
    "imageLayout": "square",
    "image": "assets/link-thumbnails/necrotrap-target-practice.webp"
  },
  "https://t.me/makraaaa/2587": {
    "title": "Lucy Bedroque — c",
    "displayUrl": "t.me/makraaaa",
    "meta": "MAKRA · 29 сент. 2026 г.",
    "description": "Рецензия на альбом. Оценка 6/10, из треков автор выделяет Speed demon.",
    "imageLayout": "square",
    "image": "assets/media/previews/post-makraaaa-2587.jpg"
  },
  "https://t.me/copilotbukakke/1561": {
    "title": "Zabelin про Fred Again",
    "displayUrl": "t.me/copilotbukakke",
    "meta": "Nikita Zabelin · 30 июл. 2025 г.",
    "description": "Фрэд Эген такое говно...",
    "imageLayout": "avatar",
    "image": "assets/media/previews/copilotbukakke-avatar.jpg"
  },
  "https://t.me/trap_critics/2594": {
    "title": "FORTUNA 812",
    "displayUrl": "t.me/trap_critics",
    "meta": "PRNRP · 15 июл. 2026 г.",
    "description": "Объективный топ русских рэпперов",
    "imageLayout": "avatar",
    "image": "assets/media/previews/trap-critics-avatar.jpg"
  },
  "https://t.me/mainstreamusic/15479": {
    "title": "Тёмный Принц",
    "displayUrl": "t.me/mainstreamusic",
    "meta": "Мейнстрим Мьюзик · 21 нояб. 2026 г.",
    "description": "в прошлом году победил тёмный принц если что",
    "imageLayout": "avatar",
    "image": "assets/media/previews/mainstreamusic-avatar.jpg"
  },
  "https://youtu.be/qP0fizk1zrE?si=6IkS6tQk19oAG_qy": {
    "title": "madk1d, тёмный принц, FORTUNA 812",
    "meta": "YouTube · ВПИСКА",
    "image": "assets/link-thumbnails/madk1d-vpiska.jpg"
  },
  "https://t.me/antihauntologyhauntologyclub/885": {
    "title": "anti-hauntology club",
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
    "image": "assets/media/previews/post-archivenormis-15088.jpg",
    "video": "assets/media/previews/post-archivenormis-15088.mp4"
  },
  "https://www.instagram.com/p/DehP5BAp2lU/": {
    "title": "FITNESSS — F11 x PASSAGE",
    "meta": "Instagram · 15 окт. 2026 г.",
    "description": "@lunchmeatfestivalprague · Съёмка — @machinetriste",
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
    "previewAddress": "https://www.reddit.com/r/audioengineering/comments/11wte7t/100_gecs_mastering_question",
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
    "image": "assets/media/previews/temny-prince-spotify-cover.jpg"
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
    "image": "assets/link-thumbnails/panayiotis-kokoras.png"
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
    "description": "Заглушка вместо старого паблика «bassfunk».",
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
    "title": "труп коли редькина minimix",
    "displayUrl": "t.me/trollnormis",
    "meta": "Публикация · 12 авг. 2026 г.",
    "image": "assets/media/previews/post-trollnormis-4108.jpg"
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
    "image": "assets/link-thumbnails/010a60046750.jpg",
    "imageLayout": "square-fill"
  },
  "https://www.youtube.com/watch?v=ZsSYase1hJI": {
    "title": "ZZT - Lower State of Consciousness",
    "meta": "YouTube · 2 июл. 2007 г.",
    "description": "Party Central",
    "image": "assets/link-thumbnails/f48e4b316b69.jpg",
    "imageLayout": "square-fill"
  },
  "https://www.youtube.com/watch?v=qmsbP13xu6k&list=RDEM00DUyPjxvRFDIDKBZSyQ6w&start_radio=1": {
    "title": "Mr Oizo - Flat beat",
    "description": "fcommunications",
    "image": "assets/link-thumbnails/e32522eb71db.jpg",
    "imageLayout": "square-fill"
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
    ...archivenormisAvatar
  }
};
