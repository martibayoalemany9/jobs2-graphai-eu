"""Occupation-title glossary for catalog locales.

Longest-first phrase replace after stripping German gender markers.
Does not mutate harvest job_offers rows.
"""
from __future__ import annotations

import re

LOCALES = ("en", "de", "nl", "fr", "cs", "ja", "et", "ru")

def T(en: str, de: str, nl: str, fr: str, cs: str, ja: str, et: str, ru: str) -> dict[str, str]:
    return {"en": en, "de": de, "nl": nl, "fr": fr, "cs": cs, "ja": ja, "et": et, "ru": ru}


GENDER_RE = re.compile(
    r"\s*[\(\[]\s*(?:"
    r"m\s*/\s*[wfd]\s*/\s*[dxw]|"
    r"w\s*/\s*m\s*/\s*d|"
    r"d\s*/\s*w\s*/\s*m|"
    r"m\s*/\s*w\s*/\s*x\s*/\s*d|"
    r"m\s*/\s*ž|"
    r"gn|divers|all genders|alle geschlechter"
    r")\s*[\)\]]",
    re.I,
)
GENDER_BARE = re.compile(r"\s*\bm\s*/\s*w\s*/\s*d\b", re.I)
SPACE_RE = re.compile(r"\s+")
WOCHEN_RE = re.compile(r"auf teilzeitbasis\s+(\d+)\s+wochenstunden", re.I)

BRANDS = {
    "tchibo", "sap", "ibm", "google", "aws", "azure", "meta", "siemens", "bosch",
    "lidl", "aldi", "rewe", "edeka", "penny", "kaufland", "ikea", "amazon",
}

EXACT: dict[str, dict[str, str]] = {
    "dělníci v oblasti výstavby a údržby budov": T(
        "Construction and building maintenance workers",
        "Bau- und Gebäudeinstandhaltungsarbeiter",
        "Bouw- en gebouwonderhoudsmedewerkers",
        "Ouvriers du bâtiment et de la maintenance",
        "Dělníci v oblasti výstavby a údržby budov",
        "建設・建物メンテナンス作業員",
        "Ehitus- ja hoonehooldustöölised",
        "Рабочие строительства и обслуживания зданий",
    ),
    "pomocní kuchaři": T(
        "Kitchen assistants",
        "Küchenhilfen",
        "Keukenhulpen",
        "Aides de cuisine",
        "Pomocní kuchaři",
        "厨房助手",
        "Köögiabilised",
        "Помощники повара",
    ),
    "abiturientenprogramm handelsfachwirt 2027": T(
        "A-level trainee programme Retail specialist 2027",
        "Abiturientenprogramm Handelsfachwirt 2027",
        "Abiturientenprogramma Handelsfachwirt 2027",
        "Programme bacheliers expert commerce 2027",
        "Program pro abiturienty Handelsfachwirt 2027",
        "アビトゥーア研修 小売専門 2027",
        "Abiturienti programm Handelsfachwirt 2027",
        "Программа для абитуриентов Handelsfachwirt 2027",
    ),
    "software engineer / technology lead": T(
        "Software Engineer / Technology Lead",
        "Software Engineer / Technology Lead",
        "Software Engineer / Technology Lead",
        "Ingénieur logiciel / responsable technique",
        "Software Engineer / Technology Lead",
        "ソフトウェアエンジニア / テクノロジーリード",
        "Tarkvarainsener / tehnoloogiajuht",
        "Software Engineer / Technology Lead",
    ),
}

PHRASES: list[tuple[str, dict[str, str]]] = [
    ("aushilfe auf geringfügiger beschäftigungsbasis", T(
        "Mini-job temporary help", "Aushilfe auf geringfügiger Beschäftigungsbasis",
        "Hulp op mini-jobbasis", "Aide en mini-job",
        "Výpomoc na malý úvazek", "ミニジョブの補助", "Väikese koormusega abi", "Подработка (мини-занятость)",
    )),
    ("verkäufer mit kassiertätigkeit", T(
        "Sales assistant with cashier duties", "Verkäufer mit Kassiertätigkeit",
        "Verkoopmedewerker met kassawerk", "Vendeur avec caisse",
        "Prodavač s pokladnou", "レジ付き販売員", "Müüja kassatööga", "Продавец с кассой",
    )),
    ("stellvertretender filialleiter", T(
        "Deputy store manager", "Stellvertretender Filialleiter",
        "Plaatsvervangend filiaalmanager", "Directeur adjoint de magasin",
        "Zástupce vedoucího prodejny", "店舗副店長", "Kaupluse juhataja asetäitja", "Заместитель управляющего магазином",
    )),
    ("fachkraft für lagerlogistik", T(
        "Warehouse logistics specialist", "Fachkraft für Lagerlogistik",
        "Specialist magazijnlogistiek", "Spécialiste logistique d’entrepôt",
        "Odborník skladové logistiky", "倉庫物流専門職", "Laologistika spetsialist", "Специалист складской логистики",
    )),
    ("maschinen- und anlagenführer", T(
        "Machine and plant operator", "Maschinen- und Anlagenführer",
        "Machine- en installatiebediener", "Conducteur de machines et d’installations",
        "Obsluha strojů a zařízení", "機械・設備オペレーター", "Masina- ja seadmeoperaator", "Оператор машин и установок",
    )),
    ("teamleiter im einzelhandel", T(
        "Retail team leader", "Teamleiter im Einzelhandel",
        "Teamleider in de detailhandel", "Chef d’équipe en commerce de détail",
        "Vedoucí týmu v maloobchodě", "小売チームリーダー", "Jaekaubanduse meeskonnajuht", "Руководитель команды в рознице",
    )),
    ("regalbetreuung / warenpräsentation / merchandising", T(
        "Shelf replenishment / product display / merchandising",
        "Regalbetreuung / Warenpräsentation / Merchandising",
        "Schapbeheer / productpresentatie / merchandising",
        "Réassort / présentation / merchandising",
        "Doplňování / prezentace zboží / merchandising",
        "棚補充・商品陳列・マーチャンダイジング",
        "Riiuliteenindus / kaubaesitlus / merchandising",
        "Выкладка / презентация товара / мерчандайзинг",
    )),
    ("produktionsmitarbeiter", T("Production worker", "Produktionsmitarbeiter", "Productiemedewerker", "Ouvrier de production", "Pracovník výroby", "生産作業員", "Tootmistööline", "Работник производства")),
    ("produktionshelfer", T("Production helper", "Produktionshelfer", "Productiehulp", "Aide de production", "Pomocný pracovník výroby", "生産補助", "Tootmisabiline", "Помощник на производстве")),
    ("gabelstaplerfahrer", T("Forklift driver", "Gabelstaplerfahrer", "Heftruckchauffeur", "Cariste", "Řidič vysokozdvižného vozíku", "フォークリフト運転者", "Kahveltõstuki juht", "Водитель погрузчика")),
    ("industriemechaniker", T("Industrial mechanic", "Industriemechaniker", "Industriemechanicien", "Mécanicien industriel", "Průmyslový mechanik", "産業機械工", "Tööstusmehaanik", "Промышленный механик")),
    ("zerspanungsmechaniker", T("Cutting machine operator", "Zerspanungsmechaniker", "Verspaningsmonteur", "Opérateur d’usinage", "Obráběč kovů", "切削機械工", "Lõiketöötlusmehaanik", "Станочник")),
    ("lagerhelfer", T("Warehouse helper", "Lagerhelfer", "Magazijnhulp", "Aide magasinier", "Pomocný skladník", "倉庫補助", "Laoabiline", "Помощник на складе")),
    ("lagermitarbeiter", T("Warehouse worker", "Lagermitarbeiter", "Magazijnmedewerker", "Magasinier", "Skladník", "倉庫作業員", "Laotööline", "Кладовщик")),
    ("lagerarbeiter", T("Warehouse labourer", "Lagerarbeiter", "Magazijnwerker", "Ouvrier d’entrepôt", "Skladový dělník", "倉庫作業者", "Laotööline", "Складской рабочий")),
    ("maschinenbediener", T("Machine operator", "Maschinenbediener", "Machinebediener", "Opérateur machine", "Obsluha stroje", "機械オペレーター", "Masinaoperaator", "Оператор станка")),
    ("pflegefachkraft", T("Qualified nurse", "Pflegefachkraft", "Verpleegkundige", "Infirmier diplômé", "Zdravotní sestra", "看護師", "Õde", "Медсестра")),
    ("reinigungskraft", T("Cleaner", "Reinigungskraft", "Schoonmaker", "Agent d’entretien", "Uklízeč", "清掃員", "Koristaja", "Уборщик")),
    ("kommissionierer", T("Order picker", "Kommissionierer", "Orderpicker", "Préparateur de commandes", "Komisionář", "ピッキング担当", "Komisjonär", "Комплектовщик")),
    ("staplerfahrer", T("Forklift driver", "Staplerfahrer", "Heftruckchauffeur", "Cariste", "Řidič vysokozdvižného vozíku", "フォークリフト運転者", "Kahveltõstuki juht", "Водитель погрузчика")),
    ("productiemedewerker", T("Production worker", "Produktionsmitarbeiter", "Productiemedewerker", "Ouvrier de production", "Pracovník výroby", "生産作業員", "Tootmistööline", "Работник производства")),
    ("procesoperator", T("Process operator", "Prozessoperator", "Procesoperator", "Opérateur de process", "Procesní operátor", "プロセスオペレーター", "Protsessioperaator", "Оператор процесса")),
    ("marktleiter", T("Store manager", "Marktleiter", "Winkelmanager", "Directeur de magasin", "Vedoucí prodejny", "店長", "Kaupluse juhataja", "Управляющий магазином")),
    ("filialleiter", T("Branch manager", "Filialleiter", "Filiaalmanager", "Directeur de succursale", "Vedoucí pobočky", "支店長", "Filiaali juhataja", "Управляющий филиалом")),
    ("elektroniker", T("Electronics technician", "Elektroniker", "Elektronicus", "Électronicien", "Elektronik", "電子技術者", "Elektroonikatehnik", "Электронщик")),
    ("elektriker", T("Electrician", "Elektriker", "Elektricien", "Électricien", "Elektrikář", "電気技師", "Elektrik", "Электрик")),
    ("schweißer", T("Welder", "Schweißer", "Lasser", "Soudeur", "Svářeč", "溶接工", "Keevitaja", "Сварщик")),
    ("schweisser", T("Welder", "Schweißer", "Lasser", "Soudeur", "Svářeč", "溶接工", "Keevitaja", "Сварщик")),
    ("schlosser", T("Metalworker", "Schlosser", "Slotenmaker / metaalbewerker", "Serrurier", "Zámečník", "金工", "Lukksepp", "Слесарь")),
    ("verkäufer", T("Sales assistant", "Verkäufer", "Verkoopmedewerker", "Vendeur", "Prodavač", "販売員", "Müüja", "Продавец")),
    ("kassierer", T("Cashier", "Kassierer", "Kassamedewerker", "Caissier", "Pokladní", "レジ係", "Kassiir", "Кассир")),
    ("kassiertätigkeit", T("cashier duties", "Kassiertätigkeit", "kassawerk", "caisse", "pokladna", "レジ業務", "kassatöö", "работа на кассе")),
    ("aushilfe", T("Temporary help", "Aushilfe", "Hulpkracht", "Aide temporaire", "Výpomoc", "補助員", "Abiline", "Подсобный работник")),
    ("operator", T("Operator", "Operator", "Operator", "Opérateur", "Operátor", "オペレーター", "Operaator", "Оператор")),
    ("software engineer", T("Software Engineer", "Software Engineer", "Software Engineer", "Ingénieur logiciel", "Software Engineer", "ソフトウェアエンジニア", "Tarkvarainsener", "Инженер-программист")),
    ("technology lead", T("Technology Lead", "Technology Lead", "Technology Lead", "Responsable technique", "Technology Lead", "テクノロジーリード", "Tehnoloogiajuht", "Технический руководитель")),
    ("teilzeit", T("part-time", "Teilzeit", "deeltijd", "temps partiel", "částečný úvazek", "パートタイム", "osaline tööaeg", "частичная занятость")),
    ("vollzeit", T("full-time", "Vollzeit", "voltijd", "temps plein", "plný úvazek", "フルタイム", "täistööaeg", "полная занятость")),
    ("minijob", T("mini-job", "Minijob", "minibaantje", "mini-job", "miniúvazek", "ミニジョブ", "minitöö", "мини-работа")),
    ("geringfügig", T("marginal employment", "geringfügig", "geringfügig", "emploi mineur", "malý úvazek", "短時間雇用", "väike koormus", "неполная занятость")),
    ("lkw-fahrer", T("HGV driver", "LKW-Fahrer", "Vrachtwagenchauffeur", "Chauffeur poids lourd", "Řidič nákladního vozu", "トラック運転手", "Veokijuht", "Водитель грузовика")),
    ("kraftfahrer", T("Professional driver", "Kraftfahrer", "Beroepschauffeur", "Chauffeur professionnel", "Řidič z povolání", "プロ運転手", "Kutselise autojuht", "Профессиональный водитель")),
    ("pflegehilf", T("Nursing assistant", "Pflegehilfe", "Zorghulp", "Aide-soignant", "Ošetřovatelský asistent", "看護助手", "Hooldusabiline", "Младший медперсонал")),
    ("altenpflege", T("Elderly care", "Altenpflege", "Ouderenzorg", "Soins aux personnes âgées", "Péče o seniory", "高齢者介護", "Eakate hooldus", "Уход за пожилыми")),
    ("krankenschwester", T("Nurse", "Krankenschwester", "Verpleegkundige", "Infirmière", "Zdravotní sestra", "看護師", "Õde", "Медсестра")),
    ("erzieher", T("Educator", "Erzieher", "Pedagoog", "Éducateur", "Vychovatel", "保育者", "Kasvataja", "Воспитатель")),
    ("koch", T("Cook", "Koch", "Kok", "Cuisinier", "Kuchař", "調理師", "Kokk", "Повар")),
    ("kellner", T("Waiter", "Kellner", "Ober", "Serveur", "Číšník", "ウェイター", "Kelner", "Официант")),
    ("servicekraft", T("Service staff", "Servicekraft", "Bediening", "Personnel de service", "Obsluha", "接客スタッフ", "Teenindaja", "Обслуживающий персонал")),
    ("sicherheitsmitarbeiter", T("Security officer", "Sicherheitsmitarbeiter", "Beveiliger", "Agent de sécurité", "Bezpečnostní pracovník", "警備員", "Turvatöötaja", "Сотрудник охраны")),
    ("security", T("Security", "Security", "Security", "Sécurité", "Security", "セキュリティ", "Turvalisus", "Охрана")),
    ("bauhelfer", T("Construction helper", "Bauhelfer", "Bouwhulp", "Aide chantier", "Stavební pomocník", "建設補助", "Ehitusabiline", "Подсобный на стройке")),
    ("maurer", T("Bricklayer", "Maurer", "Metselaar", "Maçon", "Zedník", "レンガ工", "Müürsepp", "Каменщик")),
    ("elektronikentwickler", T("Electronics developer", "Elektronikentwickler", "Elektronica-ontwikkelaar", "Développeur électronique", "Vývojář elektroniky", "電子開発者", "Elektroonikaarendaja", "Разработчик электроники")),
    ("mechatroniker", T("Mechatronics technician", "Mechatroniker", "Mechatronicus", "Technicien mécatronique", "Mechatronik", "メカトロニクス技術者", "Mehhhatroonik", "Мехатроник")),
    ("anlagenmechaniker", T("Plant mechanic", "Anlagenmechaniker", "Installatiemonteur", "Mécanicien d’installations", "Mechanik zařízení", "設備機械工", "Seadme mehaanik", "Механик установок")),
    ("kfz-mechatroniker", T("Motor vehicle mechatronics technician", "Kfz-Mechatroniker", "Autotechnicus mechatronica", "Technicien auto mécatronique", "Automechanik-mechatronik", "自動車メカトロニクス", "Sõiduki mehhatroonik", "Автомехатроник")),
    ("it-systemadministrator", T("IT system administrator", "IT-Systemadministrator", "IT-systeembeheerder", "Administrateur système", "Správce IT systémů", "ITシステム管理者", "IT-süsteemiadministraator", "Системный администратор")),
    ("werkstudent", T("Working student", "Werkstudent", "Werkstudent", "Étudiant salarié", "Pracující student", "ワーキングスチューデント", "Töötav üliõpilane", "Работающий студент")),
    ("praktikum", T("Internship", "Praktikum", "Stage", "Stage", "Stáž", "インターン", "Praktika", "Стажировка")),
    ("azubi", T("Apprentice", "Azubi", "Stagiair BBL", "Apprenti", "Učeň", "見習い", "Õpipoiss", "Ученик")),
    ("auszubildende", T("Apprentice", "Auszubildende", "Stagiair", "Apprenti", "Učeň", "見習い", "Õpipoiss", "Ученик")),
    ("projektleiter", T("Project manager", "Projektleiter", "Projectleider", "Chef de projet", "Projektový manažer", "プロジェクトマネージャー", "Projektijuht", "Руководитель проекта")),
    ("teamleiter", T("Team leader", "Teamleiter", "Teamleider", "Chef d’équipe", "Vedoucí týmu", "チームリーダー", "Meeskonnajuht", "Руководитель команды")),
    ("schichtleiter", T("Shift supervisor", "Schichtleiter", "Ploegleider", "Chef d’équipe de poste", "Vedoucí směny", "シフトリーダー", "Vahetuse juht", "Начальник смены")),
    ("disponent", T("Dispatcher", "Disponent", "Planner", "Dispatcheur", "Dispečer", "ディスパッチャー", "Dispetšer", "Диспетчер")),
    ("buchhalter", T("Accountant", "Buchhalter", "Boekhouder", "Comptable", "Účetní", "会計士", "Raamatupidaja", "Бухгалтер")),
    ("sachbearbeiter", T("Clerk", "Sachbearbeiter", "Medewerker", "Gestionnaire", "Referent", "事務担当", "Spetsialist", "Специалист")),
    ("kundenberater", T("Customer advisor", "Kundenberater", "Klantadviseur", "Conseiller client", "Poradce zákazníků", "顧客アドバイザー", "Kliendinõustaja", "Клиентский консультант")),
    ("callcenter", T("Call centre", "Callcenter", "Callcenter", "Centre d’appels", "Call centrum", "コールセンター", "Kõnekeskus", "Колл-центр")),
    ("fahrer", T("Driver", "Fahrer", "Chauffeur", "Chauffeur", "Řidič", "運転手", "Juht", "Водитель")),
    ("helfer", T("Helper", "Helfer", "Hulp", "Aide", "Pomocník", "補助", "Abiline", "Помощник")),
    ("mitarbeiter", T("Employee", "Mitarbeiter", "Medewerker", "Collaborateur", "Pracovník", "従業員", "Töötaja", "Сотрудник")),
    ("fachkraft", T("Specialist", "Fachkraft", "Vak Specialist", "Spécialiste", "Odborník", "専門職", "Spetsialist", "Специалист")),
    ("magazijnmedewerker", T("Warehouse worker", "Lagermitarbeiter", "Magazijnmedewerker", "Magasinier", "Skladník", "倉庫作業員", "Laotööline", "Кладовщик")),
    ("verkoopmedewerker", T("Sales assistant", "Verkäufer", "Verkoopmedewerker", "Vendeur", "Prodavač", "販売員", "Müüja", "Продавец")),
    ("schoonmaker", T("Cleaner", "Reinigungskraft", "Schoonmaker", "Agent d’entretien", "Uklízeč", "清掃員", "Koristaja", "Уборщик")),
    ("vrachtwagenchauffeur", T("HGV driver", "LKW-Fahrer", "Vrachtwagenchauffeur", "Chauffeur poids lourd", "Řidič kamionu", "トラック運転手", "Veokijuht", "Водитель грузовика")),
    ("heftruck", T("forklift", "Gabelstapler", "heftruck", "chariot élévateur", "vysokozdvižný vozík", "フォークリフト", "kahveltõstuk", "погрузчик")),
    ("kuchař", T("Cook", "Koch", "Kok", "Cuisinier", "Kuchař", "調理師", "Kokk", "Повар")),
    ("dělník", T("Labourer", "Arbeiter", "Arbeider", "Ouvrier", "Dělník", "作業員", "Tööline", "Рабочий")),
    ("skladník", T("Warehouse worker", "Lagermitarbeiter", "Magazijnmedewerker", "Magasinier", "Skladník", "倉庫作業員", "Laotööline", "Кладовщик")),
    ("řidič", T("Driver", "Fahrer", "Chauffeur", "Chauffeur", "Řidič", "運転手", "Juht", "Водитель")),
    ("uklízeč", T("Cleaner", "Reinigungskraft", "Schoonmaker", "Agent d’entretien", "Uklízeč", "清掃員", "Koristaja", "Уборщик")),
    ("prodavač", T("Sales assistant", "Verkäufer", "Verkoopmedewerker", "Vendeur", "Prodavač", "販売員", "Müüja", "Продавец")),
    ("obsluha strojů", T("Machine operator", "Maschinenbediener", "Machinebediener", "Opérateur machine", "Obsluha strojů", "機械オペレーター", "Masinaoperaator", "Оператор станков")),
    ("pomocný", T("assistant", "Hilfs-", "hulp", "aide", "pomocný", "補助", "abi", "помощник")),
    ("einzelhandel", T("retail", "Einzelhandel", "detailhandel", "commerce de détail", "maloobchod", "小売", "jaekaubandus", "розничная торговля")),
    ("logistik", T("logistics", "Logistik", "logistiek", "logistique", "logistika", "物流", "logistika", "логистика")),
    ("produktion", T("production", "Produktion", "productie", "production", "výroba", "生産", "tootmine", "производство")),
    ("remote", T("remote", "Remote", "remote", "à distance", "remote", "リモート", "kaugtöö", "удалённо")),
    ("senior", T("Senior", "Senior", "Senior", "Senior", "Senior", "シニア", "Vanem", "Senior")),
    ("junior", T("Junior", "Junior", "Junior", "Junior", "Junior", "ジュニア", "Noorem", "Junior")),
    ("werkstudent", T("Working student", "Werkstudent", "Werkstudent", "Étudiant salarié", "Pracující student", "ワーキングスチューデント", "Töötav üliõpilane", "Работающий студент")),
]

PHRASES_SORTED = sorted(PHRASES, key=lambda x: len(x[0]), reverse=True)

WOCHEN = T(
    "{n}-hour part-time",
    "Teilzeit {n} Wochenstunden",
    "deeltijd {n} uur per week",
    "temps partiel {n} h/semaine",
    "částečný úvazek {n} hodin týdně",
    "週{n}時間パート",
    "{n} tundi nädalas osaline tööaeg",
    "частичная занятость {n} ч/нед.",
)


def strip_gender(title: str) -> str:
    s = GENDER_RE.sub(" ", title or "")
    s = GENDER_BARE.sub(" ", s)
    s = SPACE_RE.sub(" ", s).strip(" -/|")
    return s


def leftover_words(stripped_lower: str) -> list[str]:
    s = stripped_lower
    s = WOCHEN_RE.sub(" ", s)
    for exact in EXACT:
        s = s.replace(exact, " ")
    for phrase, _ in PHRASES_SORTED:
        s = s.replace(phrase, " ")
    s = re.sub(r"[0-9]+", " ", s)
    s = re.sub(r"[^a-zA-ZÀ-žäöüßáéíóúýčďěňřšťžů]+", " ", s)
    stop = {
        "auf", "und", "fur", "für", "im", "in", "mit", "der", "die", "das", "den",
        "the", "and", "or", "von", "van", "de", "des", "dem", "am", "zum", "zur",
        "a", "an", "of", "for", "to", "en", "et", "la", "le", "el",
    }
    out = []
    for w in s.split():
        wl = w.lower()
        if len(wl) <= 2 or wl in stop or wl in BRANDS:
            continue
        if w.isupper():
            continue
        out.append(wl)
    return out


def apply_glossary(title: str, locale: str) -> tuple[str, str, bool]:
    stripped = strip_gender(title)
    key = stripped.lower()
    if key in EXACT:
        return EXACT[key][locale], "glossary", True
    covered = len(leftover_words(key)) == 0
    out = stripped
    used = False
    m = WOCHEN_RE.search(out)
    if m:
        out = WOCHEN_RE.sub(WOCHEN[locale].format(n=m.group(1)), out)
        used = True
    for phrase, trans in PHRASES_SORTED:
        if phrase in out.lower():
            out = re.sub(re.escape(phrase), trans[locale], out, flags=re.I)
            used = True
    out = SPACE_RE.sub(" ", out).strip(" -/|")
    if covered and used:
        return out, "glossary", True
    if used:
        return out, "partial", False
    return stripped, "none", False


def detect_lang(title: str) -> str:
    if re.search(r"[ěščřžýáíéůúďťňĚŠČŘŽÝÁÍÉ]", title):
        return "cs"
    if re.search(r"[А-Яа-яЁё]", title):
        return "ru"
    if re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", title):
        return "ja"
    low = title.lower()
    if "(m/w/d)" in low or re.search(r"[äöüß]", low) or re.search(
        r"\b(mitarbeiter|fachkraft|helfer|fahrer|verkäufer|verkaeufer|kraft|leiter)\b", low
    ):
        return "de"
    if re.search(r"(medewerker|vacature|procesoperator|productie|magazijn|schoonmaak|heftruck)", low):
        return "nl"
    if re.search(r"\b(ouvrier|vendeur|ingénieur|temps partiel)\b", low):
        return "fr"
    return "en"
