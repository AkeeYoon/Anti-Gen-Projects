// --- 전역 게임 데이터 구조 --- //
const TIERS = [
    { id: 1, name: "김대리", icon: "👨‍💼", reqCp: 0, theme: "tier-1" },
    { id: 2, name: "과장님", icon: "🤵", reqCp: 150, theme: "tier-2" },
    { id: 3, name: "부장님", icon: "🕵️‍♂️", reqCp: 1000, theme: "tier-3" },
    { id: 4, name: "대표/건물주", icon: "👑", reqCp: 5000, theme: "tier-4" }
];

const state = {
    realLife: {
        playerName: 'Player' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
        stage: 1, // 1~4
        rank: TIERS[0].name,
        fund: 1000,
        wifeAnger: 0,
        maxWifeAnger: 100,
        washCount: 5 // 무료 설거지 횟수
    },
    inGame: {
        level: 1,
        exp: 0,
        maxExp: 100,
        currentHp: 100,
        maxHp: 100,
        upgradeCount: 1,
        healCount: 1,
        adena: 0,
        baseDmg: 10, baseDef: 0,
        equipment: { weapon: 0, armor: 0, accessory: 0 },
        mileage: { weapon: 0, armor: 0, accessory: 0 }, // 강화 전용 마일리지 (천장 스택)
        monsterHpFixed: 100,
        currentMonsterHp: 100
    },
    coin: {
        price: 500,
        amount: 0,
        avgPrice: 0, // 평균 매수 단가
        history: [], // 추후 차트용
        trendText: "── 횡보 중 ──",
        trendColor: "#cbd5e1"
    },
    system: {
        isPlaying: false,
        gameLoop: null,
        baseTickRate: 1000,
        gameSpeed: 1, // 1, 2, 3 배속
        currentTickRate: 1000,
        soulshot: false, // 정령탄 시스템
        lastTickTime: 0, // 마지막 틱 시간
        tickInterval: 1000, // 기본 틱 간격
        lastWashRechargeTime: Date.now() // 설거지 쿨타임 기준 시간
    }
};

const getCost = {
    upgrade: () => Math.floor(50 * Math.pow(1.5, state.inGame.upgradeCount - 1)),
    heal: () => Math.floor(50 * Math.pow(1.2, state.inGame.healCount - 1)),
    weapon: () => Math.floor(1000 * Math.pow(1.8, state.inGame.equipment.weapon)),
    armor: () => Math.floor(800 * Math.pow(1.7, state.inGame.equipment.armor)),
    accessory: () => Math.floor(500 * Math.pow(1.4, state.inGame.equipment.accessory))
};

const getEnhanceRate = {
    weapon: () => {
        const lvl = state.inGame.equipment.weapon;
        if (lvl < 3) return 1.0; // +3까지 100% 안전강화
        if (state.inGame.mileage.weapon >= 5) return 1.0; // 천장(마일리지 5)
        return Math.max(0.05, 0.90 - ((lvl - 3) * 0.05)); // 90%부터 서서히 감소
    },
    armor: () => {
        const lvl = state.inGame.equipment.armor;
        if (lvl < 3) return 1.0;
        if (state.inGame.mileage.armor >= 5) return 1.0; // 천장
        return Math.max(0.05, 0.90 - ((lvl - 3) * 0.05));
    },
    accessory: () => {
        const lvl = state.inGame.equipment.accessory;
        if (lvl < 2) return 1.0; // +2까지 100%
        if (state.inGame.mileage.accessory >= 5) return 1.0; // 천장
        return Math.max(0.1, 0.95 - ((lvl - 2) * 0.05)); // 캐시템은 방어선과 확률이 1강 더 유리함
    }
};

// --- 게임 로직 --- //
function triggerHitEffect(isSoulshotFired = false) {
    if (!els.monster) return;
    els.monster.classList.remove('hit-anim', 'soulshot-hit');
    // 배속이 높을 땐 브라우저 최적화를 위해 약간의 딜레이를 주어 리플로우 트리거
    setTimeout(() => {
        if (!els.monster) return;
        els.monster.classList.add('hit-anim');
        if (isSoulshotFired) els.monster.classList.add('soulshot-hit');

        // 애니메이션(0.2s)이 끝나면 클래스를 제거해주지 않으면 잔상이 영구적으로 남음
        setTimeout(() => {
            if (els.monster) els.monster.classList.remove('hit-anim', 'soulshot-hit');
        }, 200);
    }, 10);
}

// --- DOM 캐싱 --- //
const els = {
    playerName: document.getElementById('player-name'),
    logContainer: document.getElementById('log-container'),
    fund: document.getElementById('stat-fund'),
    wifeAnger: document.getElementById('stat-anger-fill'),
    level: document.getElementById('stat-level'),
    expFill: document.getElementById('stat-exp-fill'),
    expText: document.getElementById('stat-exp-text'),
    adena: document.getElementById('stat-adena'),
    cp: document.getElementById('stat-cp'),
    rank: document.getElementById('stat-rank'),
    character: document.getElementById('character-sprite'),
    monsterHpFill: document.getElementById('monster-hp-fill'),

    wpnTier: document.getElementById('stat-wpn-tier'),
    armTier: document.getElementById('stat-arm-tier'),
    accTier: document.getElementById('stat-acc-tier'),
    playerHpFill: document.getElementById('player-hp-fill'),
    playerHpText: document.getElementById('player-hp-text'),
    statWpnBonus: document.getElementById('stat-wpn-bonus'),
    statArmBonus: document.getElementById('stat-arm-bonus'),
    statAccBonus: document.getElementById('stat-acc-bonus'),
    nextWpnBonus: document.getElementById('next-stat-wpn'),
    nextArmBonus: document.getElementById('next-stat-arm'),
    nextAccBonus: document.getElementById('next-stat-acc'),
    monster: document.getElementById('monster-sprite'),

    costUpg: document.getElementById('cost-upg'),
    costWpn: document.getElementById('cost-wpn'),
    costArm: document.getElementById('cost-arm'),
    costAcc: document.getElementById('cost-acc'),
    rateWpn: document.getElementById('rate-wpn'),
    rateArm: document.getElementById('rate-arm'),
    rateAcc: document.getElementById('rate-acc'),

    targetCp: document.getElementById('stat-target-cp'),
    monsterHpText: document.getElementById('monster-hp-text'),
    peaceMenu: document.getElementById('peace-menu'),
    btnPeace1: document.getElementById('btn-peace-1'),
    btnPeace2: document.getElementById('btn-peace-2'),
    btnPeace3: document.getElementById('btn-peace-3'),

    btnSpeed: document.getElementById('btn-speed'),
    btnSoulshot: document.getElementById('btn-soulshot'),
    btnFarm: document.getElementById('btn-farm'),
    btnHeal: document.getElementById('btn-heal'),
    btnUpgrade: document.getElementById('btn-upgrade'),
    btnPromote: document.getElementById('btn-promote'),
    btnWpn: document.getElementById('btn-enhance-wpn'),
    btnArm: document.getElementById('btn-enhance-arm'),
    btnAcc: document.getElementById('btn-cash-acc'),
    costHeal: document.getElementById('cost-heal'),

    gameContainer: document.getElementById('game-container'),
    crtOverlay: document.getElementById('crt-overlay'),

    // 모달 DOM 캐싱
    midPanel: document.getElementById('mid-panel'),
    rankBadge: document.getElementById('stat-rank'),
    washCountText: document.getElementById('wash-count'),
    modalOverlay: document.getElementById('modal-overlay'),
    rankModal: document.getElementById('rank-modal'),
    adModal: document.getElementById('ad-modal'),
    btnClassRank: document.getElementById('btn-close-rank'),
    btnClassAd: document.getElementById('btn-close-ad'),
    btnWatchAd: document.getElementById('btn-watch-ad'),
    adTimer: document.getElementById('ad-timer'),
    adActions: document.getElementById('ad-actions'),
    visualView: document.getElementById('visual-view'),

    // 환전소 모달 DOM
    btnOpenExchange: document.getElementById('btn-open-exchange'),
    exchangeModal: document.getElementById('exchange-modal'),
    btnCloseExchange: document.getElementById('btn-close-exchange'),
    exchangeCurrentFund: document.getElementById('exchange-current-fund'),
    btnExch1: document.getElementById('btn-exch-1'),
    btnExch2: document.getElementById('btn-exch-2'),
    btnExchAll: document.getElementById('btn-exch-all'),

    // 코인 투기장 DOM
    btnOpenCoin: document.getElementById('btn-open-coin'),
    coinModal: document.getElementById('coin-modal'),
    btnCloseCoin: document.getElementById('btn-close-coin'),
    coinPriceDisplay: document.getElementById('coin-price-display'),
    coinTrendText: document.getElementById('coin-trend-text'),
    coinMyAdena: document.getElementById('coin-my-adena'),
    coinMyAmount: document.getElementById('coin-my-amount'),
    coinAvgPrice: document.getElementById('coin-avg-price'),
    coinProfitRate: document.getElementById('coin-profit-rate'),
    btnCoinBuy: document.getElementById('btn-coin-buy'),
    btnCoinSell: document.getElementById('btn-coin-sell'),

    // 돌발 업무(퀘스트) DOM
    questModal: document.getElementById('quest-modal'),
    questDesc: document.getElementById('quest-desc'),
    questOptions: document.getElementById('quest-options'),
    btnQuestSkip: document.getElementById('btn-quest-skip')
};


// --- 핵심 유틸 함수 --- //
function formatNumber(num) {
    if (num >= 100000) return (num / 10000).toFixed(1) + '만';
    return num.toLocaleString();
}

function addLog(msg, type = 'sys') {
    const p = document.createElement('div');
    p.className = `log-entry ${type}`;
    p.innerHTML = msg; // allow basic html
    els.logContainer.appendChild(p);
    if (els.logContainer.children.length > 60) els.logContainer.removeChild(els.logContainer.firstChild);
    els.logContainer.scrollTop = els.logContainer.scrollHeight;
}

const getEquipStat = {
    weapon: (lvl) => {
        let dmg = 0, nextDmg = 0;
        for (let i = 1; i <= lvl + 1; i++) {
            let add = 8 + (i - 1) * 3; // 8, 11, 14, 17... (강화할수록 커짐)
            if (i <= lvl) dmg += add;
            if (i === lvl + 1) nextDmg = add;
        }
        return { dmg, def: 0, nextDmg, nextDef: 0 };
    },
    armor: (lvl) => {
        let def = 0, nextDef = 0;
        for (let i = 1; i <= lvl + 1; i++) {
            let add = 5 + (i - 1) * 2; // 5, 7, 9, 11...
            if (i <= lvl) def += add;
            if (i === lvl + 1) nextDef = add;
        }
        return { dmg: 0, def, nextDmg: 0, nextDef };
    },
    accessory: (lvl) => {
        let dmg = 0, def = 0, nextDmg = 0, nextDef = 0;
        for (let i = 1; i <= lvl + 1; i++) {
            let addDmg = 15 + (i - 1) * 5; // 15, 20, 25, 30...
            let addDef = 5 + (i - 1) * 2;
            if (i <= lvl) { dmg += addDmg; def += addDef; }
            if (i === lvl + 1) { nextDmg = addDmg; nextDef = addDef; }
        }
        return { dmg, def, nextDmg, nextDef };
    }
};

function getTotalStats() {
    const wStats = getEquipStat.weapon(state.inGame.equipment.weapon);
    const aStats = getEquipStat.armor(state.inGame.equipment.armor);
    const cStats = getEquipStat.accessory(state.inGame.equipment.accessory);

    const totalDmg = state.inGame.baseDmg + wStats.dmg + aStats.dmg + cStats.dmg;
    const totalDef = state.inGame.baseDef + wStats.def + aStats.def + cStats.def;

    // 전투력 공식 간소화
    const cp = totalDmg * 2 + totalDef + state.inGame.level * 5;
    return { totalDmg, totalDef, cp };
}

function checkPromotionAvailable(cp) {
    const nextTier = TIERS[state.realLife.stage]; // index = stage (since 1-based)
    if (nextTier) {
        els.targetCp.innerText = `(승진목표: ${formatNumber(nextTier.reqCp)})`;
        if (cp >= nextTier.reqCp) {
            els.btnUpgrade.style.display = 'none';
            els.btnPromote.style.display = 'flex';
            els.btnPromote.innerHTML = `<span class="btn-icon">🌟</span> <b>[승진] ${nextTier.name}</b>`;
            return true;
        } else {
            els.btnUpgrade.style.display = 'flex';
            els.btnPromote.style.display = 'none';
            return false;
        }
    } else {
        els.targetCp.innerText = `(최고 직급)`;
        els.btnUpgrade.style.display = 'flex';
        els.btnPromote.style.display = 'none';
        return false;
    }
}

function updateUI() {
    const stats = getTotalStats();

    if (els.playerName) els.playerName.innerText = state.realLife.playerName;

    // Stats Update
    els.fund.innerText = formatNumber(state.realLife.fund);
    els.level.innerText = state.inGame.level;
    els.adena.innerText = formatNumber(state.inGame.adena);
    els.cp.innerText = formatNumber(stats.cp);
    els.rank.innerText = `직급: ${state.realLife.rank}`;

    // Exp Bar Update
    const expPerc = Math.min(100, (state.inGame.exp / state.inGame.maxExp) * 100);
    if (els.expFill) els.expFill.style.width = `${expPerc}%`;
    if (els.expText) els.expText.innerText = `${expPerc.toFixed(1)}%`;

    // Equip Tier Update
    els.wpnTier.innerText = `+${state.inGame.equipment.weapon}`;
    els.armTier.innerText = `+${state.inGame.equipment.armor}`;
    els.accTier.innerText = `+${state.inGame.equipment.accessory}`;

    const w = getEquipStat.weapon(state.inGame.equipment.weapon);
    const a = getEquipStat.armor(state.inGame.equipment.armor);
    const c = getEquipStat.accessory(state.inGame.equipment.accessory);

    if (els.statWpnBonus) els.statWpnBonus.innerText = `총 +공 ${w.dmg}`;
    if (els.statArmBonus) els.statArmBonus.innerText = `총 +방 ${a.def}`;
    if (els.statAccBonus) els.statAccBonus.innerText = `총 +공${c.dmg}/방${c.def}`;

    if (els.nextWpnBonus) els.nextWpnBonus.innerText = `(성공시 공+${w.nextDmg})`;
    if (els.nextArmBonus) els.nextArmBonus.innerText = `(성공시 방+${a.nextDef})`;
    if (els.nextAccBonus) els.nextAccBonus.innerText = `(성공시 공+${c.nextDmg}/방+${c.nextDef})`;

    // HP / Anger Bars
    const playerHpPerc = Math.min(100, Math.max(0, (state.inGame.currentHp / state.inGame.maxHp) * 100));
    if (els.playerHpFill) els.playerHpFill.style.width = `${playerHpPerc}%`;
    if (els.playerHpText) els.playerHpText.innerText = `${Math.floor(Math.max(0, state.inGame.currentHp))} / ${state.inGame.maxHp}`;

    const angerPerc = Math.min(100, (state.realLife.wifeAnger / state.realLife.maxWifeAnger) * 100);
    els.wifeAnger.style.width = `${angerPerc}%`;
    const hpPerc = Math.max(0, (state.inGame.currentMonsterHp / state.inGame.monsterHpFixed) * 100);
    els.monsterHpFill.style.width = `${hpPerc}%`;
    els.monsterHpText.innerText = `${Math.ceil(Math.max(0, state.inGame.currentMonsterHp))} / ${state.inGame.monsterHpFixed}`;

    // Costs
    els.costUpg.innerText = formatNumber(getCost.upgrade());
    if (els.costHeal) els.costHeal.innerText = formatNumber(getCost.heal());
    els.costWpn.innerText = formatNumber(getCost.weapon());
    els.costArm.innerText = formatNumber(getCost.armor());
    els.costAcc.innerText = formatNumber(getCost.accessory());

    // Rates & Mileage
    const setRateText = (part, el) => {
        if (!el) return;
        const rate = Math.floor(getEnhanceRate[part]() * 100);
        const lvl = state.inGame.equipment[part];
        const isSafeLvl = (part === 'accessory' && lvl < 2) || (part !== 'accessory' && lvl < 3);
        const pity = state.inGame.mileage[part];

        if (isSafeLvl) {
            el.innerHTML = `100% (안전)`;
            el.style.color = '#86efac'; // 연두색
        } else if (pity >= 5) {
            el.innerHTML = `🌟 100% (천장!)`;
            el.style.color = '#fbbf24'; // 골드
        } else {
            el.innerHTML = `${rate}% <span style="font-size:9px; color:#cbd5e1;">(마일리지 ${pity}/5)</span>`;
            el.style.color = (part === 'accessory') ? '#e9d5ff' : '#fca5a5';
        }
    };

    setRateText('weapon', els.rateWpn);
    setRateText('armor', els.rateArm);
    setRateText('accessory', els.rateAcc);

    // Check Promotion
    checkPromotionAvailable(stats.cp);

    // 무료 설거지 횟수
    if (els.washCountText) {
        if (state.realLife.washCount < 5) {
            const remainingMsec = 300000 - (Date.now() - state.system.lastWashRechargeTime);
            const rSec = Math.floor(Math.max(0, remainingMsec) / 1000);
            const m = Math.floor(rSec / 60);
            const s = rSec % 60;
            const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
            els.washCountText.innerHTML = `-10 (${state.realLife.washCount}/5) <span style="color:#fbbf24">${timeStr}</span>`;
        } else {
            els.washCountText.innerHTML = `-10 (5/5)`;
        }

        if (state.realLife.washCount <= 0) {
            els.washCountText.style.color = '#ef4444'; // 빨간색 강조
        } else {
            els.washCountText.style.color = 'inherit';
        }
    }
}

// --- 이펙트 기능 독립 --- //
function showFloatingDamage(dmg, isCrit) {
    const floatEl = document.createElement('div');
    floatEl.className = 'floating-dmg' + (isCrit ? ' crit' : '');
    floatEl.innerText = dmg;

    // 몬스터 위치 부근에 생성 (중앙 살짝 윗부분)
    floatEl.style.left = '50%';
    floatEl.style.top = '20%';

    els.visualView.appendChild(floatEl);

    // 애니메이션 끝난 후 제거 (0.8s)
    setTimeout(() => {
        if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
    }, 800);
}

// 강화/레벨업 시각 이펙트 (전체 화면 흔들림 방지 -> 비주얼 뷰만 흔들림)
function doEnhanceEffect(type, callback) {
    const flashClass = type === 'success' || type === 'promo' ? 'flash-success' : (type === 'fail' ? 'flash-fail' : 'flash-effect');
    const shakeClass = type === 'success' || type === 'promo' ? 'crt-effect' : 'crt-effect-fail';

    // 비주얼 뷰 전체가 아닌 캐릭터 스프라이트만 흔들리도록 적용
    if (els.character) els.character.classList.add(shakeClass);
    els.crtOverlay.classList.add(flashClass);

    setTimeout(() => {
        if (els.character) els.character.classList.remove('crt-effect', 'crt-effect-fail');
        els.crtOverlay.classList.remove('flash-effect', 'flash-success', 'flash-fail');
        if (callback) callback();
    }, 450);
}

function killMonster() {
    const dropAdena = Math.floor(Math.random() * 30 * state.realLife.stage) + 15 * state.inGame.level;
    state.inGame.adena += dropAdena;

    // 경험치 획득 (스테이지/레벨에 비례)
    const dropExp = Math.floor(20 * state.realLife.stage + Math.random() * 10 + (state.inGame.level * 2));
    state.inGame.exp += dropExp;

    addLog(`<b>[처치]</b> 💰 ${formatNumber(dropAdena)} 아데나 / ✨ ${dropExp} EXP 획득!`, 'adena');

    // 레벨업 로직
    if (state.inGame.exp >= state.inGame.maxExp) {
        state.inGame.exp -= state.inGame.maxExp;
        state.inGame.level += 1;
        state.inGame.maxExp = Math.floor(state.inGame.maxExp * 1.5);
        state.inGame.baseDmg += 5; // 레벨업 기본능력치 보너스
        state.inGame.baseDef += 3;
        state.inGame.maxHp += 20; // 최대 체력 증가
        state.inGame.currentHp = state.inGame.maxHp; // 풀피 회복
        addLog(`🎉 <b>레벨 업!</b> Lv.${state.inGame.level} 달성! (체력 100% 회복)`, 'promo');

        // 레벨업 하이라이트 효과 (흰색)
        if (els.character) {
            els.character.classList.add('level-up-anim');
            setTimeout(() => els.character.classList.remove('level-up-anim'), 800);
        }

        doEnhanceEffect('success');
    }

    // 몬스터 체력 리셋 (레벨/티어에 비례하여 강해짐)
    state.inGame.monsterHpFixed = 100 + (state.inGame.level * 20) * state.realLife.stage;
    state.inGame.currentMonsterHp = state.inGame.monsterHpFixed;

    // 간혹 비자금 획득
    if (Math.random() < 0.25) {
        const bonusFund = 200 * state.realLife.stage;
        state.realLife.fund += bonusFund;
        addLog(`👔 뜻밖의 꽁돈! 비자금 ${bonusFund}원 증가.`, 'talk');
    }
}

function gameTick() {
    // 자동 사냥 턴 지연 처리
    if (Date.now() - state.system.lastTickTime < state.system.tickInterval / state.system.gameSpeed) return;
    state.system.lastTickTime = Date.now();

    // 코인 시세 변동 로직 (10틱당 1번 꼴로 크게 변동)
    if (Math.random() < 0.1) {
        updateCoinPrice();
    }

    // 돌발 퀘스트 발생 로직 (틱당 2% 확률, 사냥 중에만)
    if (state.system.isPlaying && Math.random() < 0.02 && els.questModal.style.display !== 'block') {
        triggerRandomQuest();
    }

    const stats = getTotalStats();
    let dmgDealt = stats.totalDmg;
    let isSoulshotFired = false;

    // 정령탄 로직 (타격 전 소모)
    if (state.system.soulshot) {
        // 정령탄 소모 비율 대폭 상승 (적자가 나도록 유도)
        const dmgRatio = Math.floor(stats.totalDmg / 2.5);
        const soulCost = 15 + dmgRatio + (state.realLife.stage * 15); // 크게 증가
        if (state.inGame.adena >= soulCost) {
            state.inGame.adena -= soulCost;
            dmgDealt = Math.floor(dmgDealt * 1.8); // 1.8배 데미지
            isSoulshotFired = true;
        } else {
            // 아데나가 부족하면 정령탄 자동 해제
            state.system.soulshot = false;
            els.btnSoulshot.innerHTML = `<span style="font-size:12px; color:#94a3b8;">정령탄</span><br>OFF`;
            els.btnSoulshot.classList.remove('btn-soulshot-on');
            addLog(`❌ 아데나가 부족하여 정령탄이 <b style="color:red">자동 해제</b> 되었습니다.`, 'sys');
        }
    }

    triggerHitEffect(isSoulshotFired);

    // 몬스터 피격 하이라이트 (빨간색)
    if (els.monster) {
        els.monster.classList.add('hit-anim-monster');
        setTimeout(() => els.monster.classList.remove('hit-anim-monster'), 150);
    }

    // 치명타 로직
    const isCrit = Math.random() < 0.25;
    if (isCrit) {
        dmgDealt = Math.floor(dmgDealt * 1.5);
    }

    state.inGame.currentMonsterHp -= dmgDealt;
    showFloatingDamage(dmgDealt, isCrit); // 데미지 시각화

    if (state.inGame.currentMonsterHp <= 0) {
        killMonster();
    } else {
        if (isCrit) addLog(`💥 크리티컬! ${dmgDealt} DMG`, 'dmg');
        else if (isSoulshotFired) addLog(`✨ 정령탄 일격! ${dmgDealt} 데미지를 입혔습니다.`, 'sys');
        else if (Math.random() > 0.6) addLog(`⚔️ ${dmgDealt} 데미지를 입혔습니다.`, 'sys');
    }

    // 몬스터의 반격 (플레이어 피격 로직)
    if (state.inGame.currentMonsterHp > 0 && Math.random() < 0.35) {
        const monsterAtk = 5 + (state.inGame.level * 2) * state.realLife.stage;
        const actualDmg = Math.max(1, monsterAtk - stats.totalDef); // 방어력으로 데미지 경감 (최소 1)
        state.inGame.currentHp -= actualDmg;

        if (els.character) {
            els.character.classList.add('hit-anim');
            setTimeout(() => els.character.classList.remove('hit-anim'), 200);
        }

        if (Math.random() > 0.7) addLog(`🩸 몬스터의 공격! ${actualDmg}의 피해를 입었습니다. (방어결과)`, 'fail');
    }

    // 아내 분노 상승 이벤트
    if (Math.random() < 0.1) {
        state.realLife.wifeAnger += 10;
        addLog(`💢 아내의 매서운 눈초리... (분노 +10)`, 'talk');

        if (state.realLife.wifeAnger >= state.realLife.maxWifeAnger) {
            const wifeDmg = Math.floor(state.inGame.maxHp * 0.5);
            state.inGame.currentHp -= wifeDmg;
            addLog(`<b>!!! 등짝 스매싱 작렬 !!!</b><br>(비자금 50% 소실, HP 50% 피해 및 강제 휴식)`, 'sys');
            state.realLife.fund = Math.floor(state.realLife.fund * 0.5);
            state.realLife.wifeAnger = 0;
            toggleAutoPlay();

            // 시각적 피드백 (캐릭터만 흔들림)
            if (els.character) {
                els.character.classList.add('crt-effect-fail');
                setTimeout(() => els.character.classList.remove('crt-effect-fail'), 600);
            }
        }
    }

    // 플레이어 사망(과로사) 체크
    if (state.inGame.currentHp <= 0) {
        handlePlayerDeath();
    } else {
        updateUI();
    }
}

function handlePlayerDeath() {
    state.inGame.currentHp = Math.floor(state.inGame.maxHp * 0.1); // 10%의 체력으로 부활
    const lostExp = Math.floor(state.inGame.exp * 0.2);
    state.inGame.exp = Math.max(0, state.inGame.exp - lostExp);

    addLog(`💀 <b>[과로사 / 게임오버]</b> 쓰러졌습니다! (경험치 ${lostExp} 감소 및 사냥 강제 종료)`, 'enhance-fail');
    if (state.system.isPlaying) toggleAutoPlay();
    updateUI();
}

// --- 조작 이벤트 --- //
function startLoop() {
    if (state.system.gameLoop) clearInterval(state.system.gameLoop);
    state.system.currentTickRate = Math.floor(state.system.baseTickRate / state.system.gameSpeed);
    state.system.gameLoop = setInterval(gameTick, state.system.currentTickRate);
}

function toggleAutoPlay() {
    state.system.isPlaying = !state.system.isPlaying;
    els.btnFarm.classList.toggle('btn-danger', state.system.isPlaying);

    if (state.system.isPlaying) {
        els.btnSpeed.style.display = 'flex';
        els.btnSpeed.innerText = `⚡ ${state.system.gameSpeed}x`;
        els.btnFarm.innerHTML = `<span class="btn-icon">🛑</span> <span class="btn-text">눈치보며 끄기</span>`;
        els.peaceMenu.style.display = 'none';

        // 사냥 중일 때 로깅창 확대
        els.midPanel.classList.add('hunting');

        let speedMsg = state.system.gameSpeed === 1 ? "" : ` (${state.system.gameSpeed}배속)`;
        addLog(`▶️ 몰래 폰을 켜 사냥을 시작합니다.${speedMsg}`, "sys");
        startLoop();
    } else {
        els.btnSpeed.style.display = 'none';
        els.btnFarm.innerHTML = `<span class="btn-icon">⚔️</span> <span class="btn-text">몰래 사냥 시작</span>`;
        els.peaceMenu.style.display = 'grid';

        // 사냥 중지 시 로깅창 복구
        els.midPanel.classList.remove('hunting');

        addLog("⏸️ 화면을 끕니다. 처세술 메뉴가 활성화되었습니다.", "guide");
        clearInterval(state.system.gameLoop);
    }
}

els.btnSpeed.addEventListener('click', () => {
    state.system.gameSpeed = state.system.gameSpeed >= 3 ? 1 : state.system.gameSpeed + 1;
    els.btnSpeed.innerText = `⚡ ${state.system.gameSpeed}x`;
    addLog(`⚡ 사냥 속도가 ${state.system.gameSpeed}배속으로 변경되었습니다.`, "sys");
    if (state.system.isPlaying) startLoop();
});

if (els.btnSoulshot) els.btnSoulshot.addEventListener('click', () => {
    state.system.soulshot = !state.system.soulshot;
    if (state.system.soulshot) {
        els.btnSoulshot.innerHTML = `<span style="font-size:12px; color:#fff;">정령탄</span><br><b style="color:#fff;">ON</b>`;
        els.btnSoulshot.classList.add('btn-soulshot-on');
        addLog(`✨ 정령탄이 <b style="color:#38bdf8;">활성화</b>되었습니다. (타격 시 아데나 소모, 데미지 상승)`, 'sys');
    } else {
        els.btnSoulshot.innerHTML = `<span style="font-size:12px; color:#94a3b8;">정령탄</span><br>OFF`;
        els.btnSoulshot.classList.remove('btn-soulshot-on');
        addLog(`✨ 정령탄을 <b style="color:#94a3b8;">비활성화</b>합니다.`, 'sys');
    }
});

els.btnFarm.addEventListener('click', toggleAutoPlay);

// --- 처세술 & 광고 모달 로직 --- //
function showModal(modalEl) {
    els.modalOverlay.style.display = 'flex';
    modalEl.style.display = 'block';
}

function hideModal() {
    els.modalOverlay.style.display = 'none';
    els.rankModal.style.display = 'none';
    els.adModal.style.display = 'none';
    if (els.exchangeModal) els.exchangeModal.style.display = 'none';
    if (els.coinModal) els.coinModal.style.display = 'none';
    if (els.questModal) els.questModal.style.display = 'none';
}

function updateCoinModalUI() {
    if (!els.coinModal) return;
    els.coinPriceDisplay.innerText = formatNumber(state.coin.price) + " A";
    els.coinTrendText.innerText = state.coin.trendText;
    els.coinTrendText.style.color = state.coin.trendColor;

    els.coinMyAdena.innerText = formatNumber(state.inGame.adena) + " A";
    els.coinMyAmount.innerText = formatNumber(state.coin.amount) + "개";

    if (els.coinAvgPrice && els.coinProfitRate) {
        if (state.coin.amount > 0) {
            els.coinAvgPrice.innerText = formatNumber(state.coin.avgPrice) + " A";
            const profitRate = ((state.coin.price - state.coin.avgPrice) / state.coin.avgPrice) * 100;

            els.coinProfitRate.innerText = (profitRate > 0 ? "+" : "") + profitRate.toFixed(2) + "%";
            if (profitRate > 0) {
                els.coinProfitRate.style.color = "#f43f5e"; // 빨간색 (수익)
            } else if (profitRate < 0) {
                els.coinProfitRate.style.color = "#3b82f6"; // 파란색 (손실)
            } else {
                els.coinProfitRate.style.color = "#94a3b8";
            }
        } else {
            els.coinAvgPrice.innerText = "0 A";
            els.coinProfitRate.innerText = "0.00%";
            els.coinProfitRate.style.color = "#94a3b8";
        }
    }
}

if (els.rankBadge) els.rankBadge.addEventListener('click', () => { showModal(els.rankModal); });
if (els.btnOpenExchange) els.btnOpenExchange.addEventListener('click', () => {
    if (els.exchangeCurrentFund) els.exchangeCurrentFund.innerText = formatNumber(state.realLife.fund);
    showModal(els.exchangeModal);
});
if (els.btnOpenCoin) els.btnOpenCoin.addEventListener('click', () => {
    updateCoinModalUI();
    showModal(els.coinModal);
});

if (els.btnClassRank) els.btnClassRank.addEventListener('click', hideModal);
if (els.btnClassAd) els.btnClassAd.addEventListener('click', hideModal);
if (els.btnCloseExchange) els.btnCloseExchange.addEventListener('click', hideModal);
if (els.btnCloseCoin) els.btnCloseCoin.addEventListener('click', hideModal);

let adTimerInterval = null;
if (els.btnWatchAd) els.btnWatchAd.addEventListener('click', () => {
    // 광고 시청 가짜 로직 구동 (5초 타이머)
    let timeLeft = 5;
    els.adActions.style.display = 'none';
    els.adTimer.style.display = 'block';
    els.adTimer.innerText = timeLeft;

    adTimerInterval = setInterval(() => {
        timeLeft--;
        els.adTimer.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(adTimerInterval);
            state.realLife.washCount = 5; // 충전
            updateUI();
            addLog(`📺 보상 획득! 무료 설거지 기회가 5회로 충전되었습니다.`, 'success');
            hideModal();
            // 뷰 초기화
            els.adActions.style.display = 'flex';
            els.adTimer.style.display = 'none';
        }
    }, 1000);
});

// 환전 로직
function exchangeFundToAdena(fundAmount) {
    if (state.realLife.fund >= fundAmount) {
        state.realLife.fund -= fundAmount;
        const addAdena = fundAmount * 10;
        state.inGame.adena += addAdena;
        addLog(`🏦 불법 세탁 완료: ${formatNumber(fundAmount)} 비자금을 ${formatNumber(addAdena)} 아데나로 교환했습니다.`, 'talk');
        updateUI();
        if (els.exchangeCurrentFund) els.exchangeCurrentFund.innerText = formatNumber(state.realLife.fund);
    } else {
        addLog(`❌ 비자금이 부족합니다.`, 'sys');
    }
}

if (els.btnExch1) els.btnExch1.addEventListener('click', () => exchangeFundToAdena(1000));
if (els.btnExch2) els.btnExch2.addEventListener('click', () => exchangeFundToAdena(5000));
if (els.btnExchAll) els.btnExchAll.addEventListener('click', () => {
    if (state.realLife.fund > 0) {
        exchangeFundToAdena(state.realLife.fund);
    } else {
        addLog(`❌ 환전할 비자금이 없습니다.`, 'sys');
    }
});

// 코인 등락 로직
function updateCoinPrice() {
    const oldPrice = state.coin.price;
    // -30% ~ +40% 랜덤 등락
    const fluctuation = (Math.random() * 0.7) - 0.3;
    let newPrice = Math.floor(oldPrice * (1 + fluctuation));

    // 최소 가격 보장
    if (newPrice < 50) newPrice = 50;

    state.coin.price = newPrice;

    if (newPrice > oldPrice) {
        state.coin.trendText = `📈 +${Math.floor((newPrice - oldPrice) / oldPrice * 100)}% (떡상 中!)`;
        state.coin.trendColor = "#ef4444"; // 한국은 상승이 빨간색
    } else if (newPrice < oldPrice) {
        state.coin.trendText = `📉 ${Math.floor((newPrice - oldPrice) / oldPrice * 100)}% (나락 가는 中)`;
        state.coin.trendColor = "#3b82f6"; // 하락이 파란색
    }

    // 모달이 열려있으면 즉시 반영
    if (els.coinModal && els.coinModal.style.display !== 'none') {
        updateCoinModalUI();
    }
}

// 코인 매수
if (els.btnCoinBuy) els.btnCoinBuy.addEventListener('click', () => {
    if (state.inGame.adena >= state.coin.price) {
        const buyAmount = Math.floor(state.inGame.adena / state.coin.price);
        const cost = buyAmount * state.coin.price;

        // 평단가 계산 (물타기)
        const totalValueStr = (state.coin.amount * state.coin.avgPrice) + cost;
        const newTotalAmount = state.coin.amount + buyAmount;
        state.coin.avgPrice = Math.floor(totalValueStr / newTotalAmount);

        state.inGame.adena -= cost;
        state.coin.amount += buyAmount;
        addLog(`📈 L-Coin ${buyAmount}개 풀매수 완료! (평단가: ${formatNumber(state.coin.avgPrice)})`, 'talk');
        updateUI();
        updateCoinModalUI();
    } else {
        addLog(`❌ 매수할 아데나가 부족합니다.`, 'sys');
    }
});

// 코인 매도
if (els.btnCoinSell) els.btnCoinSell.addEventListener('click', () => {
    if (state.coin.amount > 0) {
        const sellAmount = state.coin.amount;
        const totalGet = sellAmount * state.coin.price;
        state.inGame.adena += totalGet;
        state.coin.amount = 0;
        state.coin.avgPrice = 0; // 평단가 초기화
        addLog(`📉 L-Coin 풀매도 완료! ${formatNumber(totalGet)} 아데나 회수.`, 'talk');
        updateUI();
        updateCoinModalUI();
    } else {
        addLog(`❌ 매도할 코인이 없습니다.`, 'sys');
    }
});

// --- 코인 관련 로직 끝 --- //

// --- 돌발 퀘스트 (업무 미션) 로직 --- //
const quests = [
    {
        desc: "🚨 김부장: 어이 김대리! 오늘 회의 자료 폰트 뭘로 했지? 당장 보고해!",
        options: [
            { text: "1. 굴림체", isCorrect: false },
            { text: "2. 맑은 고딕", isCorrect: true },
            { text: "3. 궁서체", isCorrect: false }
        ],
        rewardAdena: 5000
    },
    {
        desc: "🚨 최이사: 자네, 우리 부서 올해 남은 예산이 얼만가?",
        options: [
            { text: "1. 충분합니다!", isCorrect: false },
            { text: "2. 적자입니다!", isCorrect: false },
            { text: "3. 제가 다시 확인하겠습니다.", isCorrect: true }
        ],
        rewardAdena: 8000
    }
];

let currentQuest = null;

function triggerRandomQuest() {
    toggleAutoPlay(); // 사냥 일시정지 (화면 가림 방지)
    currentQuest = quests[Math.floor(Math.random() * quests.length)];

    if (!els.questModal) return;

    els.questDesc.innerText = currentQuest.desc;
    els.questOptions.innerHTML = '';

    currentQuest.options.forEach((opt) => {
        const btn = document.createElement('div');
        btn.className = 'quest-option';
        btn.innerText = opt.text;
        btn.onclick = () => handleQuestAnswer(opt.isCorrect);
        els.questOptions.appendChild(btn);
    });

    addLog(`⚠️ 긴급 업무 지시가 내려왔습니다! (사냥 자동 정지)`, 'sys');
    showModal(els.questModal);
}

function handleQuestAnswer(isCorrect) {
    hideModal();
    if (isCorrect) {
        state.inGame.adena += currentQuest.rewardAdena;
        addLog(`✅ <b>업무 성공!</b> 상여금 ${formatNumber(currentQuest.rewardAdena)} A 획득! 다시 사냥을 시작합니다.`, 'adena');
    } else {
        state.realLife.wifeAnger += 15;
        addLog(`❌ 업무 실수로 혼났습니다. 스트레스(분노)가 증가합니다. (+15)`, 'dmg');
    }
    updateUI();
    toggleAutoPlay(); // 사냥 재개
}

if (els.btnQuestSkip) {
    els.btnQuestSkip.addEventListener('click', () => {
        if (state.realLife.fund >= 500) {
            state.realLife.fund -= 500;
            hideModal();
            state.inGame.adena += currentQuest.rewardAdena;
            addLog(`💸 <b>[자본주의 스킵 완료]</b> 인턴에게 500원을 쥐어주고 일을 넘겼습니다! 보상 ${formatNumber(currentQuest.rewardAdena)} A 획득!`, 'talk');
            updateUI();
            toggleAutoPlay(); // 사냥 재개
        } else {
            addLog(`❌ 비자금이 부족하여 외주를 줄 수 없습니다. 직접 해결하세요.`, 'sys');
        }
    });
}
// --- 퀘스트 로직 끝 --- //

els.btnPeace1.addEventListener('click', () => {
    if (state.realLife.washCount > 0) {
        if (state.realLife.wifeAnger > 0) {
            state.realLife.wifeAnger = Math.max(0, state.realLife.wifeAnger - 10);

            if (state.realLife.washCount === 5) {
                state.system.lastWashRechargeTime = Date.now(); // 첫 소모 시점부터 쿨타임 시작
            }
            state.realLife.washCount -= 1;
            addLog(`🧽 요란한 설거지 소리로 눈치를 덜었습니다! (분노 -10, 남은 횟수: ${state.realLife.washCount})`, 'guide');
            updateUI();
        } else {
            addLog(`가정은 현재 평화롭습니다. (분노 0)`, 'sys');
        }
    } else {
        // 횟수 소진시 광고 모달
        showModal(els.adModal);
    }
});

els.btnPeace2.addEventListener('click', () => {
    if (state.realLife.fund >= 500) {
        state.realLife.fund -= 500;
        state.realLife.wifeAnger = Math.max(0, state.realLife.wifeAnger - 30);
        addLog(`🍗 치킨을 배달시켰습니다! 아내의 안색이 밝아집니다.`, 'guide');
        updateUI();
    } else { addLog(`❌ 비자금이 부족합니다.`, 'sys'); }
});

els.btnPeace3.addEventListener('click', () => {
    if (state.realLife.fund >= 3000) {
        state.realLife.fund -= 3000;
        state.realLife.wifeAnger = 0;
        addLog(`👜 명품백 조공! 아내의 분노수치가 완전히 초기화되었습니다!!`, 'success');
        updateUI();
    } else { addLog(`❌ 비자금이 턱없이 부족합니다.`, 'sys'); }
});

// 회복 물약 구매 (비자금 소모)
if (els.btnHeal) {
    els.btnHeal.addEventListener('click', () => {
        const cost = getCost.heal();
        if (state.realLife.fund >= cost) {
            if (state.inGame.currentHp >= state.inGame.maxHp) {
                addLog(`ℹ️ 이미 체력이 가득 차 있습니다.`, 'sys');
                return;
            }
            state.realLife.fund -= cost;
            state.inGame.healCount += 1;
            const healAmount = Math.floor(state.inGame.maxHp * 0.30);
            state.inGame.currentHp = Math.min(state.inGame.maxHp, state.inGame.currentHp + healAmount);
            addLog(`❤️ <b>[회복 물약]</b> 체력 30% 회복 완료!`, 'guide');
            updateUI();
        } else {
            addLog(`❌ 비자금이 부족합니다.`, 'sys');
        }
    });
}

// 경험치 앰플 구매 (아데나 소모)
els.btnUpgrade.addEventListener('click', () => {
    const cost = getCost.upgrade();
    if (state.inGame.adena >= cost) {
        state.inGame.adena -= cost;
        state.inGame.upgradeCount += 1;

        // 경험치 아이템: 최대 경험치의 35% 만큼 획득
        const expGain = Math.floor(state.inGame.maxExp * 0.35);
        state.inGame.exp += expGain;
        addLog(`💊 <b>[경험치 앰플]</b> ✨ ${expGain} EXP 획득!`, 'sys');

        // 레벨업 체크
        if (state.inGame.exp >= state.inGame.maxExp) {
            state.inGame.exp -= state.inGame.maxExp;
            state.inGame.level += 1;
            state.inGame.maxExp = Math.floor(state.inGame.maxExp * 1.5);
            state.inGame.baseDmg += 5;
            state.inGame.baseDef += 3;
            state.inGame.maxHp += 20;
            state.inGame.currentHp = state.inGame.maxHp; // 풀피
            addLog(`🎉 레벨 업! Lv.${state.inGame.level} 달성! (체력 100% 회복)`, 'promo');
            doEnhanceEffect('success');
        }

        updateUI();
    } else { addLog(`❌ 아데나가 부족합니다.`, 'sys'); }
});

// 승진 시스템 (진화)
els.btnPromote.addEventListener('click', () => {
    const nextTier = TIERS[state.realLife.stage];
    if (nextTier) {
        // 배경 테마 클래스 교체
        const currTheme = TIERS[state.realLife.stage - 1].theme;
        els.gameContainer.classList.remove(currTheme);
        els.gameContainer.classList.add(nextTier.theme);

        state.realLife.stage += 1;
        state.realLife.rank = nextTier.name;
        els.character.innerText = nextTier.icon;

        // 보너스
        state.inGame.baseDmg += 50;
        state.realLife.fund += 5000;

        addLog(`🎉 <b>[승진 축하]</b> <b>${nextTier.name}</b>(으)로 승진했습니다!`, 'promo');
        addLog(`보너스 배정: 기본 전투력 상승 및 상여금 지급!`, 'sys');

        doEnhanceEffect('promo', () => { updateUI(); }); // 승진 эффект
    }
});

function handleEnhance(part, name, currencyType) {
    let cost = getCost[part]();
    let currentFund = currencyType === 'adena' ? state.inGame.adena : state.realLife.fund;

    if (currentFund >= cost) {
        if (currencyType === 'adena') state.inGame.adena -= cost;
        else state.realLife.fund -= cost;

        updateUI();
        addLog(`🔥 [${name}] 강화 시작 (+${state.inGame.equipment[part]} -> +${state.inGame.equipment[part] + 1})`, 'sys');

        // 강화 실행
        const successRate = getEnhanceRate[part]();
        const isSuccess = Math.random() < successRate;

        const lvl = state.inGame.equipment[part];
        const isSafeLvl = (part === 'accessory' && lvl < 2) || (part !== 'accessory' && lvl < 3);
        const isPityBoost = !isSafeLvl && state.inGame.mileage[part] >= 5;

        doEnhanceEffect(isSuccess ? 'success' : 'fail', () => {
            if (isSuccess) {
                state.inGame.equipment[part] += 1;
                if (!isSafeLvl) {
                    if (isPityBoost) {
                        addLog(`🌟 <b>[천장 성공!]</b> 마일리지를 소모하여 +${state.inGame.equipment[part]} 달성!`, 'enhance-success');
                    } else {
                        addLog(`🌟 <b>강화 성공!</b> +${state.inGame.equipment[part]} 달성! (마일리지 초기화)`, 'enhance-success');
                    }
                    state.inGame.mileage[part] = 0; // 마일리지 소모 또는 성공 시 초기화
                } else {
                    addLog(`🌟 <b>[안전 강화]</b> +${state.inGame.equipment[part]} 달성!`, 'enhance-success');
                }
            } else {
                state.inGame.equipment[part] = 0;
                state.inGame.mileage[part] += 1; // 실패 시 마일리지 증가
                let pityMsg = state.inGame.mileage[part] >= 5 ? ` <br><b style="color:#fbbf24;">(천장 게이지 MAX! 다음 위험구간 100%)</b>` : ` (마일리지 ${state.inGame.mileage[part]}/5)`;
                addLog(`💀 강화 실패... 장비가 증발했습니다.${pityMsg}`, 'enhance-fail');

                if (currencyType === 'fund') {
                    state.realLife.wifeAnger += 35;
                    addLog(`😱 카드 내역서를 아내에게 들켰습니다!`, 'talk');
                } else {
                    state.realLife.wifeAnger += 15;
                    addLog(`😱 탄식 소리에 아내가 째려봅니다.`, 'talk');
                }
            }
            updateUI();
        });
    } else {
        addLog(`❌ 재화가 부족합니다.`, 'sys');
    }
}

els.btnWpn.addEventListener('click', () => handleEnhance('weapon', '무기', 'adena'));
els.btnArm.addEventListener('click', () => handleEnhance('armor', '방어구', 'adena'));
els.btnAcc.addEventListener('click', () => handleEnhance('accessory', '캐시 악세', 'fund'));

// 백그라운드 시스템 타이머 (쿨타임 등)
setInterval(() => {
    if (state.realLife.washCount < 5) {
        const now = Date.now();
        const elapsed = now - state.system.lastWashRechargeTime;
        if (elapsed >= 300000) { // 5분 = 300초 = 300,000ms
            state.realLife.washCount += 1;
            state.system.lastWashRechargeTime = now;
            addLog(`🧽 설거지 무료 횟수가 1회 충전되었습니다! (${state.realLife.washCount}/5)`, 'guide');
            updateUI(); // 만땅 시 시간 갱신
        } else {
            updateUI(); // 남은 시간 실시간 렌더링
        }
    } else {
        // 최대치일때는 타이머 갱신 처리를 안함 (사용 시점에 초기화하므로)
    }
}, 1000);

// Init
if (els.playerName) {
    els.playerName.addEventListener('click', () => {
        const newName = prompt('변경할 이름을 입력하세요 (최대 10자):', state.realLife.playerName);
        if (newName && newName.trim().length > 0) {
            state.realLife.playerName = newName.trim().substring(0, 10);
            updateUI();
            addLog(`📝 타이틀이 <b>${state.realLife.playerName}</b>(으)로 변경되었습니다.`, 'sys');
        }
    });
}

updateUI();
