export interface StoryParagraph {
  id: string;
  order: number;
  title: string;
  speaker: 'Narrator' | 'Razi' | 'Cikgu Zainal';
  intonationType: 'naratif' | 'tegas_sopan' | 'imbas_kembali' | 'nasihat_lembut' | 'inspirasi';
  intonationTip: string;
  text: string;
  targetKeywords: string[];
  tokenReward: number;
  xpReward: number;
  question: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface ResponsibilityStation {
  id: string;
  number: number;
  title: string;
  shortDesc: string;
  detailText: string;
  colorHex: string;
  threeColor: number;
  position: [number, number, number];
  iconType: 'teladan' | 'memimpin' | 'masa' | 'tugasan' | 'peraturan';
  tokenBonus: number;
}

export interface AvatarAccessory {
  id: string;
  name: string;
  slot: 'hat' | 'tie' | 'back' | 'glasses';
  rarity: 'Biasa' | 'Nadir' | 'Epik' | 'Legenda';
  colorHex: string;
  description: string;
  costTokens: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  requirementText: string;
  accentColor: string;
  iconName: 'shield' | 'clock' | 'mic' | 'book' | 'award' | 'crown';
}

export const PEMIMPIN_CILIK_INTRO =
  'Afifi membaca kisah seorang ketua pengawas. Daripada kisah itu, dia ingin menulis perihal ciri seorang ketua pengawas yang berketerampilan.';

export const STORY_PARAGRAPHS: StoryParagraph[] = [
  {
    id: 'p1',
    order: 1,
    title: 'Perlantikan Ketua Pengawas',
    speaker: 'Narrator',
    intonationType: 'naratif',
    intonationTip: 'Baca dengan nada penceritaan yang tenang, jelas, dan berhenti sejenak pada tanda noktah.',
    text: 'Razi mula dilantik sebagai pengawas semasa tahun lima. Apabila memasuki tahun enam, dia terpilih sebagai ketua pengawas di sekolahnya. Semenjak itu, sikapnya kian berubah. Razi sedar akan tanggungjawabnya yang lebih besar.',
    targetKeywords: ['dilantik', 'pengawas', 'ketua', 'sikapnya', 'tanggungjawabnya'],
    tokenReward: 25,
    xpReward: 50,
    question: {
      prompt: 'Bilakah Razi terpilih sebagai ketua pengawas di sekolahnya?',
      options: ['Semasa tahun empat', 'Semasa tahun lima', 'Apabila memasuki tahun enam', 'Semasa sekolah menengah'],
      correctIndex: 2,
      explanation: 'Razi dilantik sebagai pengawas semasa tahun lima dan terpilih sebagai ketua pengawas apabila memasuki tahun enam.'
    }
  },
  {
    id: 'p2',
    order: 2,
    title: 'Bertugas di Pintu Pagar Sekolah',
    speaker: 'Razi',
    intonationType: 'tegas_sopan',
    intonationTip: 'Tinggikan sedikit nada pada kata seru "Rakan-rakan, lekas" secara tegas tetapi mesra.',
    text: 'Pada setiap pagi, Razi akan membantu guru bertugas di pintu pagar sekolah. "Rakan-rakan, lekas. Loceng akan berbunyi sebentar lagi," arah Razi kepada murid-murid yang baru tiba di sekolah.',
    targetKeywords: ['pagi', 'pintu', 'pagar', 'loceng', 'berbunyi'],
    tokenReward: 30,
    xpReward: 60,
    question: {
      prompt: 'Apakah tugas Razi pada setiap pagi di pintu pagar sekolah?',
      options: [
        'Membantu guru bertugas dan mengingatkan murid agar lekas sebelum loceng berbunyi',
        'Menjual makanan di kantin sekolah',
        'Mengunci pintu pagar sekolah seawal pagi',
        'Memeriksa buku latihan di dalam kelas'
      ],
      correctIndex: 0,
      explanation: 'Setiap pagi Razi membantu guru bertugas di pintu pagar sekolah dan mengingatkan rakan-rakan agar segera masuk.'
    }
  },
  {
    id: 'p3',
    order: 3,
    title: 'Pesanan Cikgu Zainal: Rasional & Adil',
    speaker: 'Cikgu Zainal',
    intonationType: 'imbas_kembali',
    intonationTip: 'Gunakan intonasi nasihat yang berwibawa dan tenang ketika membaca dialog pesanan Cikgu Zainal.',
    text: 'Apabila loceng telah berbunyi, Razi segera mencatat nama murid yang lewat. "Razi, kita perlu sentiasa rasional dan tidak pilih kasih semasa menjalankan tugas," imbas kembali Razi akan pesanan Cikgu Zainal semasa dia baru dilantik dahulu.',
    targetKeywords: ['mencatat', 'lewat', 'rasional', 'pilih', 'kasih'],
    tokenReward: 35,
    xpReward: 70,
    question: {
      prompt: 'Apakah pesanan Cikgu Zainal yang diingati oleh Razi semasa menjalankan tugas?',
      options: [
        'Sentiasa garang kepada semua murid',
        'Sentiasa rasional dan tidak pilih kasih semasa menjalankan tugas',
        'Hanya mencatat nama murid yang tidak dikenali',
        'Melepaskan rakan rapat yang datang lewat'
      ],
      correctIndex: 1,
      explanation: 'Cikgu Zainal berpesan agar sentiasa rasional dan tidak pilih kasih semasa menjalankan tugas.'
    }
  },
  {
    id: 'p4',
    order: 4,
    title: 'Menasihati dengan Bahasa yang Sopan',
    speaker: 'Razi',
    intonationType: 'nasihat_lembut',
    intonationTip: 'Alunkan suara dengan sopan, lembut dan berhemah semasa menyapa "Amir, Nurul".',
    text: 'Selesai mencatat nama, Razi menasihati murid-murid itu agar berubah. Razi sedar nasihat juga dapat membantu seseorang menjadi lebih baik. "Amir, Nurul, sebagai pengawas, kita perlulah memberikan nasihat dengan bahasa yang sopan kepada murid-murid lain," pesan Razi kepada pengawas lain yang berada di situ.',
    targetKeywords: ['menasihati', 'berubah', 'Amir', 'Nurul', 'sopan'],
    tokenReward: 35,
    xpReward: 70,
    question: {
      prompt: 'Bagaimanakah cara pengawas memberikan nasihat kepada murid-murid lain menurut Razi?',
      options: [
        'Dengan suara yang tengking dan kasar',
        'Dengan bahasa yang sopan',
        'Dengan menyindir di hadapan perhimpunan',
        'Dengan mendiamkan diri sahaja'
      ],
      correctIndex: 1,
      explanation: 'Razi berpesan kepada Amir dan Nurul supaya memberikan nasihat dengan bahasa yang sopan.'
    }
  },
  {
    id: 'p5',
    order: 5,
    title: 'Disiplin Asas Kecemerlangan & Risalah Panduan',
    speaker: 'Narrator',
    intonationType: 'inspirasi',
    intonationTip: 'Baca dengan penuh keyakinan dan semangat inspirasi seorang pemimpin cilik yang berketerampilan.',
    text: 'Apabila pintu pagar telah ditutup, Razi terus masuk ke kelas. Dia yakin disiplin asas utama kecemerlangan seseorang. Amanah yang dipikulnya sekarang menjadi sokongan moral untuk dia berjaya dalam bidang kokurikulum dan akademik. Sambil memegang risalah tentang tanggungjawab ketua pengawas, Razi meneliti setiap ciri tersebut sebagai panduannya menjadi murid yang berketerampilan.',
    targetKeywords: ['disiplin', 'kecemerlangan', 'amanah', 'kokurikulum', 'berketerampilan'],
    tokenReward: 40,
    xpReward: 80,
    question: {
      prompt: 'Apakah yang diyakini oleh Razi sebagai asas utama kecemerlangan seseorang?',
      options: ['Disiplin', 'Kekayaan', 'Populariti', 'Nasib semata-mata'],
      correctIndex: 0,
      explanation: 'Razi yakin bahawa disiplin ialah asas utama kecemerlangan seseorang dalam kokurikulum dan akademik.'
    }
  }
];

export const RESPONSIBILITY_STATIONS: ResponsibilityStation[] = [
  {
    id: 'st_1',
    number: 1,
    title: 'Suri Teladan bagi Semua Murid',
    shortDesc: 'Menjaga sikap, berakhlak mulia, dan menjadi contoh terbaik di sekolah.',
    detailText: 'Ketua pengawas perlu menunjukkan tingkah laku terpuji, berpakaian kemas, dan menghormati guru serta rakan supaya menjadi suri teladan kepada semua murid.',
    colorHex: '#F59E0B',
    threeColor: 0xf59e0b,
    position: [-14, 0, -10],
    iconType: 'teladan',
    tokenBonus: 15
  },
  {
    id: 'st_2',
    number: 2,
    title: 'Memimpin Pengawas Lain',
    shortDesc: 'Membimbing rakan pengawas seperti Amir dan Nurul menggunakan bahasa sopan.',
    detailText: 'Memberikan panduan dan pesanan yang jelas serta berhemah kepada pengawas-pengawas lain supaya pasukan pengawas bertugas dengan harmoni.',
    colorHex: '#0EA5E9',
    threeColor: 0x0ea5e9,
    position: [14, 0, -10],
    iconType: 'memimpin',
    tokenBonus: 15
  },
  {
    id: 'st_3',
    number: 3,
    title: 'Menepati Masa',
    shortDesc: 'Hadir awal di pintu pagar sekolah sebelum loceng berbunyi dan masuk ke kelas tepat waktu.',
    detailText: 'Datang awal setiap pagi untuk membantu guru bertugas di pintu pagar sekolah dan sentiasa menghargai masa pembelajaran.',
    colorHex: '#10B981',
    threeColor: 0x10b981,
    position: [-16, 0, 8],
    iconType: 'masa',
    tokenBonus: 15
  },
  {
    id: 'st_4',
    number: 4,
    title: 'Melaksanakan Tugasan yang Diberikan',
    shortDesc: 'Mencatat nama murid lewat secara rasional dan tidak pilih kasih.',
    detailText: 'Menjalankan amanah guru dengan jujur, adil, rasional, dan tanpa pilih kasih seperti pesanan Cikgu Zainal.',
    colorHex: '#8B5CF6',
    threeColor: 0x8b5cf6,
    position: [16, 0, 8],
    iconType: 'tugasan',
    tokenBonus: 15
  },
  {
    id: 'st_5',
    number: 5,
    title: 'Memastikan Murid Mematuhi Peraturan',
    shortDesc: 'Menegur dan menasihati murid dengan sopan agar berdisiplin.',
    detailText: 'Membantu memastikan peraturan sekolah dipatuhi melalui nasihat yang membina kerana disiplin ialah asas utama kecemerlangan.',
    colorHex: '#EC4899',
    threeColor: 0xec4899,
    position: [0, 0, -18],
    iconType: 'peraturan',
    tokenBonus: 15
  }
];

export const AVATAR_ACCESSORIES: AvatarAccessory[] = [
  // Hats
  {
    id: 'hat_none',
    name: 'Rambut Kemas Pengawas',
    slot: 'hat',
    rarity: 'Biasa',
    colorHex: '#1E293B',
    description: 'Gaya rambut kemas murid berketerampilan mengikut peraturan sekolah.',
    costTokens: 0
  },
  {
    id: 'hat_beret_gold',
    name: 'Beret Ketua Pengawas Emas',
    slot: 'hat',
    rarity: 'Nadir',
    colorHex: '#F59E0B',
    description: 'Beret biru gelap berlencana emas khas untuk Pemimpin Cilik.',
    costTokens: 40
  },
  {
    id: 'hat_mortarboard',
    name: 'Topi Cendekiawan Bestari',
    slot: 'hat',
    rarity: 'Epik',
    colorHex: '#3B82F6',
    description: 'Topi akademik berjumbai emas lambang kecemerlangan akademik & kokurikulum.',
    costTokens: 60
  },
  {
    id: 'hat_crown_teladan',
    name: 'Mahkota Suri Teladan',
    slot: 'hat',
    rarity: 'Legenda',
    colorHex: '#FBBF24',
    description: 'Mahkota kristal bercahaya untuk murid yang menguasai bacaan dan intonasi TP6.',
    costTokens: 90
  },
  // Ties
  {
    id: 'tie_red_default',
    name: 'Tali Leher Merah Pengawas',
    slot: 'tie',
    rarity: 'Biasa',
    colorHex: '#EF4444',
    description: 'Tali leher merah rasmi seperti dipakai oleh Razi dalam buku teks.',
    costTokens: 0
  },
  {
    id: 'tie_gold_crest',
    name: 'Tali Leher Emas Ketua Pengawas',
    slot: 'tie',
    rarity: 'Epik',
    colorHex: '#F59E0B',
    description: 'Tali leher eksklusif bersulam benang emas dengan pin kepemimpinan.',
    costTokens: 50
  },
  {
    id: 'tie_sapphire_ribbon',
    name: 'Tali Leher Nilam Rasional',
    slot: 'tie',
    rarity: 'Nadir',
    colorHex: '#06B6D4',
    description: 'Melambangkan sikap rasional dan tidak pilih kasih.',
    costTokens: 40
  },
  // Back accessories
  {
    id: 'back_none',
    name: 'Tiada Aksesori Belakang',
    slot: 'back',
    rarity: 'Biasa',
    colorHex: '#64748B',
    description: 'Kemas tanpa aksesori tambahan di bahagian belakang.',
    costTokens: 0
  },
  {
    id: 'back_schoolbag_pro',
    name: 'Beg Galas Risalah Cemerlang',
    slot: 'back',
    rarity: 'Nadir',
    colorHex: '#2563EB',
    description: 'Beg sekolah ergonomik yang memuatkan risalah tanggungjawab ketua pengawas.',
    costTokens: 45
  },
  {
    id: 'back_jetpack_literasi',
    name: 'Jetpack Roket Literasi',
    slot: 'back',
    rarity: 'Epik',
    colorHex: '#F97316',
    description: 'Pendorong roket masa hadapan untuk meneroka dunia pembacaan dengan pantas.',
    costTokens: 70
  },
  {
    id: 'back_wings_aurora',
    name: 'Sayap Cahaya Pemimpin Cilik',
    slot: 'back',
    rarity: 'Legenda',
    colorHex: '#38BDF8',
    description: 'Sayap tenaga emas-biru ala Unreal Engine yang berkilau semasa berlari.',
    costTokens: 100
  },
  // Glasses
  {
    id: 'glasses_none',
    name: 'Tiada Kaca Mata',
    slot: 'glasses',
    rarity: 'Biasa',
    colorHex: '#64748B',
    description: 'Pandangan mata asli yang fokus.',
    costTokens: 0
  },
  {
    id: 'glasses_scholar',
    name: 'Kaca Mata Fokus Akademik',
    slot: 'glasses',
    rarity: 'Nadir',
    colorHex: '#10B981',
    description: 'Bingkai kaca mata pintar untuk meneliti setiap ciri ketua pengawas.',
    costTokens: 40
  },
  {
    id: 'glasses_holo_visor',
    name: 'Visor Hologram Baca3D',
    slot: 'glasses',
    rarity: 'Epik',
    colorHex: '#A855F7',
    description: 'Visor siber bercahaya yang memaparkan gelombang intonasi bacaan.',
    costTokens: 65
  }
];

export const ACHIEVEMENT_BADGES: AchievementBadge[] = [
  {
    id: 'badge_first_read',
    title: 'Suara Pertama Razi',
    description: 'Berjaya membaca perenggan pertama kisah Pemimpin Cilik dengan jelas.',
    requirementText: 'Lengkapkan 1 perenggan bacaan',
    accentColor: '#38BDF8',
    iconName: 'mic'
  },
  {
    id: 'badge_intonasi_emas',
    title: 'Bintang Intonasi Emas',
    description: 'Mencapai purata skor intonasi dan kejelasan bacaan 85% ke atas.',
    requirementText: 'Purata Intonasi >= 85%',
    accentColor: '#F59E0B',
    iconName: 'award'
  },
  {
    id: 'badge_explorer_5',
    title: 'Penjelajah 5 Tanggungjawab',
    description: 'Melawati kesemua 5 Stesen Tanggungjawab Ketua Pengawas di Dunia 3D.',
    requirementText: 'Lawati 5/5 Stesen 3D',
    accentColor: '#10B981',
    iconName: 'clock'
  },
  {
    id: 'badge_rumusan_master',
    title: 'Penulis Rumusan Bijak',
    description: 'Melengkapkan Aktiviti Rumusan ciri ketua pengawas yang berketerampilan.',
    requirementText: 'Lengkapkan Aktiviti Rumusan',
    accentColor: '#8B5CF6',
    iconName: 'book'
  },
  {
    id: 'badge_blindbox_collector',
    title: 'Pengumpul Kotak Misteri',
    description: 'Membuka sekurang-kurangnya 2 aksesori eksklusif daripada Blind Box.',
    requirementText: 'Miliki >= 5 aksesori avatar',
    accentColor: '#EC4899',
    iconName: 'shield'
  },
  {
    id: 'badge_tp6_leader',
    title: 'Pemimpin Cilik TP6',
    description: 'Mencapai Tahap Penguasaan 6 (TP6) dengan menyelesaikan semua bacaan & rumusan.',
    requirementText: 'Capai Tahap Penguasaan TP6',
    accentColor: '#FBBF24',
    iconName: 'crown'
  }
];

export const RUMUSAN_CHECKLIST_ITEMS = [
  'Menjadi suri teladan kepada semua murid',
  'Memimpin pengawas lain dan menasihati dengan bahasa yang sopan',
  'Menepati masa dan membantu guru bertugas di pintu pagar sekolah',
  'Melaksanakan tugasan dengan rasional serta tidak pilih kasih',
  'Memastikan murid mematuhi peraturan kerana disiplin asas kecemerlangan'
];

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  className: string;
  tokens: number;
  totalXp: number;
  tpLevel: number;
  avgClarity: number;
  avgIntonation: number;
  unlockedBadgesCount: number;
  isCurrentUser?: boolean;
}

export const SEED_CLASS_LEADERBOARD: LeaderboardEntry[] = [
  {
    uid: 'seed_razi',
    displayName: 'Razi bin Kamal (Ketua Pengawas)',
    className: '6 Bestari',
    tokens: 210,
    totalXp: 580,
    tpLevel: 6,
    avgClarity: 96,
    avgIntonation: 95,
    unlockedBadgesCount: 6
  },
  {
    uid: 'seed_afifi',
    displayName: 'Afifi bin Haris',
    className: '6 Bestari',
    tokens: 175,
    totalXp: 460,
    tpLevel: 5,
    avgClarity: 91,
    avgIntonation: 89,
    unlockedBadgesCount: 5
  },
  {
    uid: 'seed_nurul',
    displayName: 'Nurul Aina',
    className: '6 Bestari',
    tokens: 150,
    totalXp: 390,
    tpLevel: 5,
    avgClarity: 88,
    avgIntonation: 87,
    unlockedBadgesCount: 4
  },
  {
    uid: 'seed_amir',
    displayName: 'Amir Hakimi',
    className: '6 Amanah',
    tokens: 120,
    totalXp: 310,
    tpLevel: 4,
    avgClarity: 84,
    avgIntonation: 82,
    unlockedBadgesCount: 3
  },
  {
    uid: 'seed_meiling',
    displayName: 'Mei Ling Tan',
    className: '6 Cemerlang',
    tokens: 95,
    totalXp: 240,
    tpLevel: 3,
    avgClarity: 80,
    avgIntonation: 79,
    unlockedBadgesCount: 2
  }
];
