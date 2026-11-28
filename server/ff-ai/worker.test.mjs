// node server/ff-ai/worker.test.mjs  (할당량 계산 시험. 네트워크·D1 없이 순수 함수만 봐요)
import { config, daysLeft, pool, share, plan, verdict } from './worker.js';
let ok = 0, bad = 0; const t = (n, c) => { if (c) ok++; else { bad++; console.log('FAIL', n); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const c = config({}), D = 1e6;
const S = (o) => Object.assign({ day: '2026-11-15', before: 0, today: 0, anonToday: 0, nu: 0, na: 0 }, o);

// 기본값은 예전 한도와 같아요 ($3/day, $90/month)
t('defaults', c.dayMax === 3 * D && c.month === 90 * D);
// 남은 날 / 달 바뀜
t('days nov 1', daysLeft('2026-11-01') === 30); t('days nov 30', daysLeft('2026-11-30') === 1); t('days feb leap', daysLeft('2028-02-01') === 29); t('days dec 31', daysLeft('2026-12-31') === 1);
// 월초: 90/30 = 3 -> 하루 상한 3에 걸려요. 중순에 덜 썼으면 자동 이월
t('pool day1', near(pool(c, 0, '2026-11-01'), 3 * D));
t('pool carry', near(pool(c, 60 * D, '2026-11-16'), 2 * D) && pool(c, 75 * D, '2026-11-16') < pool(c, 60 * D, '2026-11-16'));
t('pool cap', pool(c, 0, '2026-11-15') === 3 * D);   // 90/16 = 5.6 이지만 하루 상한 3
t('pool overspent', pool(c, 95 * D, '2026-11-20') === 0);
t('rollover', near(pool(c, 0, '2026-12-01'), 90 * D / 31));   // 12월 1일: 이번 달 지출 0부터 다시
// 한 사람 몫
const us = (n) => share(c, 3 * D, n, 1);
t('one user max', us(1) === c.userMax);                       // 혼자면 상한 0.30
t('ten users', near(us(10), 0.3 * D));
t('thirty users', near(us(30), 0.1 * D));
t('floor', us(1000) === c.floor);                              // 아무리 많아도 0.02는 보장
t('anon quarter', near(share(c, 3 * D, 40, 0.25), 3 * D * 0.25 / 40) && share(c, 3 * D, 1, 0.25) === c.userMax * 0.25);
t('no money no share', share(c, 0, 5, 1) === 0);
// plan: 나 말고 로그인 9명 + 비로그인 4명 (가중치 9 + 1 + 나 1 = 11)
let p = plan(c, S({ nu: 9, na: 4 }), 0);
t('plan sumW', near(p.sumW, 11) && near(p.share, Math.min(0.3 * D, 3 * D / 11)));
t('plan anon share smaller', plan(c, S({ nu: 9, na: 4 }), 1).share < p.share);
// 갑자기 사용자가 100명 몰려도 오늘 전체는 몫의 1.25배를 못 넘어요
p = plan(c, S({ nu: 100, today: 3.7 * D }), 0);
t('surge room', near(p.room, 0.05 * D));
t('surge blocks', verdict(c, p, { n: 1, micro: 0 }, 0, 0) === null && verdict(c, plan(c, S({ nu: 100, today: 3.75 * D }), 0), { n: 1, micro: 0 }, 0, 0) === 'budget');
// 크레딧 거의 없음: 한 달 남은 돈이 1달러, 월말까지 10일
p = plan(c, S({ day: '2026-11-21', before: 89 * D }), 0);
t('low credit pool', near(p.P, 0.1 * D) && p.share <= 0.1 * D);
t('credit gone', verdict(c, plan(c, S({ before: 90 * D }), 0), { n: 1, micro: 0 }, 0, 0) === 'budget');
t('month limit even if day ok', plan(c, S({ day: '2026-11-30', before: 89.5 * D, today: 0.4 * D }), 0).room <= 0.1 * D + 1);
// 개인 상한 / 요청 횟수 / IP / 비로그인 합계
p = plan(c, S({ nu: 9 }), 0);
t('personal full', verdict(c, p, { n: 3, micro: p.share }, 0, 0) === 'day' && verdict(c, p, { n: 3, micro: p.share - 1 }, 0, 0) === null);
t('request cap', verdict(c, p, { n: 401, micro: 0 }, 0, 0) === 'day' && verdict(c, plan(c, S(), 1), { n: 101, micro: 0 }, 1, 0) === 'day');
t('ip cap', verdict(c, p, { n: 1, micro: 0 }, 0, c.ipMax) === 'day');
// IP를 많이 만들어도 비로그인 전체는 오늘 몫의 30%까지만
p = plan(c, S({ na: 500, anonToday: 0.9 * D }), 1);
t('anon pool full', near(p.anonRoom, 0) && verdict(c, p, { n: 1, micro: 0 }, 1, 0) === 'day');
t('anon pool does not block users', verdict(c, plan(c, S({ na: 500, anonToday: 0.9 * D }), 0), { n: 1, micro: 0 }, 0, 0) === null);
// 계정을 마구 만들어 몫을 늘려도(나눔 분모가 커져도) 최소 보장 아래로는 안 내려가고, 오늘 전체 상한이 막아요
t('sybil dilution floor', plan(c, S({ nu: 5000 }), 0).share === c.floor);
// 환경 변수로 조절
const c2 = config({ DAILY_USD: '5', USER_MAX_USD: '1', ANON_WEIGHT: '0.5', SURGE: '0.5', MONTH_USD: 'x' });
t('env', c2.dayMax === 5 * D && c2.userMax === D && c2.anonW === 0.5 && c2.surge === 1 && c2.month === 90 * D);
console.log(bad ? bad + ' failed' : 'ok ' + ok); process.exit(bad ? 1 : 0);
