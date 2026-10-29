// Players' language: what players see (phones, the stream window, Discord) can be in Turkish.
// The GM's own screens have their own language setting (deski18n.js). Add a language by adding a dictionary below.
const TR = {
  // phone
  "At the table": "Masada",
  "Connecting to the table…": "Masaya bağlanılıyor…",
  "Who are you?": "Sen kimsin?",
  "Pick your character": "Karakterini seç",
  "Your GM hasn't added the party yet.": "Oyun yöneticin grubu henüz eklemedi.",
  "Switch character?": "Karakter değiştirilsin mi?",
  "It's your turn!": "Sıra sende!",
  "Round {n}": "{n}. tur",
  "The party decides": "Grup karar veriyor",
  "The party decided": "Grup karar verdi",
  "Handout": "Belge",
  "Map": "Harita",
  "Party stash": "Ortak hazine",
  "Nothing on the table right now.": "Şu an masada bir şey yok.",
  "Handouts, the map, turn order and votes show up here.": "Belgeler, harita, sıra ve oylamalar burada görünür.",
  "Tap a stat to roll it on the table": "Masada atmak için bir özelliğe dokun",
  "Roll": "At",
  "No secrets yet.": "Henüz sır yok.",
  "When the GM whispers to you, it lands here, and only you see it.": "Oyun yöneticisi sana fısıldadığında burada görünür. Sadece sen görürsün.",
  "From the GM": "Oyun yöneticisinden",
  "Only you and the GM see this": "Bunu sadece sen ve oyun yöneticisi görürsünüz",
  "Goals": "Hedefler",
  "What does {name} want?": "{name} ne istiyor?",
  "Add a goal": "Hedef ekle",
  "Add": "Ekle",
  "Journal": "Günlük",
  "What happened tonight, what you suspect, who you owe…": "Bu gece ne oldu, kimden şüpheleniyorsun, kime borçlusun…",
  "Write it down": "Kaydet",
  "Delete this entry?": "Bu kayıt silinsin mi?",
  "Rolling on the table": "Masada atılıyor",
  "Table": "Masa", "Me": "Ben", "Secrets": "Sırlar",
  "{stat} has no number yet": "{stat} için henüz bir değer yok",
  // stream window
  "Round": "Tur",
  "Vote now · buttons in Discord": "Şimdi oy ver · Discord'daki düğmelerle",
  "Down": "Düştü", "Near death": "Ölmek üzere", "Bloodied": "Kanlar içinde", "Hurt": "Yaralı", "Unhurt": "Yarasız",
  "Starting now": "Başlıyor", "Back now": "Döndük",
  "Loot": "Ganimet", "Coin": "Para", "In the party's purse": "Grubun kesesinde",
  "Short break": "Kısa ara", "Grab a drink. Back soon.": "Bir şeyler için, birazdan dönüyoruz.",
  "Previously on…": "Önceki bölümde…", "Thanks for playing": "Oynadığınız için teşekkürler",
  "Next session: {when}": "Sonraki oturum: {when}", "See you next time": "Bir dahaki sefere görüşmek üzere",
  "Session {n}": "{n}. oturum", "Chapter {n}": "{n}. bölüm",
  // dice
  "Critical · natural {v}": "Kritik · doğal {v}", "Fumble · natural {v}": "Felaket · doğal {v}",
  "Success": "Başarılı", "Failure": "Başarısız", "success": "başarı", "successes": "başarı",
  // Fate ladder
  "Legendary": "Efsanevi", "Epic": "Destansı", "Fantastic": "Fantastik", "Superb": "Muhteşem", "Great": "Harika", "Good": "İyi", "Fair": "Fena değil",
  "Average": "Ortalama", "Mediocre": "Vasat", "Poor": "Zayıf", "Terrible": "Berbat", "Catastrophic": "Felaket", "Horrifying": "Korkunç",
  // Discord
  "Highlights": "Öne çıkanlar", "What happened": "Neler oldu", "Said at the table": "Masada söylenenler",
  "MVP": "Oturumun yıldızı", "Where we left off": "Kaldığımız yer", "Next session": "Sonraki oturum",
  "{h} h played": "{h} saat oynandı", "{campaign}: party stash": "{campaign}: ortak hazine", "*No loot yet.*": "*Henüz ganimet yok.*",
  "I don't know which character you play. Ask the GM to put your Discord name ({who}) on your party sheet.": "Hangi karakteri oynadığını bilmiyorum. Oyun yöneticisinden Discord adını ({who}) karakter kâğıdına yazmasını iste.",
  "{name} has no number for {stat} yet.": "{name} için {stat} değeri henüz yok.",
  "You're not in the GM's combat tracker yet. Ask the GM to add the party.": "Henüz savaş sırasında değilsin. Oyun yöneticisinden grubu eklemesini iste.",
  "Couldn't read \"{expr}\": {error}": "\"{expr}\" okunamadı: {error}",
  "Initiative set": "İnisiyatif kaydedildi", "you're #{n} of {m}": "{m} kişi içinde {n}. sıradasın",
};
const DICTS = { tr: TR };
export const LANGS = { en: "English", tr: "Türkçe" };
let lang = "en";
export function setLang(l) { lang = DICTS[l] ? l : "en"; }
export const getLang = () => lang;
// t("Round {n}", { n: 3 }) → "3. tur" in Turkish, "Round 3" in English
export function t(s, vars, l = lang) {
  let out = (DICTS[l] && DICTS[l][s] != null) ? DICTS[l][s] : s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
  return out;
}
