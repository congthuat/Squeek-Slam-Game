import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'vi' | 'en'

const STORAGE_KEY = 'squeek-slam-lang'

type Dict = Record<string, string>

const vi: Dict = {
  'app.tagline': 'Mini-game trên Squeekchain',
  'chain.running': 'Đang chạy',
  'chain.idle': 'Đang nghỉ',
  'chain.offline': 'Không kết nối được Squeekchain',
  'chain.work': 'công',
  'game.score': 'Điểm',
  'game.combo': 'Combo',
  'game.best': 'Kỷ lục',
  'game.readyTitle': 'Sẵn sàng đập hamster?',
  'game.readyHint': '30 giây để ghi điểm cao nhất',
  'game.start': 'BẮT ĐẦU',
  'game.hits': 'Đập trúng',
  'game.misses': 'Đập trượt',
  'game.accuracy': 'Chính xác',
  'game.maxCombo': 'Combo cao nhất',
  'game.timeUp': 'Hết giờ!',
  'game.enterName': 'Tên của bạn',
  'game.namePlaceholder': 'VD: SqueekMaster',
  'game.submit': 'Lưu điểm',
  'game.saving': 'Đang lưu...',
  'game.savedRank': 'Đã lưu! Bạn xếp hạng #{rank}',
  'game.savedNoRank': 'Đã lưu điểm!',
  'game.errName': 'Nhập tên trước nhé',
  'game.errNetwork': 'Không lưu được điểm. Thử lại.',
  'game.playAgain': 'CHƠI LẠI',
  'lb.title': 'Bảng xếp hạng',
  'lb.all': 'Mọi thời đại',
  'lb.today': 'Hôm nay',
  'lb.empty': 'Chưa có ai chơi. Người đầu tiên là bạn!',
  'lb.error': 'Không tải được. Thử lại sau.',
  'lb.games': 'ván đã chơi',
  'lb.week': 'Tuần này',
  'mode.all': 'Tổng hợp',
  'mode.standard': 'Chuẩn',
  'mode.hard': 'Khó',
  'mode.insane': 'Điên',
  'mode.pick': 'Chọn độ khó',
  'mode.descStandard': 'Nhịp cân bằng · điểm ×1',
  'mode.descHard': 'Nhanh hơn, nhiều bom · điểm ×1,25',
  'mode.descInsane': 'Tốc độ tối đa, 3 mục tiêu · điểm ×1,5',
  'tourney.title': 'Giải đấu tuần',
  'tourney.endsIn': 'Còn lại',
  'tourney.champion': 'Nhà vô địch tuần',
  'tourney.empty': 'Tuần này chưa có ai. Cắm cờ đầu tiên đi!',
  'tourney.games': 'lượt thi tuần này',
  'rush.live': 'Hamster thật',
  'rush.badge': 'CHAIN RUSH ×1,5',
  'how.rush': 'Khi hamster thật chạy: mở Chain Rush, điểm ×1,5',
  'stats.title': 'Cộng đồng',
  'stats.games': 'Ván đã chơi',
  'stats.hits': 'Hamster bị đập',
  'stats.top': 'Điểm cao nhất',
  'how.title': 'Cách chơi',
  'how.hamster': 'Hamster +10 điểm',
  'how.golden': 'Hamster vàng +50 điểm',
  'how.clock': 'Đồng hồ cộng 3 giây',
  'how.bomb': 'Bom −20 điểm, mất combo',
  'how.combo': 'Đập liên tiếp để tăng combo, tối đa ×5 — ngừng đập là combo tụt',
  'how.quick': 'Đập trong 0,3 giây đầu: thưởng +5 điểm',
  'how.phases': 'Ván chia 4 giai đoạn tăng dần, 5 giây cuối điểm ×2',
  'how.modes': 'Chọn độ khó trước mỗi ván — càng khó điểm thưởng càng cao',
  'how.time': '30 giây mỗi ván',
  'game.phaseWarmup': 'Khởi động',
  'game.phaseSpeed': 'Tăng tốc',
  'game.phaseFrenzy': 'Điên cuồng',
  'game.phaseFinal': '5 giây cuối',
  'game.announceFinal': '5 GIÂY CUỐI — ĐIỂM ×2!',
  'game.doubleBadge': '×2 ĐIỂM',
  'game.newBest': 'KỶ LỤC MỚI!',
  'game.grade': 'Xếp hạng',
  'game.quick': 'Đập nhanh',
  'game.clockStat': 'Giây cộng thêm',
  'game.share': 'Chia sẻ kết quả',
  'game.copied': 'Đã copy!',
  'game.spaceHint': 'Nhấn Space để bắt đầu',
  'game.keyHint': 'Mẹo: bấm phím 1–9 để đập ô tương ứng',
  'game.profileGames': 'Ván đã chơi',
  'game.profileBestCombo': 'Combo tốt nhất',
  'game.comboMax': 'MAX',
  'footer.disclaimer': 'Game cộng đồng không chính thức. Điểm chỉ để giải trí, không phải $SQK thật.',
}

const en: Dict = {
  'app.tagline': 'A mini-game on Squeekchain',
  'chain.running': 'Running',
  'chain.idle': 'Idle',
  'chain.offline': "Can't reach Squeekchain",
  'chain.work': 'work',
  'game.score': 'Score',
  'game.combo': 'Combo',
  'game.best': 'Best',
  'game.readyTitle': 'Ready to slam?',
  'game.readyHint': '30 seconds to set your best score',
  'game.start': 'START',
  'game.hits': 'Slammed',
  'game.misses': 'Missed',
  'game.accuracy': 'Accuracy',
  'game.maxCombo': 'Top combo',
  'game.timeUp': "Time's up!",
  'game.enterName': 'Your name',
  'game.namePlaceholder': 'e.g. SqueekMaster',
  'game.submit': 'Save score',
  'game.saving': 'Saving...',
  'game.savedRank': 'Saved! You rank #{rank}',
  'game.savedNoRank': 'Score saved!',
  'game.errName': 'Enter a name first',
  'game.errNetwork': "Couldn't save. Try again.",
  'game.playAgain': 'PLAY AGAIN',
  'lb.title': 'Leaderboard',
  'lb.all': 'All-time',
  'lb.today': 'Today',
  'lb.empty': 'No games yet. Be the first!',
  'lb.error': 'Failed to load. Try again.',
  'lb.games': 'games played',
  'lb.week': 'This week',
  'mode.all': 'All modes',
  'mode.standard': 'Standard',
  'mode.hard': 'Hard',
  'mode.insane': 'Insane',
  'mode.pick': 'Pick difficulty',
  'mode.descStandard': 'Balanced pace · points ×1',
  'mode.descHard': 'Faster, more bombs · points ×1.25',
  'mode.descInsane': 'Max speed, 3 targets · points ×1.5',
  'tourney.title': 'Weekly tournament',
  'tourney.endsIn': 'Ends in',
  'tourney.champion': 'Weekly champion',
  'tourney.empty': 'Nobody this week yet. Plant the first flag!',
  'tourney.games': 'runs this week',
  'rush.live': 'Live hamster',
  'rush.badge': 'CHAIN RUSH ×1.5',
  'how.rush': 'When the real hamster runs: Chain Rush unlocks, points ×1.5',
  'stats.title': 'Community',
  'stats.games': 'Games played',
  'stats.hits': 'Hamsters slammed',
  'stats.top': 'Top score',
  'how.title': 'How to play',
  'how.hamster': 'Hamster +10 points',
  'how.golden': 'Golden hamster +50 points',
  'how.clock': 'Clock adds 3 seconds',
  'how.bomb': 'Bomb −20 points, resets combo',
  'how.combo': 'Slam in a row to build combo up to ×5 — it fades if you stop',
  'how.quick': 'Slam within the first 0.3s: +5 bonus',
  'how.phases': 'Four escalating phases, the last 5s pay double',
  'how.modes': 'Pick a difficulty before each round — harder pays more',
  'how.time': '30 seconds per round',
  'game.phaseWarmup': 'Warm-up',
  'game.phaseSpeed': 'Speed up',
  'game.phaseFrenzy': 'Frenzy',
  'game.phaseFinal': 'Final 5s',
  'game.announceFinal': 'FINAL 5s — POINTS ×2!',
  'game.doubleBadge': '×2 POINTS',
  'game.newBest': 'NEW RECORD!',
  'game.grade': 'Grade',
  'game.quick': 'Quick hits',
  'game.clockStat': 'Seconds added',
  'game.share': 'Share result',
  'game.copied': 'Copied!',
  'game.spaceHint': 'Press Space to start',
  'game.keyHint': 'Tip: press keys 1–9 to slam the matching cell',
  'game.profileGames': 'Rounds played',
  'game.profileBestCombo': 'Best combo',
  'game.comboMax': 'MAX',
  'footer.disclaimer': 'Unofficial community game. Points are just for fun — not real $SQK.',
}

const dictionaries: Record<Lang, Dict> = { vi, en }

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function readStoredLang(): Lang {
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'en') return 'en'
  } catch {
    /* ignore */
  }
  return 'vi'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const t = (key: string, vars?: Record<string, string | number>) => {
    let text = dictionaries[lang][key] ?? dictionaries.vi[key] ?? key
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, String(value))
      }
    }
    return text
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside LangProvider')
  return value
}
