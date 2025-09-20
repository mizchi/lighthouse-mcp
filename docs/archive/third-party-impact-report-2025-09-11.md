# Third-Party Script Impact Report

Generated: 2025-09-11T12:30:34.208Z

## Executive Summary

| Site | Third-Party Count | Total Blocking (ms) | Performance Score | Unused Code (KB) |
|------|-------------------|---------------------|-------------------|------------------|
| ニコニコ動画 (nicovideo.jp) | 36 | 5224 | 27 | 1785 |
| Goal.com | 91 | 5675 | 32 | 1521 |

---

## ニコニコ動画 (nicovideo.jp)

URL: https://www.nicovideo.jp/

### 🎯 Third-Party Impact

**Summary:**
- Total Entities: 36
- Total Blocking Time: 5224ms
- Total Main Thread Time: 9750ms
- Total Transfer Size: 3403KB

**Top 10 Heaviest Scripts:**

| Rank | Entity | Blocking (ms) | Main Thread (ms) | Transfer (KB) | Scripts | Impact |
|------|--------|---------------|------------------|---------------|---------|--------|
| 1 | Google/Doubleclick Ads | 2074 | 3534 | 435 | 48 | 🔴 Critical |
| 2 | Google Tag Manager | 1991 | 3183 | 1776 | 15 | 🔴 Critical |
| 3 | Amazon Ads | 517 | 808 | 90 | 5 | 🟠 High |
| 4 | Rubicon Project | 459 | 932 | 193 | 11 | 🟡 Medium |
| 5 | Twitter Online Conversion Tracking | 119 | 169 | 21 | 7 | 🟢 Low |
| 6 | logly.co.jp | 22 | 92 | 46 | 6 | 🟢 Low |
| 7 | AudienceSearch | 20 | 86 | 4 | 2 | 🟢 Low |
| 8 | AMP | 16 | 570 | 104 | 5 | 🟢 Low |
| 9 | i-mobile | 4 | 89 | 35 | 5 | 🟢 Low |
| 10 | nimg.jp | 3 | 109 | 217 | 4 | 🟢 Low |

**Blocking Time Distribution:**
- 🔴 Critical (>1000ms): 2 scripts
- 🟠 High (500-1000ms): 1 scripts
- 🟡 Medium (250-500ms): 1 scripts
- 🟢 Low (<250ms): 32 scripts

**Detailed Script Breakdown (Top 3):**

<details>
<summary>1. Google/Doubleclick Ads (2074ms blocking)</summary>

| URL | Blocking (ms) | Transfer (KB) |
|-----|---------------|---------------|
| https://securepubads.g.doubleclick.net/pagead/managed/js/... | 1814 | 184 |
| https://pagead2.googlesyndication.com/pagead/managed/js/a... | 248 | 68 |
| https://securepubads.g.doubleclick.net/tag/js/gpt.js | 12 | 34 |
| https://securepubads.g.doubleclick.net/static/topics/topi... | 0 | 28 |
| https://securepubads.g.doubleclick.net/pagead/managed/dic... | 0 | 23 |

*... and 43 more scripts*

</details>

<details>
<summary>2. Google Tag Manager (1991ms blocking)</summary>

| URL | Blocking (ms) | Transfer (KB) |
|-----|---------------|---------------|
| https://www.googletagmanager.com/gtm.js?id=GTM-KXT7G5G&l=... | 805 | 146 |
| https://www.googletagmanager.com/gtag/js?id=G-5LM4HED1NJ&... | 298 | 158 |
| https://www.googletagmanager.com/gtm.js?id=GTM-PN8LFCT&l=... | 136 | 140 |
| https://www.googletagmanager.com/gtag/js?id=G-JEES3LFYV7&... | 134 | 139 |
| https://www.googletagmanager.com/gtag/destination?id=AW-5... | 90 | 123 |

*... and 10 more scripts*

</details>

<details>
<summary>3. Amazon Ads (517ms blocking)</summary>

| URL | Blocking (ms) | Transfer (KB) |
|-----|---------------|---------------|
| https://c.amazon-adsystem.com/aax2/apstag.js | 517 | 84 |
| https://c.amazon-adsystem.com/bao-csm/aps-comm/aps_csm.js | 0 | 3 |
| https://aax.amazon-adsystem.com/e/dtb/bid | 0 | 1 |
| https://c.amazon-adsystem.com/cdn/prod/config?src=3496&u=... | 0 | 1 |
| https://config.aps.amazon-adsystem.com/configs/3496 | 0 | 1 |

</details>

### 📈 Performance Metrics

**Core Web Vitals:**
- LCP: 7158ms
- FCP: 2815ms
- CLS: 0.14287605247966648
- TBT: 5473ms
- TTI: 37276ms

**Top Performance Problems:**
1. 🔴 Sum of all time periods between FCP and Time to Interactive, when task length exceeded 50ms, expressed in milliseconds. [Learn more about the Total Blocking Time metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time/). (performance)
2. 🔴 Keep the server response time for the main document short because all other requests depend on it. [Learn more about the Time to First Byte metric](https://developer.chrome.com/docs/lighthouse/performance/time-to-first-byte/). (network)
3. 🔴 Time to Interactive is the amount of time it takes for the page to become fully interactive. [Learn more about the Time to Interactive metric](https://developer.chrome.com/docs/lighthouse/performance/interactive/). (performance)
4. 🔴 Redirects introduce additional delays before the page can be loaded. [Learn how to avoid page redirects](https://developer.chrome.com/docs/lighthouse/performance/redirects/). (performance)
5. 🔴 Third-party cookies may be blocked in some contexts. [Learn more about preparing for third-party cookie restrictions](https://privacysandbox.google.com/cookies/prepare/overview). (performance)

### 🗑️ Unused Code

**Summary:**
- Total Wasted: 1785KB
- Files with Unused Code: 33

**Top Unused Code by File:**

| File | Wasted (KB) | Wasted % | Total (KB) | Type |
|------|-------------|----------|------------|------|
| ...e/SiteWide.css?752f9b9df5a35d735d8b5b8155197b2c | 112 | 98.16366066236083% | 114 | css |
| ...js/gpt/m202509040101/pubads_impl.js?cb=31094556 | 98 | 53.10419016164546% | 184 | js |
| ...js/gpt/m202509040101/pubads_impl.js?cb=31094556 | 96 | 52.21305918049514% | 184 | js |
| ...js/gpt/m202509040101/pubads_impl.js?cb=31094556 | 91 | 49.628443692605124% | 184 | js |
| ...r.com/gtag/js?id=AW-561674311&cx=c&gtm=4e59a0h2 | 90 | 73.09749957485245% | 123 | js |
| ...js/gpt/m202509040101/pubads_impl.js?cb=31094556 | 89 | 48.40586568927555% | 184 | js |
| ....com/prebid/dynamic/14490.js?key1=spnicovideojp | 64 | 36.60613242088166% | 176 | js |
| ...ource/js/chunks/643.cf06af6700e3a7c47d29.min.js | 63 | 43.869081913078375% | 144 | js |
| ...LFCT&l=NicoGoogleTagManagerDataLayer&gtm=4e5991 | 61 | 43.80151703236603% | 140 | js |
| ...l=NicoGoogleTagManagerDataLayer&cx=c&gtm=4e5991 | 59 | 37.405741486957446% | 158 | js |

---

## Goal.com

URL: https://www.goal.com/

### 🎯 Third-Party Impact

**Summary:**
- Total Entities: 91
- Total Blocking Time: 5675ms
- Total Main Thread Time: 14908ms
- Total Transfer Size: 7545KB

**Top 10 Heaviest Scripts:**

| Rank | Entity | Blocking (ms) | Main Thread (ms) | Transfer (KB) | Scripts | Impact |
|------|--------|---------------|------------------|---------------|---------|--------|
| 1 | Tealium | 1865 | 2636 | 389 | 12 | 🔴 Critical |
| 2 | Amazon Ads | 1153 | 1750 | 204 | 20 | 🔴 Critical |
| 3 | Google/Doubleclick Ads | 463 | 1043 | 598 | 64 | 🟡 Medium |
| 4 | lngtdv.com | 440 | 1629 | 246 | 2 | 🟡 Medium |
| 5 | Google Tag Manager | 423 | 826 | 405 | 4 | 🟡 Medium |
| 6 | Chartbeat | 317 | 436 | 27 | 4 | 🟡 Medium |
| 7 | LiveRamp IdentityLink | 255 | 1229 | 37 | 2 | 🟡 Medium |
| 8 | Spot.IM | 240 | 3255 | 808 | 52 | 🟢 Low |
| 9 | TikTok | 209 | 304 | 130 | 5 | 🟢 Low |
| 10 | trackonomics.net | 199 | 416 | 40 | 1 | 🟢 Low |

**Blocking Time Distribution:**
- 🔴 Critical (>1000ms): 2 scripts
- 🟠 High (500-1000ms): 0 scripts
- 🟡 Medium (250-500ms): 5 scripts
- 🟢 Low (<250ms): 84 scripts

**Detailed Script Breakdown (Top 3):**

<details>
<summary>1. Tealium (1865ms blocking)</summary>

| URL | Blocking (ms) | Transfer (KB) |
|-----|---------------|---------------|
| https://player.aniview.com/script/6.1/AVmanager.js?v=1.0&... | 1219 | 167 |
| https://player.aniview.com/script/6.1/libs/prebid/avpb9.3... | 472 | 125 |
| https://player.aniview.com/script/6.1/player.js?v=1&type=... | 174 | 17 |
| https://player.aniview.com/script/6.1/libs/prebid/avpb9.3... | 0 | 47 |
| https://player.aniview.com/script/6.1/libs/prebid/avpb9.3... | 0 | 20 |

*... and 7 more scripts*

</details>

<details>
<summary>2. Amazon Ads (1153ms blocking)</summary>

| URL | Blocking (ms) | Transfer (KB) |
|-----|---------------|---------------|
| https://client.aps.amazon-adsystem.com/publisher.js | 1084 | 84 |
| https://c.amazon-adsystem.com/aax2/apstag.js | 69 | 84 |
| https://aax.amazon-adsystem.com/e/dtb/bid | 0 | 14 |
| https://c.amazon-adsystem.com/cdn/prod/config?src=600&u=h... | 0 | 5 |
| https://c.amazon-adsystem.com/cdn/prod/config?src=5065&u=... | 0 | 3 |

*... and 15 more scripts*

</details>

<details>
<summary>3. Google/Doubleclick Ads (463ms blocking)</summary>

| URL | Blocking (ms) | Transfer (KB) |
|-----|---------------|---------------|
| https://securepubads.g.doubleclick.net/pagead/managed/js/... | 451 | 184 |
| https://securepubads.g.doubleclick.net/tag/js/gpt.js | 12 | 34 |
| https://pagead2.googlesyndication.com/pagead/managed/js/a... | 0 | 68 |
| https://s0.2mdn.net/dfp/2006810/5039156867/1651157465759/... | 0 | 64 |
| https://pagead2.googlesyndication.com/pagead/managed/js/a... | 0 | 47 |

*... and 59 more scripts*

</details>

### 📈 Performance Metrics

**Core Web Vitals:**
- LCP: 7515ms
- FCP: 2686ms
- CLS: 0.006940022797571506
- TBT: 6312ms
- TTI: 66045ms

**Top Performance Problems:**
1. 🔴 Speed Index shows how quickly the contents of a page are visibly populated. [Learn more about the Speed Index metric](https://developer.chrome.com/docs/lighthouse/performance/speed-index/). (performance)
2. 🔴 Sum of all time periods between FCP and Time to Interactive, when task length exceeded 50ms, expressed in milliseconds. [Learn more about the Total Blocking Time metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time/). (performance)
3. 🔴 The maximum potential First Input Delay that your users could experience is the duration of the longest task. [Learn more about the Maximum Potential First Input Delay metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-max-potential-fid/). (performance)
4. 🔴 Errors logged to the console indicate unresolved problems. They can come from network request failures and other browser concerns. [Learn more about this errors in console diagnostic audit](https://developer.chrome.com/docs/lighthouse/best-practices/errors-in-console/) (performance)
5. 🔴 Time to Interactive is the amount of time it takes for the page to become fully interactive. [Learn more about the Time to Interactive metric](https://developer.chrome.com/docs/lighthouse/performance/interactive/). (performance)

### 🗑️ Unused Code

**Summary:**
- Total Wasted: 1521KB
- Files with Unused Code: 32

**Top Unused Code by File:**

| File | Wasted (KB) | Wasted % | Total (KB) | Type |
|------|-------------|----------|------------|------|
| ...er.js?v=1.0&type=s&pid=5e0e296628a061270b21ccab | 89 | 53.5977848631162% | 166 | js |
| ...ead/managed/js/gpt/m202509040101/pubads_impl.js | 87 | 47.2838126309006% | 184 | js |
| ...ead/managed/js/gpt/m202509040101/pubads_impl.js | 84 | 45.68195854143172% | 184 | js |
| ....com/prebid/goal/prebid9.53.2.1754007205.min.js | 82 | 46.88024932871427% | 175 | js |
| ...tic/chunks/default~86d09fb1-d7f2767f9d2edd77.js | 82 | 99.9793306946312% | 82 | js |
| ...fed8cb9d4c465c48158c/hbp_master_270443_18583.js | 75 | 59.1144193795221% | 126 | js |
| https://accounts.google.com/gsi/client | 74 | 84.12657619193686% | 88 | js |
| ...niview.com/script/6.1/libs/prebid/avpb9.33.0.js | 70 | 56.116820866165426% | 125 | js |
| https://auth.goal.com/__/auth/iframe.js | 55 | 61.30073369931819% | 90 | js |
| ...alc(3 * var(--launcher--global-font-size-level… | 55 | 100% | 55 | css |

---

## 📋 Recommendations

### ニコニコ動画 (nicovideo.jp)

**Critical Actions Required:**
- 🔴 **Google/Doubleclick Ads**: 2074ms blocking
  - Consider lazy loading or removing if not essential
  - Investigate async/defer loading options
- 🔴 **Google Tag Manager**: 1991ms blocking
  - Consider lazy loading or removing if not essential
  - Investigate async/defer loading options

**High Priority Optimizations:**
- 🟠 **Amazon Ads**: 517ms blocking

**Code Optimization:**
- Remove or tree-shake 1785KB of unused code
- Focus on files with >50% unused code

### Goal.com

**Critical Actions Required:**
- 🔴 **Tealium**: 1865ms blocking
  - Consider lazy loading or removing if not essential
  - Investigate async/defer loading options
- 🔴 **Amazon Ads**: 1153ms blocking
  - Consider lazy loading or removing if not essential
  - Investigate async/defer loading options

**Code Optimization:**
- Remove or tree-shake 1521KB of unused code
- Focus on files with >50% unused code

## 🔧 Technical Analysis

### Script Loading Patterns

**ニコニコ動画 (nicovideo.jp):**
- Google/Analytics: 5 entities, 4065ms blocking, 2493KB
- Amazon/Ads: 1 entities, 517ms blocking, 90KB
- Other: 29 entities, 642ms blocking, 809KB
- Advertising: 1 entities, 0ms blocking, 12KB

**Goal.com:**
- Other: 75 entities, 3618ms blocking, 5833KB
- Amazon/Ads: 1 entities, 1153ms blocking, 204KB
- Google/Analytics: 5 entities, 885ms blocking, 1358KB
- Facebook/Social: 1 entities, 18ms blocking, 110KB
- Advertising: 7 entities, 0ms blocking, 35KB
- Tag Management: 2 entities, 0ms blocking, 5KB


## 📊 Methodology

This report analyzes:
1. **Third-party scripts**: External JavaScript and resources loaded from different domains
2. **Blocking time**: Time the main thread is blocked by script execution
3. **Transfer size**: Network bytes transferred for each script
4. **Unused code**: JavaScript and CSS bytes that are downloaded but never executed

Impact levels:
- 🔴 **Critical**: >1000ms blocking time - Severe performance impact
- 🟠 **High**: 500-1000ms - Significant impact
- 🟡 **Medium**: 250-500ms - Noticeable impact
- 🟢 **Low**: <250ms - Minor impact
