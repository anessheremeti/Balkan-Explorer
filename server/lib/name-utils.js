// Cyrillic-to-Latin transliteration covering Serbian, Macedonian, and shared East-Slavic chars.
// Applied when a place has no explicit English/Latin tag (name:en, int_name, name:sr-Latn).
const CYR_MAP = {
  А:'A',  а:'a',  Б:'B',  б:'b',  В:'V',  в:'v',  Г:'G',  г:'g',
  Д:'D',  д:'d',  Е:'E',  е:'e',  Ж:'Zh', ж:'zh', З:'Z',  з:'z',
  И:'I',  и:'i',  Й:'Y',  й:'y',  К:'K',  к:'k',  Л:'L',  л:'l',
  М:'M',  м:'m',  Н:'N',  н:'n',  О:'O',  о:'o',  П:'P',  п:'p',
  Р:'R',  р:'r',  С:'S',  с:'s',  Т:'T',  т:'t',  У:'U',  у:'u',
  Ф:'F',  ф:'f',  Х:'H',  х:'h',  Ц:'Ts', ц:'ts', Ч:'Ch', ч:'ch',
  Ш:'Sh', ш:'sh', Щ:'Sht',щ:'sht',Ъ:'',   ъ:'',   Ы:'Y',  ы:'y',
  Ь:'',   ь:'',   Э:'E',  э:'e',  Ю:'Yu', ю:'yu', Я:'Ya', я:'ya',
  // Serbian
  Ђ:'Dj', ђ:'dj', Ј:'J',  ј:'j',  Љ:'Lj', љ:'lj',
  Њ:'Nj', њ:'nj', Ћ:'C',  ћ:'c',  Џ:'Dz', џ:'dz',
  // Macedonian
  Ѓ:'Gj', ѓ:'gj', Ѕ:'Dz', ѕ:'dz',
  Ќ:'Kj', ќ:'kj', Ѐ:'E',  ѐ:'e',  Ѝ:'I',  ѝ:'i',
};

export function hasCyrillic(s) {
  return /[Ѐ-ӿ]/.test(s);
}

export function transliterate(s) {
  return s.split('').map(ch => CYR_MAP[ch] ?? ch).join('');
}

/**
 * Returns the best Latin/English display name for a place.
 * Priority: explicit Latin tag → transliteration of Cyrillic → raw name.
 * Also returns `name_local` (the original script) when it differs from the display name.
 */
export function resolveName(rawName, latinTag) {
  const local = rawName?.trim() ?? '';
  const latin = latinTag?.trim() ?? null;

  let display;
  if (latin) {
    display = latin;
  } else if (local && hasCyrillic(local)) {
    display = transliterate(local);
  } else {
    display = local;
  }

  return {
    name:       display || null,
    name_local: local && local !== display ? local : null,
  };
}
