export interface GrammarConnection {
  category: string
  notation: string
  original: string
  transformed: string
  meaning: string
  combined?: string
}

/** Illustrate the forms actually named in a formula, without guessing unrestricted word substitutions. */
export function grammarConnections(formula: string): GrammarConnection[] {
  if (!formula.trim()) return []
  const result: GrammarConnection[] = []
  const add = (category: string, notation: string, original: string, transformed: string, meaning: string) => {
    if (!result.some(item => item.category === category && item.transformed === transformed)) {
      result.push({ category, notation, original, transformed, meaning })
    }
  }
  const verb = (notation: string, original: string, transformed: string, meaning = 'đọc') => add('Động từ', notation, original, transformed, meaning)
  const plain = /^(?:Thể thông thường|普通形)/i.test(formula)
  const polite = /^(?:Thể lịch sự|丁寧形)/i.test(formula)
  if (/^Thể thông thường quá khứ bỏ た/u.test(formula)) {
    add('Động từ', 'Vた形', '読む', '読んだ', 'đã đọc')
    add('Tính từ い', 'Aい普通形・過去', '高い', '高かった', 'đã cao / đắt')
    add('Tính từ な', 'Aな普通形・過去', '静か', '静かだった', 'đã yên tĩnh')
    add('Danh từ', 'N普通形・過去', '学生', '学生だった', 'đã là học sinh / sinh viên')
    if (formula.includes('たりして')) for (const item of result) item.combined = `${item.transformed} + りして → ${item.transformed}りして`
    return result
  }
  const explicitVerbPlain = /\bV\s*(?:thể thông thường|普通形)/i.test(formula)
  const stem = /\bV\s*(?:bỏ\s+(?:ます|masu)|ます形[（(]−ます[）)]|ます\s*[（(]\s*bỏ\s+ます\s*[）)])/iu.test(formula)
  if (stem) {
    verb('Vます形（−ます）', '読む → 読みます', '読み')
    verb('Vます形（−ます）', '食べる → 食べます', '食べ', 'ăn')
    verb('Vます形（−ます）', 'する → します', 'し', 'làm')
  }
  if (/\bV(?:る|辞書形)/u.test(formula) || plain || explicitVerbPlain) verb('V辞書形', '読みます', '読む')
  if (/\bVている/u.test(formula)) verb('Vている', '読む', '読んでいる', 'đang đọc')
  if (/\bVていた/u.test(formula)) verb('Vていた', '読む', '読んでいた', 'đang đọc trong quá khứ')
  if (/\bVて(?!い)/u.test(formula)) verb('Vて形', '読む', '読んで')
  if (/\bVた(?!い)/u.test(formula)) verb('Vた形', '読む', '読んだ', 'đã đọc')
  if (/\bV(?:ない\s*bỏ\s*ない|\s*bỏ\s*ない)/u.test(formula)) verb('Vない形（−ない）', '読む → 読まない', '読ま')
  else if (/\bVない/u.test(formula)) verb('Vない形', '読む', '読まない', 'không đọc')
  if (/\bVば/u.test(formula)) verb('Vば形', '読む', '読めば', 'nếu đọc')
  if (/\bV\s*thể ý chí/u.test(formula)) verb('V意向形', '読む', '読もう', 'ý định đọc')
  if (/\bV\s*thể bị sai khiến|使役受身/u.test(formula)) verb('V使役受身形', '読む', '読まされる', 'bị bắt đọc')
  else if (/\bV\s*thể sai khiến/u.test(formula)) {
    const te = /\bV\s*thể sai khiến\s*(?:\+\s*)?て/u.test(formula)
    verb(te ? 'V使役形 + て' : 'V使役形', '読む', te ? '読ませて' : '読ませる', 'cho / bắt đọc')
  }
  if (/\bV\s*thể bị động/u.test(formula)) {
    const te = /\bV\s*thể bị động\s*\+\s*て/u.test(formula)
    verb(te ? 'V受身形 + て' : 'V受身形', '読む', te ? '読まれて' : '読まれる', 'được đọc')
  }
  if (polite || /\bVます形(?![（(]−ます)/u.test(formula)) verb('Vます形', '読む', '読みます')

  const iAdj = /Aい|tính từ\s*い/iu.test(formula) || plain || polite
  const naAdj = /Aな|tính từ\s*な/iu.test(formula) || plain || polite
  const noun = /\bN(?:[12の]|\b)|名詞/u.test(formula) || plain || polite
  if (iAdj) {
    if (/(?:Aい|tính từ\s*い)\s*bỏ\s*い\s*\+\s*くて/iu.test(formula)) add('Tính từ い', 'Aい（−い） + くて', '高い', '高くて', 'cao / đắt')
    else if (/(?:Aい|tính từ\s*い)\s*bỏ\s*い\s*\+\s*く/iu.test(formula)) add('Tính từ い', 'Aい（−い） + く', '高い', '高く', 'cao / đắt')
    else if (/(?:Aい|tính từ\s*い)\s*bỏ\s*い/iu.test(formula)) {
      const feeling = formula.includes('がる')
      add('Tính từ い', 'Aい（−い）', feeling ? '寂しい' : '高い', feeling ? '寂し' : '高', feeling ? 'cô đơn' : 'cao / đắt')
    }
    else if (/Aい\s*(?:[+→]\s*)?ければ/u.test(formula)) add('Tính từ い', 'Aい → ければ', '高い', '高ければ', 'nếu cao / đắt')
    else add('Tính từ い', polite ? 'Aい + です' : 'Aい', '高い', polite ? '高いです' : '高い', 'cao / đắt')
  }
  if (naAdj) {
    const joinedNa = /(?:Aな|tính từ\s*な)\s*\+\s*な/iu.test(formula)
    const joinedDe = /(?:Aな|tính từ\s*な)\s*\+\s*で(?!ある)/iu.test(formula)
    const joinedJa = /(?:Aな|tính từ\s*な)\s*\+\s*じゃ/iu.test(formula)
    const omitDa = /(?:Aな|tính từ\s*な)[^;]*bỏ\s*だ|bỏ\s*だ[^;]*(?:Aな|tính từ\s*な)/iu.test(formula)
    const transformed = polite ? '静かです' : joinedNa ? '静かな' : joinedDe ? '静かで' : joinedJa ? '静かじゃ' : plain && !omitDa ? '静かだ' : '静か'
    add('Tính từ な', joinedNa ? 'Aな + な' : joinedDe ? 'Aな + で' : joinedJa ? 'Aな + じゃ' : polite ? 'Aな + です' : plain && !omitDa ? 'Aな普通形' : 'Aな（語幹）', '静か', transformed, 'yên tĩnh')
  }
  if (noun) {
    const joinedNo = /\bN(?:の|\s*\+\s*の)/u.test(formula)
    const joinedJa = /\bN\s*\+\s*じゃ/u.test(formula)
    const joinedDe = /\bN\s*\+\s*で(?!ある)/u.test(formula)
    const omitDa = /\bN[^;]*bỏ\s*だ|bỏ\s*だ[^;]*\bN/u.test(formula)
    const time = /\bN\s*chỉ thời gian/u.test(formula)
    const word = time ? '一年' : '学生'
    const transformed = polite ? `${word}です` : joinedNo ? `${word}の` : joinedJa ? `${word}じゃ` : joinedDe ? `${word}で` : plain && !omitDa ? `${word}だ` : word
    add('Danh từ', joinedNo ? 'N + の' : joinedJa ? 'N + じゃ' : joinedDe ? 'N + で' : polite ? 'N + です' : plain && !omitDa ? 'N普通形' : time ? 'N（時間）' : 'N', word, transformed, time ? 'một năm' : 'học sinh / sinh viên')
  }

  // These productive compounds allow concrete examples with each of the three verb groups.
  const compound = formula.match(/^V(?:\s*bỏ\s*ます|ます形[（(]−ます[）)])\s*\+\s*(始める|続ける|出す|きる|きれない|っこない|っぱなし)(?=\s|$|[／/])/u)?.[1]
  if (compound) for (const item of result.filter(item => item.notation === 'Vます形（−ます）')) {
    item.combined = `${item.transformed} + ${compound} → ${item.transformed}${compound}`
  }
  return result
}
