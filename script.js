// 새로고침/뒤로가기 시 스크롤 복원 방지 → 항상 최상단에서 시작
// - beforeunload에서 scrollTo는 브라우저마다 동작이 불안정하고 중복 호출이 생길 수 있어 제거
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// ✅ iOS Safari/모바일 브라우저 주소창(툴바) 높이 변화 대응
// - Estrela Studio 방식: 주소창을 확장된 상태로 유지 (축소 방지)
// - 초기 window.innerHeight를 고정값으로 사용
(function syncVisualViewportVars() {
    const root = document.documentElement;
    let rafId = 0;
    
    // ✅ 초기 높이 고정 (주소창 확장 상태)
    const initialHeight = window.innerHeight;
    let maxTop = 0;
    let maxBottom = 0;

    const update = () => {
        rafId = 0;
        const vv = window.visualViewport;
        if (!vv) {
            // visualViewport 미지원 브라우저: 초기 높이 고정
            root.style.setProperty('--vvh', `${initialHeight}px`);
            return;
        }

        // ✅ 주소창 확장 상태 유지 (Estrela Studio 방식)
        root.style.setProperty('--vvh', `${initialHeight}px`);

        // ✅ HV 구간(히어로~슬로건)에서는 visualViewport 업데이트 중단
        // - 스크롤/백스크롤 시 히어로 콘텐츠 위치가 틀어지는 문제 방지
        // - unlock 후(Structure 이후)에만 업데이트
        const isLocked = !document.body.classList.contains('hv-scroll-unlocked');
        if (isLocked) {
            // HV 구간: 초기값 고정 + max 리셋
            maxTop = 0;
            maxBottom = 0;
            root.style.setProperty('--vv-top', '0px');
            root.style.setProperty('--vv-bottom', '0px');
            root.style.setProperty('--vv-top-max', '0px');
            root.style.setProperty('--vv-bottom-max', '0px');
            return;
        }

        // ✅ Structure 이후: visualViewport 업데이트 재개
        const y = window.pageYOffset || 0;
        const pageTop = (typeof vv.pageTop === 'number') ? vv.pageTop : (y + (vv.offsetTop || 0));

        // ✅ 상단 UI 인셋(px)
        const top = Math.max(0, pageTop - y);
        // ✅ 하단 UI 인셋(px)
        const bottom = Math.max(0, (y + window.innerHeight) - (pageTop + vv.height));

        // ✅ max값 갱신
        if (top > maxTop && top < 100) maxTop = top;
        if (bottom > maxBottom && bottom < 200) maxBottom = bottom;

        root.style.setProperty('--vv-top', `${top}px`);
        root.style.setProperty('--vv-bottom', `${bottom}px`);
        root.style.setProperty('--vv-top-max', `${maxTop}px`);
        root.style.setProperty('--vv-bottom-max', `${maxBottom}px`);
    };

    const schedule = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(update);
    };

    // 초기 1회
    schedule();

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', () => {
        // 회전 시에는 max 리셋
        maxTop = 0;
        maxBottom = 0;
        schedule();
    }, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', schedule);
        window.visualViewport.addEventListener('scroll', schedule);
    }
    
    // ✅ unlock 시점 기록용 전역 함수 (디바운스용, 현재는 사용 안 함)
    window.__vvMarkUnlock = () => {
        // 주소창 확장 유지 방식에서는 불필요
    };
})();

// ✅ 전역 scroll-behavior:smooth가 있어도 "즉시 점프"로 이동
function scrollToInstantGlobal(top) {
    const prevHtml = document.documentElement.style.scrollBehavior;
    const prevBody = document.body.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    // 스타일 적용 즉시 반영(일부 브라우저에서 1프레임 늦게 적용되어 smooth처럼 보이는 현상 방지)
    void document.documentElement.offsetHeight;
    window.scrollTo(0, Math.max(0, top));
    requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = prevHtml;
        document.body.style.scrollBehavior = prevBody;
    });
}

// ✅ 브라우저 새로고침(리로드) 기준의 "히어로 진입 모션"을 재현
function goToHeroWithReloadMotion() {
    scrollToInstantGlobal(0);
    // ✅ 초기화: Structure wrapper를 확실히 숨김 (unlock 클래스 제거)
    document.body.classList.remove('hv-scroll-unlocked');
    // ✅ CSS display:none이 적용되기 전 렌더링 방지: 직접 스타일 설정
    const structureWrapper = document.querySelector('.structure-to-footer-wrapper');
    if (structureWrapper) {
        structureWrapper.style.display = 'none';
    }
    hvCanScrollToStructure = false;
    hvSloganUnlockArmed = false;
    hvSloganUnlockAccPx = 0;
    // ✅ Swiper 풀페이징 사용 시: 히어로 슬라이드로 복귀
    if (USE_HV_SWIPER_PAGING && hvSwiper) {
        hvJumpTo(0);
        applyHvPagerState(0);
    }
    // 탑 이동 직후 히어로 텍스트 모션도 초기화 후 재생(중복 방지)
    requestHeroTextMotionOnce();
}

// =========================================================
// ✅ 히어로~비전: 라이브러리 기반 풀페이징(Swiper)
// - 가장 안전하게 "한 번 스크롤 = 한 페이지" + 백스크롤도 동일하게 처리
// - Structure 이후는 자연 스크롤 유지
// =========================================================
const USE_HV_SWIPER_PAGING = true;
let hvSwiper = null;
let hvMousewheelEnabled = true;
// (정리) 슬로건→Structure는 자연 스크롤로 전환하므로 누적 임계치/엣지락 관련 상수는 제거

// ✅ 슬로건(마지막 슬라이드)에서 구조로 내려갈 수 있는 상태인지
// - false: 슬로건 콘텐츠 유지(페이지 스크롤 락)
// - true: 구조가 슬로건을 덮으며 올라오도록 페이지 스크롤 허용 + Swiper 입력 비활성
let hvCanScrollToStructure = false;
let hvPageScrollLocked = false;
// ✅ iOS pull-to-refresh용: Hero에서 아래로 당기는 동안에는 페이지 락을 걸지 않음
let hvHeroPulling = false;
// ✅ 메뉴 클릭 이동일 때만 타이틀(바텀→탑) 모션을 보여주기 위한 플래그
let hvAnimateTitlesOnce = false;
// ✅ 슬로건(마지막 슬라이드)에서 1번은 "멈춤(락)"을 보장한 뒤, 다음 아래 스크롤에서만 Structure로 unlock
let hvSloganUnlockAccPx = 0;
let hvSloganUnlockArmed = false;

// ✅ HV(히어로/비전/슬로건)에서 Structure 이후(Structure/NFT/Roadmap)로 내려가기 위한 공통 unlock 함수
// - (중요) GNB 클릭 핸들러는 initHvPagerSwiper() 바깥 스코프이므로, 내부 const 함수에 의존하면 클릭이 먹통이 된다.
// - 따라서 "Structure 스크롤 구간 활성화"는 전역 함수로 분리해서 어디서든 호출 가능하게 한다.
function unlockToStructureScroll() {
    // ✅ unlock 상태로 즉시 전환 (이후 스크롤 이벤트가 정상 처리되도록)
    hvCanScrollToStructure = true;
    hvSloganUnlockArmed = false;
    hvSloganUnlockAccPx = 0;

    // ✅ body에 hv-scroll-unlocked 클래스 추가 → Structure wrapper display:block으로 전환
    document.body.classList.add('hv-scroll-unlocked');
    // ✅ Structure wrapper를 다시 보이게 (inline style 제거하여 CSS 규칙 적용)
    const structureWrapper = document.querySelector('.structure-to-footer-wrapper');
    if (structureWrapper) {
        structureWrapper.style.display = '';
    }
    // ✅ Swiper/페이지 락 동기화
    syncHvSwiperMousewheelWithPageScroll();
    // ✅ 혹시 남아있는 스크롤 락(overflow hidden / body fixed)을 강제로 해제
    forceReleaseAnyScrollLock();
}

// ✅ HV 구간 페이지 스크롤 락(더 강하게): body fixed로 스크롤 자체를 차단
let hvDidFixedLock = false;
let hvFixedLockScrollY = 0;

// ✅ unlock 이후에도 스크롤이 안 되는 케이스 방지:
// - html/body overflow:hidden 또는 body fixed(top:-y) 등이 남아있으면 Structure가 아예 안 올라옴
function forceReleaseAnyScrollLock() {
    // 모바일 메뉴가 열려있으면 건드리지 않음
    const gnb = document.querySelector('.gnb');
    if (gnb && gnb.classList.contains('is-menu-open')) return;

    try {
        document.documentElement.style.overflow = '';
        document.documentElement.style.height = '';
        document.body.style.overflow = '';
        document.body.style.height = '';
    } catch (_) {}

    try {
        if (document.body.style.position === 'fixed') {
            const topStr = document.body.style.top || '0px';
            const y = Math.abs(parseInt(topStr, 10)) || 0;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
            scrollToInstantGlobal(y);
        }
    } catch (_) {}
}
// ✅ 모바일 첫 진입/새로고침 시 히어로 텍스트 모션이 2번 재생되는 현상 방지(디바운스)
let heroMotionCooldownUntil = 0;
function requestHeroTextMotionOnce() {
    const now = performance.now();
    if (now < heroMotionCooldownUntil) return;
    heroMotionCooldownUntil = now + 900;
    requestAnimationFrame(() => {
        try { playHeroTextMotion(); } catch (_) {}
    });
}

// (정리) 슬로건 → Structure 전환은 리빌(가짜 스크롤)로 만들지 않고,
// ✅ 문서 스크롤로 Structure가 자연스럽게 올라와 슬로건을 덮도록 통일

// ✅ Swiper 슬라이드 "즉시 점프" 유틸 (전환 애니메이션/스크롤링 모션 완전 제거)
// - 일부 환경에서 slideTo(index, 0)만으로는 transition이 남는 케이스가 있어 강제로 0 처리
function hvJumpTo(index) {
    if (!USE_HV_SWIPER_PAGING || !hvSwiper) return;
    try {
        const prevSpeed =
            hvSwiper.params && typeof hvSwiper.params.speed === 'number'
                ? hvSwiper.params.speed
                : 0;
        if (hvSwiper.params) hvSwiper.params.speed = 0;
        if (typeof hvSwiper.setTransition === 'function') hvSwiper.setTransition(0);
        // 3번째 인자(runCallbacks)=false로 불필요한 중복 콜백/상태 꼬임 방지
        hvSwiper.slideTo(index, 0, false);
        if (hvSwiper.params) hvSwiper.params.speed = prevSpeed;
    } catch (_) {
        try {
            hvSwiper.slideTo(index, 0, false);
        } catch (__) {}
    }
}

function lockPageScrollAtTop() {
    // ✅ Hero pull-to-refresh 중에는 락을 걸면 제스처가 시작조차 안 되는 케이스가 있어 예외 처리
    if (hvHeroPulling) return;
    // ✅ 이미 락 상태여도, "탑 고정"을 매번 강제로 재적용
    hvPageScrollLocked = true;
    // 탑으로 고정
    if (window.pageYOffset > 0) scrollToInstantGlobal(0);

    // ✅ overflow:hidden으로 스크롤 차단
    try {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        // ✅ 모바일(768px 이하)에서는 body fixed를 사용하지 않음
        // - visualViewport 계산과 충돌하여 GNB 위치가 튀고 콘텐츠가 떨리는 문제 방지
        // - 데스크탑에서만 body fixed로 강하게 잠금
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            hvDidFixedLock = false;
            return;
        }

        // 다른 기능(모바일 메뉴 등)에서 이미 fixed 잠금이면 건드리지 않음
        if (document.body.style.position === 'fixed') {
            hvDidFixedLock = false;
            return;
        }

        hvDidFixedLock = true;
        hvFixedLockScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${hvFixedLockScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
    } catch (_) {}
}

function unlockPageScroll() {
    if (!hvPageScrollLocked) return;
    hvPageScrollLocked = false;
    try {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    } catch (_) {}

    // ✅ HV 락으로 걸었던 body fixed만 되돌림
    if (hvDidFixedLock) {
        try {
            const topStr = document.body.style.top || '0px';
            const y = Math.abs(parseInt(topStr, 10)) || hvFixedLockScrollY || 0;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
            hvDidFixedLock = false;
            hvFixedLockScrollY = 0;
            scrollToInstantGlobal(y);
        } catch (_) {}
    }
}

function syncHvSwiperMousewheelWithPageScroll() {
    // ✅ Swiper(히어로~비전) ↔ 페이지 스크롤(Structure 이후) 충돌 방지
    // - Swiper 구간에서는 페이지 스크롤을 락하고 Swiper 입력을 활성
    // - Structure로 내려갈 때는 페이지 스크롤을 허용하고 Swiper 입력을 비활성
    if (!USE_HV_SWIPER_PAGING || !hvSwiper || !hvSwiper.mousewheel) return;
    const last = hvSwiper.slides ? hvSwiper.slides.length - 1 : 3;
    const idx = hvSwiper.activeIndex ?? 0;

    // ✅ Structure 진입 이후에는(= hvCanScrollToStructure) hvPager가 페이지 스크롤을 다시 락하면 안 됨
    // - activeIndex가 어떤 값이든, 구조 구간에서는 "항상 자연 스크롤"이 우선
    let shouldLockPage = false;
    if (!hvCanScrollToStructure) {
        // ✅ 슬로건에서 unlock 대기 중일 때는 페이지 스크롤 락 해제 (Estrela Studio 방식)
        // - Swiper의 touchReleaseOnEdges가 작동할 수 있도록
        // - 자연스러운 스크롤이 페이지 스크롤로 전환되도록
        if (idx === last && hvSloganUnlockArmed) {
            shouldLockPage = false;
        } else {
            // 마지막 슬라이드가 아니면 항상 Swiper 구간(페이지 스크롤 락)
            shouldLockPage = idx < last || (idx === last && !hvCanScrollToStructure);
        }
    }
    // ✅ iOS pull-to-refresh를 위해: Hero(0번) & 최상단에서는 모바일에서 페이지 락을 걸지 않는다
    if (window.innerWidth <= 768 && idx === 0 && (window.pageYOffset || 0) <= 0) {
        shouldLockPage = false;
    }

    if (shouldLockPage) lockPageScrollAtTop();
    else unlockPageScroll();

    // ✅ 페이지 스크롤 구간에서는 hv-pager가 입력을 먹지 않도록 통과 처리
    // - fixed hv-pager 위에서 스크롤해도 Structure가 올라와야 함
    if (!shouldLockPage && hvCanScrollToStructure) {
        document.body.classList.add('hv-scroll-unlocked');
    } else {
        document.body.classList.remove('hv-scroll-unlocked');
    }

    // Swiper 입력 활성/비활성
    // ✅ 슬로건 unlock 대기 중일 때: 페이지 스크롤은 unlock하되, Swiper 입력은 활성 유지
    // - 모바일: 자연스러운 스크롤 (touchReleaseOnEdges)
    // - PC: 백스크롤 가능 (mousewheel)
    let shouldEnableSwiperInput = shouldLockPage;
    if (idx === last && hvSloganUnlockArmed && !hvCanScrollToStructure) {
        shouldEnableSwiperInput = true; // Swiper 입력 유지
    }
    
    if (shouldEnableSwiperInput !== hvMousewheelEnabled) {
        hvMousewheelEnabled = shouldEnableSwiperInput;
        try {
            if (shouldEnableSwiperInput) hvSwiper.mousewheel.enable();
            else hvSwiper.mousewheel.disable();
        } catch (_) {}
        hvSwiper.allowTouchMove = shouldEnableSwiperInput;
    }
}

function playTitleOnce(titleEl) {
    // ✅ 타이틀(라인) 바텀→탑 등장 모션을 "항상" 안정적으로 재생
    if (!titleEl) return;
    const lines = Array.from(titleEl.querySelectorAll('.text-content .title-line .line-text'));
    const prev = new Map();
    lines.forEach((line) => {
        prev.set(line, line.style.transition);
        line.style.transition = 'none';
    });
    titleEl.classList.remove('animate', 'exit');
    titleEl.classList.add('enter');
    void titleEl.offsetHeight;
    lines.forEach((line) => {
        line.style.transition = prev.get(line) || '';
    });
    requestAnimationFrame(() => {
        titleEl.classList.remove('enter', 'exit');
        titleEl.classList.add('animate');
    });
}

function applyHvPagerState(stepIndex, skipHeroMotion = false) {
    // stepIndex: 0=Hero, 1=Vision1, 2=Vision2, 3=Slogan
    // skipHeroMotion: true면 히어로 모션을 재생하지 않음 (초기화 시 사용)
    const pager = document.querySelector('#hvPager');
    if (!pager) return;

    pager.classList.toggle('hv-state-hero', stepIndex === 0);
    pager.classList.toggle('hv-show-image', stepIndex === 3);

    // ✅ 핵심: 슬로건은 "화면 가득 단독"으로 먼저 고정되어 보여야 함
    // - 슬로건(또는 비전)으로 진입하는 순간, Structure가 같이 올라오지 않도록
    //   1) 문서 스크롤을 탑으로 고정 2) unlock 클래스를 제거 3) 슬로건에서만 unlock 대기
    if (stepIndex === 1 || stepIndex === 2 || stepIndex === 3) {
        // HV 영역에서는 기본적으로 페이지 스크롤을 잠금(Structure는 다음 입력에서만)
        hvCanScrollToStructure = false;
        document.body.classList.remove('hv-scroll-unlocked');
        // ✅ Structure wrapper를 강제로 숨김 (CSS display:none 보강)
        const structureWrapper = document.querySelector('.structure-to-footer-wrapper');
        if (structureWrapper) {
            structureWrapper.style.display = 'none';
        }
        // 슬로건에서만 unlock 트리거를 기다림
        hvSloganUnlockArmed = (stepIndex === 3);
        hvSloganUnlockAccPx = 0;
        // ✅ Structure가 같이 보이는 원인의 90%는 "이전 unlock에서 남은 scrollY/body fixed" 잔여 상태
        // 1) 잔여 스크롤 락/position:fixed 해제 → 2) scrollY=0 확정 → 3) HV 락 재적용
        forceReleaseAnyScrollLock();
        scrollToInstantGlobal(0);
        lockPageScrollAtTop();
    }

    // 슬라이드 진입 시 스크롤/입력 상태 동기화
    syncHvSwiperMousewheelWithPageScroll();

    // 비전 텍스트 토글
    const t1 = pager.querySelector('.vision-text-1');
    const t2 = pager.querySelector('.vision-text-2');
    const t3 = pager.querySelector('.vision-text-3');
    if (t1) t1.classList.toggle('active', stepIndex === 1);
    if (t2) t2.classList.toggle('active', stepIndex === 2);
    if (t3) t3.classList.toggle('active', stepIndex === 3);

    // 비전/슬로건 리소스 동기화(모바일/데스크톱 분기)
    if (stepIndex !== 0) {
        updateVisionVideoSource(true);
    }
    // ✅ 슬로건 이미지 로딩 지연으로 인한 전환 끊김(프레임 드랍) 방지
    // - 2번 텍스트(슬라이드 2)에서 미리 이미지 src를 세팅해 캐시를 올려둠
    if (stepIndex === 2 || stepIndex === 3) {
        updateVisionImageSource();
    }

    // 타이틀 애니메이션 재생
    // - 슬라이드 전환 시 항상 바텀→탑 모션이 "재생"되도록 강제로 리셋 후 재생
    if (stepIndex === 1) {
        const t = pager.querySelector('.vision-title-1');
        if (hvAnimateTitlesOnce) {
            pager.classList.add('hv-title-mask');
            playTitleOnce(t);
        } else {
            // ✅ 일반 스와이프/스크롤: 마스크/바텀→탑 모션 없이 즉시 노출
            if (t) {
                t.classList.remove('enter', 'exit');
                t.classList.add('animate');
            }
        }
    } else if (stepIndex === 2) {
        const t = pager.querySelector('.vision-title-2');
        if (hvAnimateTitlesOnce) {
            pager.classList.add('hv-title-mask');
            playTitleOnce(t);
        } else {
            if (t) {
                t.classList.remove('enter', 'exit');
                t.classList.add('animate');
            }
        }
    } else if (stepIndex === 3) {
        // ✅ 슬로건 텍스트 노출/사라짐 효과를 비전 1,2와 "완전 동일"하게 통일
        // - 딜레이가 있으면 컨테이너(opacity) 전환 + 라인(translate/opacity) 전환이 분리되어
        //   마스크가 한 겹 더 걸린 것처럼 보일 수 있음
        const t = pager.querySelector('.vision-title-3');
        if (hvAnimateTitlesOnce) {
            pager.classList.add('hv-title-mask');
            playTitleOnce(t);
        } else {
            if (t) {
                t.classList.remove('enter', 'exit');
                t.classList.add('animate');
            }
        }
    } else if (stepIndex === 0 && !skipHeroMotion) {
        // ✅ 백스크롤로 히어로 진입 시에도 텍스트 모션 리셋 + 재생
        // - skipHeroMotion이 true면 모션 생략 (초기화 시)
        requestHeroTextMotionOnce();
    }

    // ✅ 메뉴 클릭 이동에서만 1회 애니메이션 → 이후엔 기본(즉시 노출)로 복귀
    if (hvAnimateTitlesOnce && (stepIndex === 1 || stepIndex === 2 || stepIndex === 3)) {
        hvAnimateTitlesOnce = false;
        // 마스크 클래스는 전환이 끝난 뒤 제거(라인 애니메이션 시간과 동일)
        setTimeout(() => {
            try { pager.classList.remove('hv-title-mask'); } catch (_) {}
        }, 900);
    } else {
        // 기본 상태에서는 마스크 제거
        pager.classList.remove('hv-title-mask');
    }
}

function initHvPagerSwiper() {
    if (!USE_HV_SWIPER_PAGING) return;
    const pager = document.querySelector('#hvPager');
    if (!pager) return;
    if (typeof Swiper === 'undefined') return;

    const pagerEl = pager;

    // ✅ 슬로건→Structure는 "리빌"이 아니라, Swiper의 edge release + 페이지 스크롤 unlock으로 처리
    // - 슬로건은 sticky로 고정되어 배경에 남고
    // - Structure~Footer는 문서 스크롤로 자연스럽게 위로 올라와 덮는다.
    // ✅ 단, "슬로건은 스냅(락)"이 1번 보장되어야 하므로,
    // 슬로건 도착 직후에는 hvCanScrollToStructure=false(락 유지)로 두고,
    // 슬로건에서 아래로 스크롤 입력이 한 번 더 들어왔을 때만 unlock 한다.
    const normalizeWheelDeltaYToPx = (e) => {
        const dy = typeof e.deltaY === 'number' ? e.deltaY : 0;
        const mode = typeof e.deltaMode === 'number' ? e.deltaMode : 0;
        if (mode === 1) return dy * 16;
        if (mode === 2) return dy * (window.innerHeight || 800);
        return dy;
    };

    const onSloganWheelCapture = (e) => {
        if (!hvSwiper) return;
        const last = hvSwiper.slides ? hvSwiper.slides.length - 1 : 3;
        if (hvSwiper.activeIndex !== last) return;
        if (hvCanScrollToStructure) return;
        if (!hvSloganUnlockArmed) return;

        const dyPx = normalizeWheelDeltaYToPx(e);
        
        // ✅ 위로 스크롤(백스크롤): 이 함수는 처리하지 않음 → Swiper가 정상 처리
        if (dyPx <= 0) return;
        
        // ✅ 아래로 스크롤: unlock (Structure로 이동)
        unlockToStructureScroll();
    };
    pagerEl.addEventListener('wheel', onSloganWheelCapture, { passive: false, capture: true });

    // ✅ 터치 이벤트 리스너 제거 - 자연스러운 스크롤 방해 방지
    // - Swiper의 touchReleaseOnEdges와 자연스러운 edge 동작에 맡김
    // - 슬로건에서 아래로 스크롤 시 Swiper가 자동으로 터치를 해제하고 페이지 스크롤로 전환

    // ✅ iOS 당겨서 새로고침(Pull-to-refresh) 허용:
    // - Swiper 구간에서 페이지 스크롤을 overflow:hidden으로 락하면 iOS가 당겨서 새로고침을 막음
    // - Hero(0번)에서 "아래로 당기기" 제스처만큼은 락을 잠깐 해제해 브라우저 기본 동작을 허용
    let heroPullStartY = null;
    const onHeroPullStart = (e) => {
        if (!hvSwiper) return;
        if ((hvSwiper.activeIndex ?? 0) !== 0) return;
        if ((window.pageYOffset || 0) > 0) return;
        if (e.touches && e.touches.length) {
            heroPullStartY = e.touches[0].clientY;
            // ✅ iOS pull-to-refresh는 "제스처 시작 시점"에 락/Swiper가 터치를 잡으면 아예 시작이 안 됨
            // 1) 락 해제 + 2) Swiper 터치 입력을 잠깐 OFF
            hvHeroPulling = true;
            try {
                hvSwiper.allowTouchMove = false;
                if (hvSwiper.mousewheel) hvSwiper.mousewheel.disable();
            } catch (_) {}
            unlockPageScroll();
        }
    };
    const onHeroPullMove = (e) => {
        if (heroPullStartY === null) return;
        if (!hvSwiper) return;
        if ((hvSwiper.activeIndex ?? 0) !== 0) return;
        if ((window.pageYOffset || 0) > 0) return;
        if (!e.touches || !e.touches.length) return;
        const dy = e.touches[0].clientY - heroPullStartY;
        // ✅ 아래로 당길 때(>0): pull-to-refresh 의도 → 계속 unlock 유지
        if (dy > 6) {
            hvHeroPulling = true;
            unlockPageScroll();
            return;
        }
        // ✅ 위로 밀기(<0): 다음 슬라이드로 넘어가려는 의도 → Swiper 입력 복구
        if (dy < -6) {
            hvHeroPulling = false;
            try {
                hvSwiper.allowTouchMove = true;
                if (hvSwiper.mousewheel) hvSwiper.mousewheel.enable();
            } catch (_) {}
            syncHvSwiperMousewheelWithPageScroll();
        }
    };
    const onHeroPullEnd = () => {
        heroPullStartY = null;
        hvHeroPulling = false;
        // ✅ 제스처 종료 후 Swiper/락 상태 복구
        try {
            if (hvSwiper) {
                hvSwiper.allowTouchMove = true;
                if (hvSwiper.mousewheel) hvSwiper.mousewheel.enable();
            }
        } catch (_) {}
        if (hvSwiper && (hvSwiper.activeIndex ?? 0) === 0) syncHvSwiperMousewheelWithPageScroll();
    };
    pagerEl.addEventListener('touchstart', onHeroPullStart, { passive: true, capture: true });
    pagerEl.addEventListener('touchmove', onHeroPullMove, { passive: true, capture: true });
    pagerEl.addEventListener('touchend', onHeroPullEnd, { passive: true, capture: true });
    pagerEl.addEventListener('touchcancel', onHeroPullEnd, { passive: true, capture: true });

    hvSwiper = new Swiper('#hvPager', {
        direction: 'vertical',
        slidesPerView: 1,
        speed: 850,
        resistanceRatio: 0.85,
        allowTouchMove: true,
        mousewheel: {
            forceToAxis: true,
            // ✅ 슬로건에서 스크롤이 "바로" 구조로 새는 것을 막기 위해 잠금+release 조합 사용
            releaseOnEdges: true,
            thresholdDelta: 6,
            thresholdTime: 550,
        },
        touchReleaseOnEdges: true,
        on: {
            init: function () {
                // ✅ Swiper 초기화 직후 Structure를 확실히 숨김
                document.body.classList.remove('hv-scroll-unlocked');
                const structureWrapper = document.querySelector('.structure-to-footer-wrapper');
                if (structureWrapper) {
                    structureWrapper.style.display = 'none';
                }
                // ✅ 초기화 시에는 히어로 모션 생략 (window.load에서 실행)
                applyHvPagerState(this.activeIndex, true);
                syncHvSwiperMousewheelWithPageScroll();
            },
            slideChange: function () {
                // ✅ 슬라이드 인덱스가 바뀌는 즉시 (전환 애니메이션 시작 전) unlock 대기 상태 강제 해제
                const last = this.slides ? this.slides.length - 1 : 3;
                // ✅ 모든 슬라이드 전환 시 일단 unlock 대기 해제
                hvCanScrollToStructure = false;
                hvSloganUnlockArmed = false;
                hvSloganUnlockAccPx = 0;
                
                // ✅ Structure 확실히 숨김
                document.body.classList.remove('hv-scroll-unlocked');
                const structureWrapper = document.querySelector('.structure-to-footer-wrapper');
                if (structureWrapper) {
                    structureWrapper.style.display = 'none';
                }
            },
            slideChangeTransitionStart: function () {
                applyHvPagerState(this.activeIndex);
                // ✅ 3덩어리 구조:
                // - Hero/Vision/Slogan: Swiper 페이징(페이지 스크롤 0에 고정)
                // - Slogan(마지막)에서는 아래로 스크롤이 자연스럽게 Structure로 이어져야 함
                const last = this.slides ? this.slides.length - 1 : 3;
                // ✅ 전환 중에는 확실히 잠금 유지
                hvCanScrollToStructure = false;
                hvSloganUnlockArmed = false;
                hvSloganUnlockAccPx = 0;
                syncHvSwiperMousewheelWithPageScroll();
            },
            slideChangeTransitionEnd: function () {
                // ✅ 슬로건 전환 완료 후 즉시 unlock 대기 상태로 전환 (딜레이 제거)
                const last = this.slides ? this.slides.length - 1 : 3;
                if (this.activeIndex === last) {
                    // ✅ 슬로건 도착: 즉시 unlock 대기 시작 (Estrela Studio 방식)
                    // - Swiper의 touchReleaseOnEdges와 자연스러운 스크롤에 맡김
                    hvSloganUnlockArmed = true;
                    hvSloganUnlockAccPx = 0;
                } else {
                    // 히어로/비전: unlock 대기 비활성
                    hvCanScrollToStructure = false;
                    hvSloganUnlockArmed = false;
                    hvSloganUnlockAccPx = 0;
                }
                syncHvSwiperMousewheelWithPageScroll();
            },
        }
    });

    // 페이지 스크롤 상태에 따라 Swiper/페이지 락 동기화
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset || 0;
        
        // ✅ 슬로건 unlock 대기 중 + 스크롤 발생 → 즉시 unlock (모바일 자연스러운 스크롤)
        if (hvSloganUnlockArmed && !hvCanScrollToStructure && scrollY > 0) {
            unlockToStructureScroll();
            return;
        }
        
        // ✅ Structure에서 백스크롤로 다시 탑에 도달하면, 슬로건을 다시 "락" 상태로 되돌려
        //   비전2 → 슬로건 순으로 페이징이 정상 동작하게 유지
        // ✅ unlock 직후 미세 스크롤(1px)로 즉시 재락되는 문제 방지:
        // - "완전 탑(0)"에 도달했을 때만 재락
        if (scrollY <= 0 && hvCanScrollToStructure) {
            hvCanScrollToStructure = false;
            // ✅ 백스크롤로 탑 도달 시 hv-scroll-unlocked 클래스 제거
            document.body.classList.remove('hv-scroll-unlocked');
            // ✅ Structure wrapper를 다시 숨김
            const structureWrapper = document.querySelector('.structure-to-footer-wrapper');
            if (structureWrapper) {
                structureWrapper.style.display = 'none';
            }
            // ✅ 슬로건으로 돌아왔을 때 즉시 unlock 대기 활성화 (딜레이 제거)
            // - 백스크롤 복귀 시에는 이미 슬로건 화면이 안정화되어 있으므로 즉시 활성화
            if (hvSwiper) {
                const last = hvSwiper.slides ? hvSwiper.slides.length - 1 : 3;
                if (hvSwiper.activeIndex === last) {
                    // ✅ 즉시 unlock 대기 재활성화 (누적값 명확히 0으로 리셋)
                    hvSloganUnlockArmed = true;
                    hvSloganUnlockAccPx = 0;
                } else {
                    hvSloganUnlockArmed = false;
                    hvSloganUnlockAccPx = 0;
                }
            }
        }
        syncHvSwiperMousewheelWithPageScroll();
    }, { passive: true });
}

// 페이지 로드 시(브라우저 새로고침 기준): 최상단 + 히어로 모션 재생
window.addEventListener('load', () => {
    // ✅ 페이지 로드 직후 Structure wrapper 확실히 숨김
    document.body.classList.remove('hv-scroll-unlocked');
    goToHeroWithReloadMotion();
});

// Intersection Observer for slide-in animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Roadmap 타임라인 아이템은 "한 번에" 동시에 visible 처리
            if (entry.target.classList.contains('timeline-item')) {
                const timelineItems = document.querySelectorAll('.timeline-item');
                timelineItems.forEach((el) => el.classList.add('visible'));
            } else {
            entry.target.classList.add('visible');
            }

            // ✅ Vision 아웃트로 3번 텍스트: "텍스트 박스만" slide-in 기반으로 등장 처리
            if (entry.target.classList.contains('vision-text-3')) {
                // 모바일/데스크톱 이미지 소스는 이 시점에 확정
                updateVisionImageSource();
                const title3 = entry.target.querySelector('.vision-title-3');
                if (title3) {
                    title3.classList.remove('enter', 'exit');
                    title3.classList.add('animate');
                }
            }
        }
    });
}, observerOptions);

// 히어로 텍스트 모션: 초기화/재생(탑 이동/리로드 시 재실행용)
let heroAnimTimers = [];
function playHeroTextMotion() {
    const heroMainText = document.querySelector('.hero-main-text');
    const heroSubText = document.querySelector('.hero-sub-text');
    if (!heroMainText || !heroSubText) return;

    // 기존 타이머 정리(중복 재생 방지)
    if (heroAnimTimers.length) {
        heroAnimTimers.forEach((t) => clearTimeout(t));
        heroAnimTimers = [];
    }

    // ✅ 초기화: "완전 비노출" 상태로 즉시 리셋(텍스트가 내려가며 사라지는 모션 방지)
    // - transition을 잠깐 끄고 animate를 제거해야, 즉시 안 보이는 상태로 초기화됨
    const heroMainLines = Array.from(
        heroMainText.querySelectorAll('.text-content .title-line .line-text')
    );
    const heroSubContent = heroSubText.querySelector('.text-content');

    const prevTransitions = new Map();
    const disableTransition = (el) => {
        if (!el) return;
        prevTransitions.set(el, el.style.transition);
        el.style.transition = 'none';
    };
    heroMainLines.forEach(disableTransition);
    disableTransition(heroSubContent);

    heroMainText.classList.remove('animate', 'enter', 'exit');
    heroSubText.classList.remove('animate', 'enter', 'exit');

    // 리플로우 강제(transition:none + class 제거 상태 확정)
    void heroMainText.offsetHeight;
    void heroSubText.offsetHeight;

    // transition 원복(등장할 때는 애니메이션 적용)
    heroMainLines.forEach((el) => {
        el.style.transition = prevTransitions.get(el) || '';
    });
    if (heroSubContent) {
        heroSubContent.style.transition = prevTransitions.get(heroSubContent) || '';
    }

    heroAnimTimers.push(
        setTimeout(() => {
            heroMainText.classList.add('animate');
        }, 100)
    );
    heroAnimTimers.push(
        setTimeout(() => {
            heroSubText.classList.add('animate');
        }, 250)
    );
}

// Observe all slide-in elements
document.addEventListener('DOMContentLoaded', () => {
    const slideInElements = document.querySelectorAll('.slide-in');
    slideInElements.forEach(el => observer.observe(el));
    
    // 히어로 텍스트 모션은 window.load(리로드 기준)에서 1회만 재생
    
    // 스크롤 인디케이터 클릭 시 비전 섹션으로 이동
    const scrollIndicator = document.querySelector('.hero-scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', (e) => {
            // ✅ 히어로 화살표 클릭도 "GNB > Vision 클릭"과 동일한 시점으로 이동
            // - (중요) 기존 scrollIntoView는 targetTop이 달라서 스텝/스냅 기준이 흔들릴 수 있음
            e.preventDefault();
            if (USE_HV_SWIPER_PAGING && hvSwiper) {
                // ✅ 메뉴 클릭과 동일하게: 이 이동에서는 타이틀 모션(바텀→탑)을 1회만 재생
                hvAnimateTitlesOnce = true;
                // ✅ 다른 메뉴 이동과 동일하게: 전환 모션 없이 즉시 점프
                hvJumpTo(1);
                applyHvPagerState(1);
                return;
            }
            goToVisionStep1LikeGnb();
        });
    }
    
    // ✅ 히어로~비전: Swiper 풀페이징 초기화
    initHvPagerSwiper();
    
    // GNB 메뉴 클릭 시 해당 섹션으로 스크롤
    const gnbMenuItems = document.querySelectorAll('.gnb-menu-item');
    const gnb = document.querySelector('.gnb');
    const gnbTopMargin = VISION_GNB_TOP_MARGIN_PX; // ✅ 스텝/히어로 스크롤과 동일한 기준값 사용
    
    // 모바일 햄버거 메뉴 토글 요소
    const gnbHamburger = document.querySelector('.gnb-hamburger');
    const gnbHamburgerIcon = document.querySelector('.gnb-hamburger-icon');
    const gnbMobileMenu = document.querySelector('#gnb-mobile-menu');

    const MENU_ICON_SRC = 'img/icon_menu.svg';
    const CLOSE_ICON_SRC = 'img/icon_close.svg';
    const MOBILE_MENU_FADE_MS = 240; // CSS 디졸브(페이드) 시간과 동일하게 맞춤
    let mobileMenuCloseTimer = null;
    let scrollLockY = 0; // 모바일 메뉴 오픈 시 스크롤 위치 저장

    const closeMobileMenu = () => {
        if (!gnb) return;
        // ✅ 메뉴가 열려있지 않으면 아무 것도 하지 않음
        // - 리사이즈 중에 불필요하게 body/html 스타일을 건드리면(예: 모달 오픈 상태)
        //   시점이 0(히어로)로 튀는 부작용이 발생할 수 있음
        const isOpen = gnb.classList.contains('is-menu-open');
        const isMenuHidden = gnbMobileMenu ? gnbMobileMenu.hasAttribute('hidden') : true;
        if (!isOpen && isMenuHidden) return;

        // ✅ iOS 깜빡임 방지: 디졸브(페이드) 제거 → 즉시 닫기
        gnb.classList.remove('is-menu-open');
        if (gnbHamburger) gnbHamburger.setAttribute('aria-expanded', 'false');
        if (gnbHamburgerIcon) gnbHamburgerIcon.setAttribute('src', MENU_ICON_SRC);
        if (gnbHamburger) gnbHamburger.setAttribute('aria-label', '메뉴 열기');

        // 모바일 메뉴 열림 상태에서는 스크롤을 막았다가 복구
        document.documentElement.style.overflow = '';
        document.documentElement.style.height = '';
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        // 스크롤 위치 복원
        if (scrollLockY) {
            window.scrollTo(0, scrollLockY);
            scrollLockY = 0;
        }

        // ✅ 즉시 hidden 처리 (디졸브 제거)
        if (mobileMenuCloseTimer) {
            clearTimeout(mobileMenuCloseTimer);
            mobileMenuCloseTimer = null;
        }
        if (gnbMobileMenu) gnbMobileMenu.setAttribute('hidden', '');
    };

    const openMobileMenu = () => {
        if (!gnb) return;
        // 닫힘 타이머가 있다면 취소
        if (mobileMenuCloseTimer) {
            clearTimeout(mobileMenuCloseTimer);
            mobileMenuCloseTimer = null;
        }

        // ✅ iOS 깜빡임 방지: 디졸브 제거 → 즉시 열기
        if (gnbMobileMenu) gnbMobileMenu.removeAttribute('hidden');
        gnb.classList.add('is-menu-open');
        // ✅ (모바일) 이동 중 커버가 남아있을 수 있으니, 메뉴를 열 때는 즉시 커버를 내린다.
        try {
            const cover = document.getElementById('mobile-nav-cover');
            if (cover) cover.classList.remove('is-active');
        } catch (_) {}

        if (gnbHamburger) gnbHamburger.setAttribute('aria-expanded', 'true');
        if (gnbHamburgerIcon) gnbHamburgerIcon.setAttribute('src', CLOSE_ICON_SRC);
        if (gnbHamburger) gnbHamburger.setAttribute('aria-label', '메뉴 닫기');

        // 모바일 메뉴 오버레이 상태에서 배경 스크롤 방지
        // - 크롬에서는 스크롤 컨테이너가 html인 경우가 있어 html/body 모두 잠금
        // - 더 확실하게는 body를 fixed로 고정해서 휠/트랙패드/터치 스크롤을 완전 차단
        scrollLockY = window.scrollY || window.pageYOffset || 0;
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100%';
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100%';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollLockY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
    };

    // 모바일 햄버거 버튼 클릭 시 토글
    if (gnbHamburger) {
        gnbHamburger.addEventListener('click', () => {
            const isOpen = gnb && gnb.classList.contains('is-menu-open');
            if (isOpen) closeMobileMenu();
            else openMobileMenu();
        });
    }

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });

    // 각 섹션별 추가 오프셋 조정 (px 단위)
    // 양수: 더 아래로 스크롤, 음수: 더 위로 스크롤
    // ✅ 섹션별 추가 오프셋 (뷰포트 기준 %) - 모바일/데스크탑 분리
    // - px 고정값 대신, 화면 높이(vh) 비율로 관리해서 해상도/기기별로 자연스럽게 맞춘다.
    // - 예) 10 = 10vh = (window.innerHeight * 0.10) px
    // - ✅ 모바일은 별도 값으로 조정 가능하도록 분리
    const sectionOffsetsVhDesktop = {
        '#vision': 65,      // Vision 섹션 추가 오프셋 (65vh)
        '#structure': 12,   // Structure 섹션 추가 오프셋 (12vh)
        '#nft': 5,          // NFT 섹션 추가 오프셋 (5vh)
        '#roadmap': 5       // Roadmap 섹션 추가 오프셋 (5vh)
    };
    const sectionOffsetsVhMobile = {
        // ✅ 기본값은 데스크탑과 동일하게 시작 (필요 시 모바일만 따로 튜닝)
        '#vision': 65,
        '#structure': 15,
        '#nft': 11,
        '#roadmap': 5
    };

    // ✅ vh(%) → px 변환 유틸
    const getSectionOffsetPx = (targetId) => {
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        // ✅ 모바일 우선, 없으면 데스크탑 값으로 fallback
        const vh = isMobile
            ? (sectionOffsetsVhMobile[targetId] ?? sectionOffsetsVhDesktop[targetId])
            : sectionOffsetsVhDesktop[targetId];
        if (typeof vh !== 'number') return 0;
        const h = window.innerHeight || 0;
        return Math.round((h * vh) / 100);
    };

    // ✅ 전역 scroll-behavior:smooth가 있어도, 특정 액션은 "즉시 점프"로 이동
    const scrollToInstant = (top) => {
        const prevHtml = document.documentElement.style.scrollBehavior;
        const prevBody = document.body.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        document.body.style.scrollBehavior = 'auto';
        // 스타일 적용을 즉시 반영(일부 브라우저에서 1프레임 늦게 적용되어 smooth처럼 보이는 현상 방지)
        void document.documentElement.offsetHeight;
        window.scrollTo(0, Math.max(0, top));
        requestAnimationFrame(() => {
            document.documentElement.style.scrollBehavior = prevHtml;
            document.body.style.scrollBehavior = prevBody;
        });
    };

    // ✅ (모바일 메뉴) "스크롤 락만" 즉시 해제하는 유틸
    // - 메뉴를 닫기(페이드아웃) 전에 먼저 body fixed/overflow를 풀어야
    //   메뉴 클릭 이동(scrollToInstant/hvJumpTo)이 정상 동작한다.
    // - (중요) 이 함수는 메뉴 오버레이는 그대로 유지한다(깜빡임 방지).
    const releaseMobileMenuScrollLockOnly = () => {
        // 모바일 메뉴가 열려있지 않으면 아무 것도 하지 않음
        const isOpen = gnb && gnb.classList.contains('is-menu-open');
        if (!isOpen) return;

        // ✅ 스크롤 락 해제
        document.documentElement.style.overflow = '';
        document.documentElement.style.height = '';
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';

        // ✅ 스크롤 위치 복원(메뉴 오픈 시점)
        if (scrollLockY) {
            window.scrollTo(0, scrollLockY);
            // (중요) 이후 closeMobileMenu()가 다시 복원하지 않도록 0으로 초기화
            scrollLockY = 0;
        }
    };

    // ✅ (모바일) 메뉴 클릭 이동 중 바닥(HV 비전/슬로건) 깜빡임 방지용 커버
    // - body fixed 해제/scrollTo/hvJumpTo 과정에서 1프레임 비치는 케이스를 완전히 차단한다.
    const ensureMobileNavCover = () => {
        let el = document.getElementById('mobile-nav-cover');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'mobile-nav-cover';
        el.setAttribute('aria-hidden', 'true');
        document.body.appendChild(el);
        return el;
    };
    const showMobileNavCover = () => {
        const el = ensureMobileNavCover();
        // ✅ iOS에서 클래스 적용이 1프레임 늦는 케이스 방지
        void el.offsetHeight;
        el.classList.add('is-active');
    };
    const hideMobileNavCoverDeferred = (frames = 5) => {
        const el = document.getElementById('mobile-nav-cover');
        if (!el) return;
        let left = Math.max(1, frames | 0);
        const tick = () => {
            left -= 1;
            if (left <= 0) el.classList.remove('is-active');
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    // ✅ (모바일) 메뉴 클릭 이동 시 깜빡임 방지용: 메뉴를 "조금 늦게" 닫기
    // - iOS에서 scrollTo/hvJumpTo 직후 1프레임 동안 HV(비전/슬로건)가 노출되는 케이스가 있어,
    //   이동이 화면에 반영된 다음에 메뉴를 닫는다.
    const closeMobileMenuDeferred = (frames = 2) => {
        if (!gnb || !gnb.classList.contains('is-menu-open')) return;
        let left = Math.max(1, frames | 0);
        const tick = () => {
            left -= 1;
            if (left <= 0) closeMobileMenu();
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    // ✅ 메뉴 이동 시마다 slide-in 인터랙션을 다시 보이게(모션 재가동)
    // - 대상 섹션 내부의 .slide-in 요소를 visible 해제 → 리플로우 → 이동 후 visible 재부여
    const replaySlideInAnimations = (targetSection) => {
        if (!targetSection) return;
        const els = Array.from(targetSection.querySelectorAll('.slide-in'));
        if (!els.length) return;

        // 1) 초기화(즉시 숨김 상태로 되돌림)
        // - transition을 잠깐 끄고 visible을 제거해야 "나가는 애니메이션" 없이 즉시 초기화됨
        els.forEach((el) => {
            el.style.transition = 'none';
            el.classList.remove('visible');
        });
        // 초기 상태 적용 강제
        els.forEach((el) => void el.offsetWidth);
        // transition 원복(다시 들어올 때 애니메이션 되도록)
        els.forEach((el) => {
            el.style.transition = '';
        });

        // 2) 다음 프레임에 visible 재부여 → 진입 애니메이션 재가동
        requestAnimationFrame(() => {
            els.forEach((el) => el.classList.add('visible'));
        });
    };

    // ✅ Vision은 slide-in이 아니라 패럴럭스(active/animate) 기반이라 별도 리셋이 필요
    const replayVisionIntroMotion = () => {
        const visionText1 = document.querySelector('.vision-text-1');
        const visionText2 = document.querySelector('.vision-text-2');
        const visionText3 = document.querySelector('.vision-text-3');
        const title1 = document.querySelector('.vision-title-1');
        const title2 = document.querySelector('.vision-title-2');
        const title3 = document.querySelector('.vision-title-3');
        if (!visionText1 || !title1) return;

        // 패럴럭스 상태 캐시 리셋 → 아래로 스크롤로 진입한 것처럼 처리되게
        lastVisionScrollProgress = -1;
        visionTicking = false;
        // 메뉴 클릭 직후에는 updateVisionParallax가 상태를 덮어쓰지 못하게 잠깐 잠금
        visionMenuReplayLockUntil = performance.now() + 700;

        // ✅ Vision 모션 리셋은 "완전 비노출 → 등장"이어야 하므로,
        // transition을 잠깐 끄고(active/animate) 상태를 즉시 초기화한 뒤, 다음 프레임에 animate로 재생
        const containers = [visionText1, visionText2, visionText3].filter(Boolean);
        const titles = [title1, title2, title3].filter(Boolean);

        // 컨테이너(opacity) 트랜지션 잠깐 제거 → 즉시 숨김
        const prevContainerTransitions = new Map();
        containers.forEach((el) => {
            prevContainerTransitions.set(el, el.style.transition);
            el.style.transition = 'none';
            el.classList.remove('active');
        });

        // 타이틀 라인 트랜지션 잠깐 제거 → 즉시 "enter 상태"로 되돌림
        const prevLineTransitions = new Map();
        const setTitleInstantEnter = (titleEl) => {
            const lines = Array.from(
                titleEl.querySelectorAll('.text-content .title-line .line-text')
            );
            lines.forEach((line) => {
                prevLineTransitions.set(line, line.style.transition);
                line.style.transition = 'none';
            });
            titleEl.classList.remove('animate', 'exit');
            titleEl.classList.add('enter');
        };
        titles.forEach(setTitleInstantEnter);

        // 리플로우 강제(transition:none + class 상태 확정)
        void visionText1.offsetHeight;

        // 트랜지션 원복(등장 애니메이션은 정상 동작)
        containers.forEach((el) => {
            el.style.transition = prevContainerTransitions.get(el) || '';
        });
        prevLineTransitions.forEach((val, line) => {
            line.style.transition = val || '';
        });

        // 첫 문구만 표시 + 다음 프레임에 animate 재생
        visionText1.classList.add('active');
        requestAnimationFrame(() => {
            title1.classList.remove('enter', 'exit');
            title1.classList.add('animate');
        });

        // 비디오/이미지 상태 등은 패럴럭스 로직으로 동기화
        requestAnimationFrame(() => {
            updateVisionParallax();
        });
    };

    gnbMenuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // ✅ 모바일: 메뉴가 열린 상태에서 클릭 이동이 "안 되는" 원인 = body fixed(스크롤락)
            // - 먼저 스크롤락만 해제하고(오버레이는 유지), 이동을 완료한 뒤 메뉴를 닫는다.
            const wasMenuOpen = gnb && gnb.classList.contains('is-menu-open');
            if (wasMenuOpen) {
                // ✅ 이동 중 바닥이 비치지 않도록 커버 ON → 스크롤락 해제
                showMobileNavCover();
                releaseMobileMenuScrollLockOnly();
            }

            const targetId = item.getAttribute('href');   // 예: #vision, #structure ...
            if (!targetId || !targetId.startsWith('#')) return;

            const targetSection = document.querySelector(targetId);
            if (!targetSection) return;

            const gnbHeight = gnb ? gnb.offsetHeight : 0;
            let targetElement = targetSection;
            // ✅ 섹션별 추가 오프셋(px) - vh(%) 기반으로 환산
            let additionalOffset = getSectionOffsetPx(targetId);

            // ---- Vision: "SJ World는 ... 캠퍼스입니다." 위치로 가고 싶을 때 ----
            if (targetId === '#vision') {
                // ✅ Swiper 풀페이징에서는 '비전 섹션 스크롤'이 아니라 '슬라이드 이동'으로 처리
                if (USE_HV_SWIPER_PAGING && hvSwiper) {
                    // 히어로~비전 구간은 항상 문서 최상단에 있으므로, 먼저 탑으로 올린 뒤 슬라이드 이동
                    scrollToInstant(0);
                    // ✅ 메뉴 클릭 이동에서만 타이틀 모션(바텀→탑)을 1회만 재생
                    hvAnimateTitlesOnce = true;
                    // ✅ 다른 메뉴 이동과 동일하게: 전환 모션 없이 즉시 점프
                    hvJumpTo(1);
                    applyHvPagerState(1);
                    replayVisionIntroMotion();
                    // ✅ 이동 완료 후 메뉴 닫기(깜빡임 방지: 2프레임 뒤 닫기)
                    if (wasMenuOpen) closeMobileMenuDeferred(2);
                    if (wasMenuOpen) hideMobileNavCoverDeferred(6);
                    return;
                }
                // 1순위: 비전 첫 문구에 앵커를 하나 심어두고(class는 원하는대로)
                // <div class="vision-intro-anchor"></div>
                const introAnchor =
                    targetSection.querySelector('.vision-intro-anchor') ||
                    targetSection.querySelector('.vision-text-1'); // 없으면 현재 비전 텍스트의 첫 블럭
                if (introAnchor) {
                    targetElement = introAnchor;
                }
            }

            // ✅ Structure / NFT / Roadmap: Structure unlock 필요
            if (targetId === '#structure' || targetId === '#nft' || targetId === '#roadmap') {
                // Structure 이후 섹션이므로 unlock
                if (!hvCanScrollToStructure) {
                    // ✅ 1) unlock 실행
                    unlockToStructureScroll();
                    
                    // ✅ 2) unlock 완료 후 스크롤: 3프레임 대기 (확실한 레이아웃 계산)
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                // 레이아웃 강제 리플로우
                                void document.body.offsetHeight;
                                
                                const rect = targetElement.getBoundingClientRect();
                                const absoluteTop = rect.top + window.pageYOffset;
                                const scrollTop = absoluteTop - gnbHeight - gnbTopMargin + additionalOffset;
                                scrollToInstant(scrollTop);
                                replaySlideInAnimations(targetSection);
                                // ✅ 이동 완료 후 메뉴 닫기(깜빡임 방지: 2프레임 뒤 닫기)
                                if (wasMenuOpen) closeMobileMenuDeferred(2);
                                if (wasMenuOpen) hideMobileNavCoverDeferred(6);
                            });
                        });
                    });
                    return; // 아래 스크롤 코드 실행 안함
                }
            }

            // Structure / NFT / Roadmap: 섹션의 0,0으로
            // (위에서 targetElement = targetSection 이라 기본값이라 따로 분기 필요 없음)

            const rect = targetElement.getBoundingClientRect();
            const absoluteTop = rect.top + window.pageYOffset;
            const scrollTop = absoluteTop - gnbHeight - gnbTopMargin + additionalOffset;

            // ✅ GNB 메뉴 이동은 "즉시 점프"(모션 없이)
            scrollToInstant(scrollTop);

            // ✅ 이동할 때마다 인터랙션 모션이 다시 보이도록 초기화/재가동
            if (targetId === '#vision') {
                // ✅ 히어로/스텝 스크롤과 동일하게 "1단계 도착"으로 동기화
                // - 메뉴로 Vision에 진입했을 때도 다음 스크롤에서 2단계로 정상 진행
                visionStepIndex = 1;
                visionAutoMidLockUntil = performance.now() + 400;
                replayVisionIntroMotion();
            } else {
                replaySlideInAnimations(targetSection);
            }

            // ✅ 이동 완료 후 메뉴 닫기(깜빡임 방지: 2프레임 뒤 닫기)
            if (wasMenuOpen) closeMobileMenuDeferred(2);
            if (wasMenuOpen) hideMobileNavCoverDeferred(6);
        });
    });
    
    // GNB 로고 클릭 시 최상단으로 스크롤
    const gnbLogo = document.querySelector('.gnb-logo');
    if (gnbLogo) {
        gnbLogo.addEventListener('click', (e) => {
            e.preventDefault();
            // ✅ 로고 클릭은 "브라우저 새로고침과 동일한 모션"으로 통일
            goToHeroWithReloadMotion();
        });
    }
    
    // GNB 발급하기 버튼 클릭 시 아웃링크로 연결 (추후 실제 구글폼 링크로 교체)
    const gnbIssueBtn = document.querySelector('.gnb-issue-btn');
    if (gnbIssueBtn) {
        gnbIssueBtn.addEventListener('click', () => {
            // TODO: 실제 구글폼 링크로 교체
            window.open('#', '_blank');
        });
    }

    // 모바일 하단 플로팅 발급 버튼 클릭 시 아웃링크로 연결 (추후 실제 구글폼 링크로 교체)
    const mobileIssueBtn = document.querySelector('.mobile-issue-btn');
    if (mobileIssueBtn) {
        mobileIssueBtn.addEventListener('click', () => {
            // TODO: 실제 구글폼 링크로 교체
            window.open('#', '_blank');
        });
    }

    // 모바일 메뉴 내부 발급 버튼 클릭 시 아웃링크로 연결 (추후 실제 구글폼 링크로 교체)
    const gnbMobileIssueBtn = document.querySelector('.gnb-mobile-issue-btn');
    if (gnbMobileIssueBtn) {
        gnbMobileIssueBtn.addEventListener('click', () => {
            // TODO: 실제 구글폼 링크로 교체
            window.open('#', '_blank');
        });
    }

    // ✅ 모바일 하단 플로팅 발급 버튼 노출 범위:
    // - "스트럭처 섹션 시작" ~ "화이트페이퍼 섹션 진입 직전"까지만 노출(백스크롤 포함)
    const startEl = document.querySelector('#structure') || document.querySelector('.structure-section');
    const whitepaperSection = document.querySelector('.whitepaper-section');
    const endEl =
        whitepaperSection ||
        document.querySelector('.roadmap-end-anchor') ||
        document.querySelector('#roadmap .roadmap-timeline');
    const updateMobileIssueVisibility = () => {
        if (!mobileIssueBtn || !startEl || !endEl) return;

        // 768px 이하에서만 제어
        if (window.innerWidth > 768) {
            mobileIssueBtn.classList.remove('is-hidden');
            mobileIssueBtn.classList.remove('is-faded');
            return;
        }

        const y = window.pageYOffset || 0;
        const startTop = startEl.getBoundingClientRect().top + y;

        // ✅ 화이트페이퍼에서 계속 보이는 케이스 방지:
        // - endTop 절대좌표 비교가 환경에 따라 흔들릴 수 있어,
        //   whitepaper가 뷰포트에 "진입"하면 무조건 숨김 처리(가장 확실)
        const wpHideBufferPx = 80; // 화이트페이퍼 진입 전 여유(필요 시 미세조정)
        const wpEntered = !!whitepaperSection && (whitepaperSection.getBoundingClientRect().top <= (window.innerHeight - wpHideBufferPx));

        // endEl이 타임라인인 경우: bottom 기준, anchor인 경우: top 기준
        const endRect = endEl.getBoundingClientRect();
        const endTop = (endEl.classList && endEl.classList.contains('roadmap-end-anchor'))
            ? (endRect.top + y)
            : (endRect.bottom + y);

        const inRange = (y >= (startTop - 1)) && !wpEntered && (y < (endTop - 1));

        if (inRange) {
            mobileIssueBtn.classList.remove('is-hidden');
        mobileIssueBtn.classList.remove('is-faded');
        } else {
            // ✅ 범위 밖에서는 완전 숨김(클릭/터치 불가)
            mobileIssueBtn.classList.add('is-hidden');
        }
    };

    const handleResize = () => {
        // 768px 초과로 올라가면(태블릿/데스크탑) 모바일 메뉴는 강제 닫기
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
        updateMobileIssueVisibility();
    };

    updateMobileIssueVisibility();
    window.addEventListener('scroll', updateMobileIssueVisibility, { passive: true });
    window.addEventListener('resize', handleResize);

    // ✅ Hero(최상단)에서 pull-to-refresh가 가능하도록: 스와이프 구간에서 페이지가 내려가 버리는 것을 방지
    // - Hero/비전 구간에서는 원칙적으로 pageYOffset이 0이어야 함(Structure는 slogan unlock 이후)
    // - 단, heroPulling 중에는 pull-to-refresh 제스처를 위해 예외 처리
    window.addEventListener('scroll', () => {
        if (hvStructureRevealActive) return;
        if (!USE_HV_SWIPER_PAGING || !hvSwiper) return;
        if (hvHeroPulling) return;
        const idx = hvSwiper.activeIndex ?? 0;
        const last = hvSwiper.slides ? hvSwiper.slides.length - 1 : 3;
        if (idx < last && !hvCanScrollToStructure) {
            if ((window.pageYOffset || 0) > 0) scrollToInstantGlobal(0);
        }
    }, { passive: true });
});

// Vision Section Parallax Scroll (1000vh)
let visionTicking = false;
let lastVisionScrollProgress = -1; // 이전 스크롤 진행도 추적
let visionMenuReplayLockUntil = 0; // 메뉴 클릭 직후 Vision 상태 덮어쓰기 방지(ms)

// ✅ 비전 25%~58% 구간 "원샷 자동 재생" 제어
// - 의도: 사용자가 한 번 스크롤로 25%에 진입하면, 25%→58% 구간을 자동으로 스크롤(=재생)해서
//   해당 구간의 텍스트 전환 모션을 "실시간 스크롤"이 아닌 "자동 재생"처럼 보이게 처리
// - 구현: 25% 진입(또는 58% 진입) 순간을 감지 → 사용자 스크롤 잠금 → window.scrollTo 애니메이션
let visionAutoMidIsPlaying = false;
let visionAutoMidRafId = 0;
let visionAutoMidLockUntil = 0;
// ✅ Swiper 풀페이징을 사용하는 경우에는 기존 바닐라 스텝 페이징 로직은 완전히 비활성화(충돌 방지)
const VISION_AUTO_STEPS_ENABLED = !USE_HV_SWIPER_PAGING;
const VISION_STEP_DURATION_MS = 980;          // ✅ 자동 스크롤 1회 재생 길이(원하면 미세조정)

// ✅ GNB(Vision) 클릭과 동일한 "도착 시점"을 만들기 위한 기준값
// - GNB 코드에서 사용하던 값과 반드시 동일해야 스냅이 흔들리지 않음
const VISION_GNB_TOP_MARGIN_PX = 24;                 // 1.5rem (GNB 상단 마진)
const VISION_ANCHOR_ADDITIONAL_OFFSET_PX = 500;      // GNB '#vision' 추가 오프셋과 동일

// ✅ 단계 타겟(progress)
// - progress는 (비전 섹션 top이 화면 상단에 닿은 시점)부터 0~1로 계산됨
// - 0.25는 1번 텍스트 "표시 구간"의 마지막 프레임을 유지하기 위해 포함(<=0.25로 조건 조정)
const VISION_STEP1_TO = 0.25;                 // Hero → Vision(1번 텍스트 유지 지점)

// ✅ 2번 텍스트 "등장" 시점(코드 기준)
// - 2번 텍스트는 0.33~0.58 구간에서 segmentProgress > 0.15일 때 animate가 붙음
// - 즉, 0.33 + 0.25 * 0.15 = 0.3675 근처가 "2번 등장" 타이밍
// - 안전하게 조금 더 지나서(여유) 고정
const VISION_STEP2_TO = 0.375;                // 25% 지점 → 2번 텍스트 등장+유지 지점

// ✅ 3번 텍스트 등장/표시 + 비디오→이미지 디졸브 완료 지점
// - 66~100 구간에서 segmentProgress > 0.15일 때 3번 animate가 붙음
// - 0.66 + 0.34*0.15 = 0.711 근처
// - 디졸브가 충분히 끝난 상태로 고정하기 위해 여유로 0.75 사용
const VISION_STEP3_TO = 0.75;

// ✅ 단계 상태(0=Hero, 1=Vision 25% 고정, 2=2번 텍스트 고정, 3=3번 텍스트 고정)
let visionStepIndex = 0;
let visionTouchStartY = null;
let visionTouchConsumed = false;
let heroScrollStepArmed = true; // ✅ 히어로에서 "첫 스크롤 의도" 감지용
let lastGlobalScrollY = window.pageYOffset;

// ✅ 백스크롤(역방향) 페이징이 너무 빨리 걸리는 문제 보정용
// - 목적: "정상 스크롤처럼" 콘텐츠가 조금 더 유지된 뒤 스냅되도록(즉시 점프 방지)
// - 방식: 역방향 입력(delta/drag)을 누적해서 임계치에 도달했을 때만 1단계 스냅
let visionBackAcc = 0;
let visionBackAccAt = 0;
const VISION_BACK_ACC_WINDOW_MS = 260;  // 이 시간 내 입력을 하나의 "의도"로 묶음
const VISION_BACK_ACC_THRESHOLD = 200; // 클수록 더 오래 유지(더 많이 스크롤해야 스냅)
const VISION_BACK_TOUCH_THRESHOLD_PX = 80; // 터치 역방향 스냅 임계치(클수록 더 오래 유지)

// ✅ "역재생처럼" 부드러운 백스크롤을 위한 전용 duration
// - 3번(슬로건) → 2번(비전 2) 전환에서 특히 체감이 큼
const VISION_STEP_BACK_DURATION_MS = 1250;

// ✅ 3번(슬로건) → 2번(비전2) 백스크롤은 "여유"를 더 주기 위한 별도 임계치
// - 지금은 바로 역재생이 시작되어 갑작스럽게 느껴질 수 있으므로,
//   이 값만큼은 더 스크롤해야 전환이 시작되도록 함
let visionBackSloganAcc = 0;
let visionBackSloganAccAt = 0;
const VISION_BACK_SLOGAN_ACC_WINDOW_MS = 320;
const VISION_BACK_SLOGAN_ACC_THRESHOLD = 280;
const VISION_BACK_SLOGAN_TOUCH_THRESHOLD_PX = 140;

function getWheelAbsDeltaY(e) {
    // ✅ 휠 델타 정규화(디바이스별 delta 단위 차이 보정)
    // - deltaMode: 0(px), 1(line), 2(page)
    let dy = Math.abs(e.deltaY);
    if (e.deltaMode === 1) dy *= 16; // line → px 근사치
    else if (e.deltaMode === 2) dy *= window.innerHeight; // page → px 근사치
    return dy;
}

function resetVisionBackAccumulators() {
    // ✅ 누적값이 남아있으면 다음 백스크롤에서 "갑자기" 넘어가는 느낌이 날 수 있어 초기화
    visionBackAcc = 0;
    visionBackAccAt = 0;
    visionBackSloganAcc = 0;
    visionBackSloganAccAt = 0;
}

function getAbsTop(el) {
    const r = el.getBoundingClientRect();
    return r.top + window.pageYOffset;
}

// ✅ 히어로/비전 스텝 제어 구간 상태(경계 떨림 방지용 히스테리시스)
// - structure 섹션이 뷰포트에 '살짝' 걸칠 때 true/false가 빠르게 토글되면 wheel/touch preventDefault가 반복되어
//   슬로우 모션/떨림 체감이 생길 수 있음.
// - 아래 상태 머신은 한 번 '자연 스크롤'로 넘어가면, structure가 충분히 위로 빠질 때까지 다시 스텝 제어를 켜지 않음.
let hvZoneState = true;

function isInHeroVisionZone() {
    // ✅ 스텝(휠/터치 가로채기) 적용 범위 제한
    // - 히어로~비전 구간에서만 스텝 스크롤을 적용하고
    // - Structure 섹션 이후부터는 "자연 스크롤"로 복귀
    const visionSection = document.querySelector('.vision-section');
    if (!visionSection) return false;

    const structureSection = document.querySelector('#structure');
    if (!structureSection) return true;

    const r = structureSection.getBoundingClientRect();
    const vh = window.innerHeight || 0;

    // 히스테리시스 임계값
    // - OFF: structure가 충분히 들어왔을 때(상단이 화면 상단 쪽으로 진입)
    // - ON : structure가 충분히 빠졌을 때(상단이 화면 아래로 내려감)
    const OFF_TOP_THRESHOLD = vh * 0.20; // structure top 이 뷰포트 상단 20% 안쪽으로 들어오면 HV 제어 해제
    const ON_TOP_THRESHOLD  = vh * 0.55; // structure top 이 뷰포트 높이의 55% 아래로 내려가면 HV 제어 재활성

    if (hvZoneState) {
        // HV 제어가 켜진 상태 → structure가 '확실히' 들어오면 끔
        if (r.top <= OFF_TOP_THRESHOLD) hvZoneState = false;
    } else {
        // HV 제어가 꺼진 상태(자연 스크롤) → structure가 '확실히' 빠지면 다시 켬
        if (r.top >= ON_TOP_THRESHOLD) hvZoneState = true;
    }

    return hvZoneState;
}

function isSloganActiveNow() {
    // ✅ 슬로건(비디오→이미지 디졸브/3번 텍스트) 구간이 실제로 활성화된 상태인지
    // - 구조 섹션에서 백스크롤 시: 슬로건이 화면에 다시 등장한 이후부터만 페이징 백스크롤을 적용하기 위함
    const c = document.querySelector('.vision-image-container');
    if (!c) return false;
    if (!c.classList.contains('active')) return false;
    // 인라인 opacity가 없을 수도 있어 computed까지 확인
    const inlineOpacity = parseFloat(c.style.opacity || '');
    const computedOpacity = parseFloat(getComputedStyle(c).opacity || '0');
    const o = Number.isFinite(inlineOpacity) ? inlineOpacity : computedOpacity;
    return o > 0.2;
}

function getVisionAnchorTopLikeGnb() {
    // ✅ GNB에서 #vision 클릭했을 때와 동일한 타겟 좌표 계산
    // - .vision-intro-anchor가 있으면 그 위치를, 없으면 .vision-text-1을 사용
    const targetSection = document.querySelector('#vision') || document.querySelector('.vision-section');
    if (!targetSection) return null;

    const introAnchor =
        targetSection.querySelector('.vision-intro-anchor') ||
        targetSection.querySelector('.vision-text-1') ||
        targetSection;

    const gnb = document.querySelector('.gnb');
    const gnbHeight = gnb ? gnb.offsetHeight : 0;

    const rect = introAnchor.getBoundingClientRect();
    const absoluteTop = rect.top + window.pageYOffset;
    const scrollTop = absoluteTop - gnbHeight - VISION_GNB_TOP_MARGIN_PX + VISION_ANCHOR_ADDITIONAL_OFFSET_PX;
    return Math.max(0, scrollTop);
}

function goToVisionStep1LikeGnb() {
    const visionSection = document.querySelector('.vision-section');
    if (!visionSection) return;
    const top = getVisionAnchorTopLikeGnb();
    if (top == null) return;
    startVisionAutoStepToTop(top, 1);
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getVisionScrollTopByProgress(visionSection, progress) {
    // progress: 0~1 (비전 섹션 상단 고정 이후 진행률)
    const rect = visionSection.getBoundingClientRect();
    const sectionTopAbs = rect.top + window.pageYOffset;
    const sectionHeight = visionSection.offsetHeight;
    const windowHeight = window.innerHeight;
    const travel = Math.max(1, sectionHeight - windowHeight);
    return sectionTopAbs + progress * travel;
}

function startVisionAutoStepToTop(targetTop, nextStepIndex, durationMs = VISION_STEP_DURATION_MS) {
    // ✅ progress 기반이 아닌 "절대 좌표(top)" 기반 스텝
    // - 히어로 → 비전 1단계는 GNB 클릭 기준 좌표로 맞추기 위해 이 방식이 필요
    if (!VISION_AUTO_STEPS_ENABLED) return;
    if (visionAutoMidIsPlaying) return;

    // ✅ 자동 전환 시작 시 누적값 초기화(다음 입력에 영향 없게)
    resetVisionBackAccumulators();

    visionAutoMidIsPlaying = true;
    visionAutoMidLockUntil = performance.now() + durationMs + 520;

    animateWindowScrollTo(targetTop, durationMs, () => {
        visionAutoMidIsPlaying = false;
        if (typeof nextStepIndex === 'number') visionStepIndex = nextStepIndex;
    });
}

function animateWindowScrollTo(targetTop, durationMs, onDone) {
    // 전역 scroll-behavior:smooth 영향 제거
    const prevHtml = document.documentElement.style.scrollBehavior;
    const prevBody = document.body.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';

    const startTop = window.pageYOffset;
    const finalTop = Math.max(0, targetTop);
    const delta = finalTop - startTop;
    const startTime = performance.now();

    const step = (now) => {
        const t = Math.min(1, (now - startTime) / Math.max(1, durationMs));
        const eased = easeInOutCubic(t);
        window.scrollTo(0, startTop + delta * eased);
        if (t < 1) {
            visionAutoMidRafId = requestAnimationFrame(step);
            return;
        }
        // ✅ 마지막 프레임에서 목표 좌표로 "정확히" 스냅
        // - 트랙패드 관성/부동소수점 오차로 0.25 같은 경계값이 미세하게 넘어가
        //   다음 구간 조건을 타는 현상(스냅 지점이 달라 보이는 문제)을 방지
        window.scrollTo(0, finalTop);
        // 원복
        document.documentElement.style.scrollBehavior = prevHtml;
        document.body.style.scrollBehavior = prevBody;
        if (typeof onDone === 'function') onDone();
    };

    visionAutoMidRafId = requestAnimationFrame(step);
}

function stopVisionAutoMidPlayback() {
    if (visionAutoMidRafId) cancelAnimationFrame(visionAutoMidRafId);
    visionAutoMidRafId = 0;
    visionAutoMidIsPlaying = false;
    visionAutoMidLockUntil = 0;
}

// ✅ 탑(히어로)로 복귀했을 때 단계/락을 확실히 리셋해서
//   다음 정방향 스크롤에서도 항상 동일한 스냅 지점이 나오도록 보장
function resetVisionAutoStepsIfAboveVision() {
    if (!VISION_AUTO_STEPS_ENABLED) return;
    const visionSection = document.querySelector('.vision-section');
    if (!visionSection) return;
    const rect = visionSection.getBoundingClientRect();
    const sectionTopAbs = rect.top + window.pageYOffset;
    // ✅ 자동 스텝 스크롤이 재생 중이면 리셋 로직이 끼어들면 안 됨
    // - 히어로→비전 자동 이동 중에는 pageYOffset가 "비전 섹션 top"보다 작기 때문에
    //   아래 조건이 매 프레임 성립해서 재생이 즉시 중단되는 버그가 발생했음
    if (visionAutoMidIsPlaying || (visionAutoMidLockUntil && performance.now() < visionAutoMidLockUntil)) {
        return;
    }
    // 비전 섹션 시작보다 위로 올라오면(=히어로로 복귀) 단계 초기화
    if (window.pageYOffset < sectionTopAbs - 4) {
        if (visionStepIndex !== 0) visionStepIndex = 0;
    }
}

// 스크롤/리사이즈 시에도 상태를 동기화(휠 이벤트가 없어도 리셋되게)
window.addEventListener('scroll', () => {
    resetVisionAutoStepsIfAboveVision();
}, { passive: true });

// ✅ 히어로에서 "콘텐츠 소비를 위한 첫 스크롤"이 발생하는 순간,
//    GNB > Vision 클릭과 동일한 시점으로 자동 이동(휠/키보드/스크롤바 드래그 등 입력 방식 무관)
window.addEventListener('scroll', () => {
    if (!VISION_AUTO_STEPS_ENABLED) {
        lastGlobalScrollY = window.pageYOffset;
        return;
    }
    if (!isInHeroVisionZone()) {
        lastGlobalScrollY = window.pageYOffset;
        return;
    }
    if (visionAutoMidIsPlaying || (visionAutoMidLockUntil && performance.now() < visionAutoMidLockUntil)) {
        lastGlobalScrollY = window.pageYOffset;
        return;
    }

    const y = window.pageYOffset;
    const isDown = y > lastGlobalScrollY;
    lastGlobalScrollY = y;

    const heroSection = document.querySelector('.hero-section');
    const visionSection = document.querySelector('.vision-section');
    if (!heroSection || !visionSection) return;

    const heroTopAbs = getAbsTop(heroSection);
    const heroBottomAbs = heroTopAbs + heroSection.offsetHeight;

    // 히어로 최상단으로 돌아오면 다시 1단계 트리거를 "재무장"
    if (y <= 2) heroScrollStepArmed = true;

    // 히어로 구간에서 아래로 스크롤 의도가 처음 감지되면 1단계 자동 이동 실행
    // - 아주 조금만 내려가도(입력 방식에 따라 wheel handler가 못 잡는 경우) 동일하게 처리
    if (heroScrollStepArmed && visionStepIndex === 0 && isDown && y > 2 && y < (heroBottomAbs - 4)) {
        heroScrollStepArmed = false;
        goToVisionStep1LikeGnb();
    }
}, { passive: true });

window.addEventListener('resize', () => {
    resetVisionAutoStepsIfAboveVision();
});

function getVisionProgressNow(visionSection) {
    if (!visionSection) return null;
    const rect = visionSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const sectionHeight = visionSection.offsetHeight;
    const isActive = rect.top <= 0 && rect.bottom > 0;
    if (!isActive) return null;
    const scrollFromTop = Math.abs(rect.top);
    return Math.max(0, Math.min(1, scrollFromTop / Math.max(1, (sectionHeight - windowHeight))));
}

function startVisionAutoStep(visionSection, toProgress, nextStepIndex, durationMs = VISION_STEP_DURATION_MS) {
    if (!visionSection) return;
    if (!VISION_AUTO_STEPS_ENABLED) return;
    if (visionAutoMidIsPlaying) return;

    // ✅ 자동 전환 시작 시 누적값 초기화(다음 입력에 영향 없게)
    resetVisionBackAccumulators();

    visionAutoMidIsPlaying = true;
    // ✅ 자동 재생 중 사용자 스크롤 개입 방지(살짝 여유 포함)
    // - 트랙패드/관성 스크롤로 이벤트가 연속 발생하는 경우가 있어, 버퍼를 넉넉히 둠
    visionAutoMidLockUntil = performance.now() + durationMs + 520;

    const targetTop = getVisionScrollTopByProgress(visionSection, toProgress);
    animateWindowScrollTo(targetTop, durationMs, () => {
        visionAutoMidIsPlaying = false;
        // ✅ 단계 업데이트(자동 스크롤 종료 후 고정 상태)
        if (typeof nextStepIndex === 'number') {
            visionStepIndex = nextStepIndex;
        }
    });
}

// ✅ 자동 재생 중에는 휠/터치 스크롤 입력을 막아서 "한 번 스크롤 = 자동 재생" 느낌을 유지
// (passive:false가 필요)
window.addEventListener('wheel', (e) => {
    if (!VISION_AUTO_STEPS_ENABLED) return;
    // ✅ 히어로/비전 구간이 아니면 스크롤 개입 금지(전역 스크롤 막힘 방지)
    if (!isInHeroVisionZone()) return;
    if (!visionAutoMidIsPlaying && !(visionAutoMidLockUntil && performance.now() < visionAutoMidLockUntil)) return;
    e.preventDefault();
}, { passive: false, capture: true });

window.addEventListener('touchmove', (e) => {
    if (!VISION_AUTO_STEPS_ENABLED) return;
    // ✅ 히어로/비전 구간이 아니면 터치 스크롤 개입 금지(전역 스크롤 막힘 방지)
    if (!isInHeroVisionZone()) return;
    if (!visionAutoMidIsPlaying && !(visionAutoMidLockUntil && performance.now() < visionAutoMidLockUntil)) return;
    e.preventDefault();
}, { passive: false, capture: true });

// ✅ "원 스크롤 = 원 단계" 트리거(휠)
window.addEventListener('wheel', (e) => {
    if (!VISION_AUTO_STEPS_ENABLED) return;
    // ✅ 히어로/비전 구간이 아니면 자연 스크롤
    if (!isInHeroVisionZone()) return;
    if (visionAutoMidIsPlaying) return;
    if (visionAutoMidLockUntil && performance.now() < visionAutoMidLockUntil) return;

    const visionSection = document.querySelector('.vision-section');
    if (!visionSection) return;

    // Hero에 다시 올라오면 단계 리셋(다시 1단계부터 가능)
    // - 기존 -20px 여유는 상황에 따라 리셋이 늦어서 "스냅 지점이 바뀐 것처럼" 느껴질 수 있어 -4px로 타이트하게
    resetVisionAutoStepsIfAboveVision();

    // ✅ 위로 스크롤(백스크롤)도 단계 단위로 되돌리기
    // - 요구사항: 역방향으로 이동한 만큼 똑같이 되돌리기(1회 스크롤 = 1단계)
    if (e.deltaY < 0) {
        // ✅ 구조 섹션에서 백스크롤할 때는 "자연스럽게 하강(역방향 스크롤)"해야 함
        // - 슬로건(66~100, 이미지/3번)이 화면에 다시 등장한 이후부터만 페이징 백스크롤을 적용
        if (visionStepIndex >= 2 && !isSloganActiveNow()) {
            return; // 자연 스크롤 유지
        }
        if (visionStepIndex >= 1) {
            // ✅ 역방향은 즉시 스냅하지 말고 "의도"가 충분할 때만 스냅
            // - 이 구간에서는 기본 스크롤을 막아(콘텐츠 유지), 누적 임계치 도달 시에만 스냅
            e.preventDefault();

            // ✅ 3번(슬로건)에서의 백스크롤은 "등장 모션 역재생" 체감이 중요하므로
            // - (요구) 2번으로 넘어가기 전 "여유"를 더 주기 위해, 슬로건 전용 임계치로 누적 후 전환
            if (visionStepIndex === 3) {
                const now = performance.now();
                if (!visionBackSloganAccAt || (now - visionBackSloganAccAt) > VISION_BACK_SLOGAN_ACC_WINDOW_MS) {
                    visionBackSloganAcc = 0;
                }
                visionBackSloganAccAt = now;
                visionBackSloganAcc += getWheelAbsDeltaY(e);

                // 슬로건 구간에서는 조금 더 스크롤해야 2번으로 넘어가도록 "여유" 제공
                if (visionBackSloganAcc < VISION_BACK_SLOGAN_ACC_THRESHOLD) {
                    return;
                }

                visionBackSloganAcc = 0;
                startVisionAutoStep(visionSection, VISION_STEP2_TO, 2, VISION_STEP_BACK_DURATION_MS);
                return;
            }

            const now = performance.now();
            if (!visionBackAccAt || (now - visionBackAccAt) > VISION_BACK_ACC_WINDOW_MS) {
                visionBackAcc = 0;
            }
            visionBackAccAt = now;
            visionBackAcc += getWheelAbsDeltaY(e);

            // 임계치 미만이면 "유지"만 하고 종료(점프 방지)
            if (visionBackAcc < VISION_BACK_ACC_THRESHOLD) {
                return;
            }

            // 임계치 도달 → 스냅 실행 후 누적 초기화
            visionBackAcc = 0;
            if (visionStepIndex === 1) {
                // 1단계 → 히어로 탑
                startVisionAutoStepToTop(0, 0, VISION_STEP_BACK_DURATION_MS);
            } else if (visionStepIndex === 2) {
                // 2단계 → 1단계(GNB Vision 클릭 기준)
                const top = getVisionAnchorTopLikeGnb();
                if (top != null) startVisionAutoStepToTop(top, 1, VISION_STEP_BACK_DURATION_MS);
            }
            return;
        }
        return;
    }

    // 아래로만 단계 트리거(요구사항)
    if (e.deltaY <= 0) return;

    // ✅ 정방향 입력이 들어오면 역방향 누적은 의미가 없으므로 초기화
    resetVisionBackAccumulators();

    // 1) Hero → Vision 25% 고정
    if (visionStepIndex === 0) {
        e.preventDefault();
        // ✅ 히어로 첫 스크롤은 "GNB > Vision 클릭"과 동일한 시점으로 이동
        goToVisionStep1LikeGnb();
        return;
    }

    // 너무 미세한 트랙패드 델타는 무시(오작동 방지)
    // - 단, 히어로(1단계 진입)에서는 위에서 이미 처리했으므로 여기서부터 적용
    if (Math.abs(e.deltaY) < 6) return;

    // 비전 내부 단계는 progress 기반으로만 트리거(섹션 top이 화면 상단에 닿은 뒤)
    const p = getVisionProgressNow(visionSection);
    if (p == null) return;

    // 2) 25% 고정 → 2번 텍스트 등장/유지 지점 고정
    if (visionStepIndex === 1) {
        e.preventDefault();
        startVisionAutoStep(visionSection, VISION_STEP2_TO, 2);
        return;
    }

    // 3) 2번 텍스트 고정 → 2번 아웃 + 디졸브 + 3번 등장/표시 지점 고정
    if (visionStepIndex === 2) {
        e.preventDefault();
        startVisionAutoStep(visionSection, VISION_STEP3_TO, 3);
        return;
    }
}, { passive: false, capture: true });

// ✅ "원 스크롤 = 원 단계" 트리거(터치: 첫 움직임만 소비)
window.addEventListener('touchstart', (e) => {
    if (!VISION_AUTO_STEPS_ENABLED) return;
    // ✅ 히어로/비전 구간이 아니면 터치 스텝 제어를 시작하지 않음
    if (!isInHeroVisionZone()) return;
    if (!e.touches || !e.touches.length) return;
    visionTouchStartY = e.touches[0].clientY;
    visionTouchConsumed = false;
}, { passive: true, capture: true });

window.addEventListener('touchmove', (e) => {
    if (!VISION_AUTO_STEPS_ENABLED) return;
    // ✅ 히어로/비전 구간이 아니면 자연 스크롤
    if (!isInHeroVisionZone()) return;
    if (visionAutoMidIsPlaying) return;
    if (visionAutoMidLockUntil && performance.now() < visionAutoMidLockUntil) return;
    if (visionTouchStartY == null || visionTouchConsumed) return;
    if (!e.touches || !e.touches.length) return;

    const y = e.touches[0].clientY;
    const dy = y - visionTouchStartY;
    // 손가락이 위로 움직이면(dy<0) 페이지는 아래로 스크롤 의도
    if (Math.abs(dy) < 12) return;

    const visionSection = document.querySelector('.vision-section');
    if (!visionSection) return;

    // Hero에 다시 올라오면 단계 리셋
    resetVisionAutoStepsIfAboveVision();

    // ✅ 역방향(손가락 아래로, dy>0)도 단계 단위로 되돌리기
    if (dy > 0) {
        // ✅ 너무 민감하게 바로 스냅되지 않도록 임계치 적용
        // - 3번(슬로건) → 2번은 더 "여유"가 필요하므로 별도 임계치 적용
        if (visionStepIndex === 3) {
            if (Math.abs(dy) < VISION_BACK_SLOGAN_TOUCH_THRESHOLD_PX) return;
        } else {
            if (Math.abs(dy) < VISION_BACK_TOUCH_THRESHOLD_PX) return;
        }

        visionTouchConsumed = true;
        e.preventDefault();

        if (visionStepIndex === 1) {
            startVisionAutoStepToTop(0, 0, VISION_STEP_BACK_DURATION_MS);
            return;
        }
        if (visionStepIndex === 2) {
            const top = getVisionAnchorTopLikeGnb();
            if (top != null) startVisionAutoStepToTop(top, 1, VISION_STEP_BACK_DURATION_MS);
            return;
        }
        if (visionStepIndex === 3) {
            // ✅ 3번 → 2번: 느린 역재생(디졸브/텍스트 하강이 자연스럽게 보이도록)
            startVisionAutoStep(visionSection, VISION_STEP2_TO, 2, VISION_STEP_BACK_DURATION_MS);
            return;
        }
        return;
    }

    // ✅ 정방향(손가락 위로, dy<0)
    visionTouchConsumed = true;
    e.preventDefault();
    if (visionStepIndex === 0) {
        // 히어로 첫 스크롤은 "GNB > Vision 클릭"과 동일한 시점으로 이동
        goToVisionStep1LikeGnb();
        return;
    }
    // 비전 내부 단계는 progress가 유효할 때만
    const p = getVisionProgressNow(visionSection);
    if (p == null) return;

    if (visionStepIndex === 1) {
        startVisionAutoStep(visionSection, VISION_STEP2_TO, 2);
        return;
    }
    if (visionStepIndex === 2) {
        startVisionAutoStep(visionSection, VISION_STEP3_TO, 3);
        return;
    }
}, { passive: false, capture: true });

window.addEventListener('touchend', () => {
    visionTouchStartY = null;
    visionTouchConsumed = false;
}, { passive: true, capture: true });

window.addEventListener('touchcancel', () => {
    visionTouchStartY = null;
    visionTouchConsumed = false;
}, { passive: true, capture: true });

// 비전 섹션 비디오 소스 (모바일/데스크탑 분기)
// - 768px 이하: global_video_m.mp4
// - 그 외: global_video.mp4
const VISION_VIDEO_DESKTOP_SRC = 'img/global_video.mp4';
const VISION_VIDEO_MOBILE_SRC = 'img/global_video_m.mp4';
let lastVisionVideoSrc = null;

// 비전 섹션 이미지 소스 (모바일/데스크탑 분기)
// - 768px 이하: vision_sjw_m.jpg
// - 그 외: vision_sjw.jpg

// ---------------------------------------------------------------------
// Vision 이미지/리소스 프리로드 (전환 시 끊김 방지)
// ---------------------------------------------------------------------
function preloadVisionAssets() {
    try {
        // 중복 실행 방지
        if (window.__SJW_VISION_ASSETS_PRELOADED__) return;
        window.__SJW_VISION_ASSETS_PRELOADED__ = true;

        const head = document.head || document.getElementsByTagName('head')[0];

        // <link rel="preload"> 로 브라우저에 힌트 제공 (지원 브라우저에서 효과)
        const ensurePreload = (as, href, type) => {
            if (!href) return;
            const selector = `link[rel="preload"][as="${as}"][href="${href}"]`;
            if (head && !head.querySelector(selector)) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = as;
                link.href = href;
                if (type) link.type = type;
                head.appendChild(link);
            }
        };

        ensurePreload('image', VISION_IMAGE_DESKTOP_SRC);
        ensurePreload('image', VISION_IMAGE_MOBILE_SRC);

        // 실제 프리로드(캐시 적재) - 슬로건 전환 직전 프레임 드랍 방지
        const imgA = new Image();
        imgA.decoding = 'async';
        imgA.src = VISION_IMAGE_DESKTOP_SRC;

        const imgB = new Image();
        imgB.decoding = 'async';
        imgB.src = VISION_IMAGE_MOBILE_SRC;

        // 비전 이미지 엘리먼트에도 디코딩 힌트(지원 브라우저에서만)
        const el = document.querySelector('.vision-image');
        if (el) {
            el.decoding = 'async';
            // 전환 직전에 로딩이 걸리지 않도록 eager 힌트
            el.loading = 'eager';
        }
    } catch (e) {
        // fail-safe: 프리로드 실패해도 기능에는 영향 없게
        console.warn('[SJW] preloadVisionAssets failed:', e);
    }
}

const VISION_IMAGE_DESKTOP_SRC = 'img/vision_sjw.jpg';
const VISION_IMAGE_MOBILE_SRC = 'img/vision_sjw_m.jpg';
let lastVisionImageSrc = null;

function updateVisionVideoSource(isActive) {
    // 비전이 활성화된 경우에만 소스를 교체 (불필요한 reload 방지)
    if (!isActive) return;

    const video = document.querySelector('.vision-video');
    if (!video) return;

    const source = video.querySelector('source');
    if (!source) return;

    const isMobile = window.innerWidth <= 768;
    const desiredSrc = isMobile ? VISION_VIDEO_MOBILE_SRC : VISION_VIDEO_DESKTOP_SRC;

    // 이미 원하는 소스면 아무것도 하지 않음
    if (lastVisionVideoSrc === desiredSrc) return;

    // 현재 src와 다를 때만 교체
    if (source.getAttribute('src') !== desiredSrc) {
        const wasPlaying = !video.paused;
        source.setAttribute('src', desiredSrc);
        lastVisionVideoSrc = desiredSrc;

        // 소스 교체 후 reload
        video.load();

        // 재생 중이었다면 다시 재생 시도
        if (wasPlaying) {
            video.play().catch(() => {});
        }
    }
}

function updateVisionImageSource() {
    const img = document.querySelector('.vision-image');
    if (!img) return;

    const isMobile = window.innerWidth <= 768;
    const desiredSrc = isMobile ? VISION_IMAGE_MOBILE_SRC : VISION_IMAGE_DESKTOP_SRC;

    if (lastVisionImageSrc === desiredSrc) return;
    if (img.getAttribute('src') !== desiredSrc) {
        img.setAttribute('src', desiredSrc);
        lastVisionImageSrc = desiredSrc;
    }
}

function updateVisionParallax() {
    // ✅ Swiper 풀페이징 사용 시: 스크롤 기반 패럴럭스 로직은 사용하지 않음(충돌 방지)
    if (USE_HV_SWIPER_PAGING) return;
    visionTicking = false;
    
    const visionSection = document.querySelector('.vision-section');
    if (!visionSection) return;
    
    const rect = visionSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const sectionHeight = visionSection.offsetHeight;
    
    // 비전 섹션이 화면 상단에 도달했는지 확인 (y 좌표가 0 이하)
    const isVisionSectionActive = rect.top <= 0;
    
    // 비전 섹션 비디오 컨테이너 활성화
    const visionVideoContainer = document.querySelector('.vision-video-container');
    
    if (visionVideoContainer) {
        if (isVisionSectionActive && rect.bottom > 0) {
            visionVideoContainer.classList.add('active');
            // 모바일(768px 이하)에서는 global_video_m.mp4 사용
            updateVisionVideoSource(true);
        } else {
            visionVideoContainer.classList.remove('active');
        }
    }
    
    // 비전 섹션이 화면 상단에 도달한 후부터 패럴럭스 시작
        if (isVisionSectionActive && rect.bottom > 0) {
        // ✅ 메뉴로 Vision 진입 직후에는 scroll 이벤트로 상태가 다시 덮어써지는 것을 잠깐 방지
        // - 앵커 오프셋(추가 오프셋)이 조금 깊어도, "첫 문구" 리셋/재생이 확실히 보이도록 함
        if (visionMenuReplayLockUntil && performance.now() < visionMenuReplayLockUntil) {
            const visionText1 = document.querySelector('.vision-text-1');
            const visionText2 = document.querySelector('.vision-text-2');
            const title1 = document.querySelector('.vision-title-1');
            const title2 = document.querySelector('.vision-title-2');
            const video = document.querySelector('.vision-video');

            if (visionText1) visionText1.classList.add('active');
            if (visionText2) visionText2.classList.remove('active');

            if (title1) {
                title1.classList.remove('enter', 'exit');
                title1.classList.add('animate');
            }
            if (title2) title2.classList.remove('animate', 'enter', 'exit');
            if (video) video.classList.remove('hidden');
            return;
        }

        // 비전 섹션이 화면 상단에 도달한 시점부터의 스크롤 진행도 계산
        const scrollFromTop = Math.abs(rect.top);
        const scrollProgress = Math.max(0, Math.min(1, scrollFromTop / (sectionHeight - windowHeight)));
        
        // 스크롤 방향 판단
        const prevProgress = lastVisionScrollProgress;
        const isScrollingDown = prevProgress === -1 || scrollProgress > prevProgress;
        lastVisionScrollProgress = scrollProgress;

        // ✅ 자동 스크롤 단계 트리거는 wheel/touch 이벤트에서 처리(여기서는 시각 상태만 계산)
        
        const video = document.querySelector('.vision-video');
        const visionText1 = document.querySelector('.vision-text-1');
        const visionText2 = document.querySelector('.vision-text-2');
        const title1 = document.querySelector('.vision-title-1');
        const title2 = document.querySelector('.vision-title-2');
        const visionImageContainer = document.querySelector('.vision-image-container');
        const visionText3 = document.querySelector('.vision-text-3');
        const title3 = document.querySelector('.vision-title-3');
        
        // 구간 분할(요구사항): 각 텍스트가 충분한 시간을 가지도록
        // 0-25%: 첫 번째 텍스트 등장 및 표시
        // 25-33%: 첫 번째 텍스트 사라짐
        // 33-58%: 두 번째 텍스트 등장 및 표시
        // 58-66%: 두 번째 텍스트 사라짐
        // 66-100%: 세 번째 텍스트 등장 및 표시 + 이미지 전환
        
        // 첫 번째 텍스트 구간 (0-25%) : 0.25는 "유지 지점"이라 포함(<=)
        if (scrollProgress >= 0 && scrollProgress <= 0.25) {
            const segmentProgress = scrollProgress / 0.25;
            
            if (visionText1 && title1) {
                visionText1.classList.add('active');
                
                if (isScrollingDown) {
                    // 아래로 스크롤: 텍스트 등장 (바텀->탑)
                    if (segmentProgress > 0.15 && !title1.classList.contains('animate') && !title1.classList.contains('exit')) {
                        title1.classList.remove('enter', 'exit');
                        title1.classList.add('animate');
                    }
                } else {
                    // 위로 스크롤: 구간의 끝부분에서만 사라짐 (정방향처럼 100% 노출 후 사라짐)
                    // segmentProgress가 낮을수록(구간 시작) 텍스트가 보여야 함
                    if (segmentProgress < 0.15) {
                        // 구간 시작 부분: 텍스트 사라짐 시작
                        if (title1.classList.contains('animate')) {
                            title1.classList.remove('animate');
                            title1.classList.add('exit');
                        }
                        if (segmentProgress < 0.05) {
                            visionText1.classList.remove('active');
                            title1.classList.remove('exit');
                        }
                    } else {
                        // 구간의 대부분: 텍스트 유지 (정방향처럼)
                        if (!title1.classList.contains('animate') && !title1.classList.contains('exit')) {
                            title1.classList.remove('enter', 'exit');
                            title1.classList.add('animate');
                        }
                    }
                }
            }
            
            // 다른 텍스트 비활성화
            if (visionText2) visionText2.classList.remove('active');
            if (title2) title2.classList.remove('animate', 'enter', 'exit');
            
            // 비디오 표시
            if (video) video.classList.remove('hidden');
        }
        // 첫 번째 텍스트 사라짐 구간 (25-33%) : 0.25는 유지 구간이므로 초과(>)
        else if (scrollProgress > 0.25 && scrollProgress < 0.33) {
            const segmentProgress = (scrollProgress - 0.25) / 0.08;
            
            if (visionText1 && title1) {
                if (isScrollingDown) {
                    // 아래로 스크롤: 텍스트 사라짐 (탑->바텀)
                    if (!title1.classList.contains('exit')) {
                        title1.classList.remove('animate');
                        title1.classList.add('exit');
                    }
                    if (segmentProgress > 0.8) {
                        visionText1.classList.remove('active');
                        title1.classList.remove('exit');
                    }
                } else {
                    // 위로 스크롤: 텍스트 다시 등장 (바텀->탑)
                    // segmentProgress가 높을수록(구간 끝) 텍스트가 보여야 함
                    visionText1.classList.add('active');
                    if (segmentProgress > 0.5 && !title1.classList.contains('animate') && !title1.classList.contains('exit')) {
                        title1.classList.remove('enter', 'exit');
                        title1.classList.add('animate');
                    }
                }
            }
            
            // 비디오 표시
            if (video) video.classList.remove('hidden');

            // ✅ 3번(이미지/문구) 구간이 아니므로: 이미지 컨테이너/비디오 오버라이드 초기화
            if (visionImageContainer) {
                visionImageContainer.classList.remove('active');
                visionImageContainer.style.opacity = '';
            }
            if (visionText3) visionText3.classList.remove('active');
            if (title3) title3.classList.remove('animate', 'enter', 'exit');
            if (video) video.style.opacity = '';
        }
        // 두 번째 텍스트 구간 (33-58%)
        // ✅ 0.58 경계는 "유지" 구간에 포함(자동 재생 종료점에서 2번이 사라지지 않도록)
        else if (scrollProgress >= 0.33 && scrollProgress <= 0.58) {
            const segmentProgress = (scrollProgress - 0.33) / 0.25;
            
            if (visionText2 && title2) {
                visionText2.classList.add('active');
                
                if (isScrollingDown) {
                    // 아래로 스크롤: 텍스트 등장 (바텀->탑)
                    if (segmentProgress > 0.15 && !title2.classList.contains('animate') && !title2.classList.contains('exit')) {
                        title2.classList.remove('enter', 'exit');
                        title2.classList.add('animate');
                    }
                } else {
                    // 위로 스크롤: 구간의 끝부분에서만 사라짐 (정방향처럼 100% 노출 후 사라짐)
                    if (segmentProgress < 0.15) {
                        // 구간 시작 부분: 텍스트 사라짐 시작
                        if (title2.classList.contains('animate')) {
                            title2.classList.remove('animate');
                            title2.classList.add('exit');
                        }
                        if (segmentProgress < 0.05) {
                            visionText2.classList.remove('active');
                            title2.classList.remove('exit');
                        }
                    } else {
                        // 구간의 대부분: 텍스트 유지 (정방향처럼)
                        if (!title2.classList.contains('animate') && !title2.classList.contains('exit')) {
                            title2.classList.remove('enter', 'exit');
                            title2.classList.add('animate');
                        }
                    }
                }
            }
            
            // 다른 텍스트 비활성화
            if (visionText1) visionText1.classList.remove('active');
            if (title1) title1.classList.remove('animate', 'enter', 'exit');
            
            // 비디오 표시
            if (video) video.classList.remove('hidden');

            // ✅ 3번(이미지/문구) 구간이 아니므로: 이미지 컨테이너/비디오 오버라이드 초기화
            if (visionImageContainer) {
                visionImageContainer.classList.remove('active');
                visionImageContainer.style.opacity = '';
            }
            if (visionText3) visionText3.classList.remove('active');
            if (title3) title3.classList.remove('animate', 'enter', 'exit');
            if (video) video.style.opacity = '';
        }
        // 두 번째 텍스트 사라짐 구간 (58-66%)
        // ✅ 0.58은 유지 구간이므로, 아웃 구간은 "0.58 초과"부터 시작
        else if (scrollProgress > 0.58 && scrollProgress < 0.66) {
            const segmentProgress = (scrollProgress - 0.58) / 0.08;
            
            if (visionText2 && title2) {
                if (isScrollingDown) {
                    // 아래로 스크롤: 텍스트 사라짐 (탑->바텀)
                    if (!title2.classList.contains('exit')) {
                        title2.classList.remove('animate');
                        title2.classList.add('exit');
                    }
                    if (segmentProgress > 0.8) {
                        visionText2.classList.remove('active');
                        title2.classList.remove('exit');
                    }
                } else {
                    // 위로 스크롤: 텍스트 다시 등장 (바텀->탑)
                    // segmentProgress가 높을수록(구간 끝) 텍스트가 보여야 함
                    visionText2.classList.add('active');
                    if (segmentProgress > 0.5 && !title2.classList.contains('animate') && !title2.classList.contains('exit')) {
                        title2.classList.remove('enter', 'exit');
                        title2.classList.add('animate');
                    }
                }
            }
            
            // 비디오 표시
            if (video) video.classList.remove('hidden');

            // ✅ 3번(이미지/문구) 구간이 아니므로: 이미지 컨테이너/비디오 오버라이드 초기화
            if (visionImageContainer) {
                visionImageContainer.classList.remove('active');
                visionImageContainer.style.opacity = '';
            }
            if (visionText3) visionText3.classList.remove('active');
            if (title3) title3.classList.remove('animate', 'enter', 'exit');
            if (video) video.style.opacity = '';
        }
        // ✅ 66-100% 구간: 3번 텍스트 등장/표시 + 이미지 전환 (주석 내용 되살리기)
        else if (scrollProgress >= 0.66 && scrollProgress <= 1) {
            const segmentProgress = (scrollProgress - 0.66) / 0.34; // 0~1
            // ✅ 디졸브 구간을 늘려서(12%→25%) 백스크롤 시에도 "역재생처럼" 자연스럽게 되돌아가게
            const dissolveSpan = 0.25;
            const fade = Math.max(0, Math.min(1, segmentProgress / dissolveSpan));

            // 1/2번 텍스트 비활성화
            if (visionText1) visionText1.classList.remove('active');
            if (visionText2) visionText2.classList.remove('active');
            if (title1) title1.classList.remove('animate', 'enter', 'exit');
            if (title2) title2.classList.remove('animate', 'enter', 'exit');

            // 이미지 컨테이너 활성화 + 해상도별 이미지 소스 동기화
                if (visionImageContainer) {
                visionImageContainer.classList.add('active');
                visionImageContainer.style.opacity = String(fade);
                updateVisionImageSource();
            }

            // 비디오 → 이미지 디졸브(인라인 opacity로 실시간 제어)
            if (video) {
                video.style.opacity = String(1 - fade);
                // fade가 충분히 올라가면 hidden도 걸어두면(0으로 고정) 잔상/깜빡임이 줄어듦
                if (fade > 0.98) video.classList.add('hidden');
                else video.classList.remove('hidden');
            }

            // 3번 문구 표시(등장/유지)
            if (visionText3) visionText3.classList.add('active');

            if (title3) {
                    if (isScrollingDown) {
                    if (segmentProgress > 0.15 && !title3.classList.contains('animate') && !title3.classList.contains('exit')) {
                                title3.classList.remove('enter', 'exit');
                                title3.classList.add('animate');
                        }
                    } else {
                    // 위로 스크롤: 구간 초반에서만 사라짐 처리(다시 2번 영역으로 복귀)
                    if (segmentProgress < dissolveSpan) {
                        if (title3.classList.contains('animate')) {
                                title3.classList.remove('animate');
                                title3.classList.add('exit');
                            }
                        if (segmentProgress < 0.08 && visionText3) {
                            visionText3.classList.remove('active');
                            title3.classList.remove('exit');
                        }
                    } else {
                        if (!title3.classList.contains('animate') && !title3.classList.contains('exit')) {
                            title3.classList.remove('enter', 'exit');
                            title3.classList.add('animate');
                        }
                    }
                }
            }
        }
    } else {
        // 비전 섹션이 활성화되지 않았을 때
        // 섹션을 벗어났다가 다시 돌아올 때를 대비해 텍스트 상태는 유지
        // 단, active 클래스만 제거하여 z-index에 가려지도록 함
        const visionText1 = document.querySelector('.vision-text-1');
        const visionText2 = document.querySelector('.vision-text-2');
        const visionImageContainer = document.querySelector('.vision-image-container');
        const visionText3 = document.querySelector('.vision-text-3');
        const title3 = document.querySelector('.vision-title-3');
        const video = document.querySelector('.vision-video');
        
        // active 클래스만 제거 (animate 상태는 유지하여 다시 돌아올 때 바로 보이도록)
        if (visionText1) visionText1.classList.remove('active');
        if (visionText2) visionText2.classList.remove('active');

        // ✅ (중요) 비전 섹션을 벗어나면 슬로건(이미지/3번) 오버레이를 즉시 해제
        // - 그렇지 않으면 구조 섹션까지 이미지가 fixed로 남아 "구조가 늦게 등장"하는 문제가 생김
        if (visionImageContainer) {
            visionImageContainer.classList.remove('active');
            visionImageContainer.style.opacity = '';
        }
        if (visionText3) visionText3.classList.remove('active');
        if (title3) title3.classList.remove('animate', 'enter', 'exit');
        if (video) {
            video.classList.remove('hidden');
            video.style.opacity = '';
        }
    }
}

function onVisionScroll() {
    if (!visionTicking) {
        window.requestAnimationFrame(updateVisionParallax);
        visionTicking = true;
    }
}

window.addEventListener('scroll', onVisionScroll, { passive: true });
window.addEventListener('resize', updateVisionParallax);

// Initialize vision section on load
document.addEventListener('DOMContentLoaded', () => {
    updateVisionParallax();
    // 초기 로드 시 이미지도 해상도에 맞춰 세팅
    updateVisionImageSource();
    // ✅ 전환 스터터(느려짐/떨림) 방지: 히어로/비전 구간에서 사용할 슬로건 이미지 선 로딩
    preloadVisionAssets();
});

// Video autoplay and loop - only when Vision section is in view
document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('.vision-video');
    const visionSection = document.querySelector('.vision-section');
    
    if (video && visionSection) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    video.play().catch(err => {
                        console.log('Video autoplay prevented:', err);
                    });
                } else {
                    // Optional: pause when out of view to save resources
                    // video.pause();
                }
            });
        }, {
            threshold: 0.1
        });
        
        videoObserver.observe(visionSection);
    }
});

// 공용 앵커 스크롤 코드 삭제됨 - GNB 전용 스크롤 코드만 사용

// Add stagger animation delay to cards
document.addEventListener('DOMContentLoaded', () => {
    const structureCards = document.querySelectorAll('.structure-card');
    structureCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });
    
    const nftLevels = document.querySelectorAll('.nft-level');
    nftLevels.forEach((level, index) => {
        level.style.transitionDelay = `${index * 0.1}s`;
    });
    
    // Roadmap: 페이즈별 순차 등장 대신 "동시에" 올라오도록(04 Phase 길이로 인한 리페인트/잘림 체감 완화)
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach((item) => {
        item.style.transitionDelay = '0s';
    });
});

// Roadmap 타임라인: 이중 스크롤 방지(모든 해상도) - 현재 스크롤 감 유지 + 잘림 방지
// ✅ 세로 스크롤은 네이티브 그대로(가장 자연스러움)
// ✅ "세로 스크롤 중 deltaX가 섞여 타임라인이 가로로 살짝 움직이는" 이중 스크롤 체감만 제거
// ⚠️ overflow-x를 hidden으로 토글하면 스크롤 중(특히 아치 영역) 클리핑이 생길 수 있어 사용하지 않음
(() => {
    let rafId = null;
    let pending = null; // { el, left }

    const flush = () => {
        rafId = null;
        if (!pending) return;
        const { el, left } = pending;
        pending = null;
        if (el) el.scrollLeft = left;
    };

    document.addEventListener(
        'wheel',
        (e) => {
            const roadmapTimeline = document.querySelector('.roadmap-timeline');
            if (!roadmapTimeline) return;
            if (!roadmapTimeline.contains(e.target)) return;

            const absX = Math.abs(e.deltaX || 0);
            const absY = Math.abs(e.deltaY || 0);
            if (absX === 0 && absY === 0) return;

            /**
             * 떨림(가로 스크롤 중 덜컥거림) 방지
             * - 트랙패드 가로 스크롤은 deltaY가 조금 섞여 들어오는 경우가 많음
             * - "가로 의도"를 더 넓게 인정해서, 가로 스크롤 중에는 scrollLeft 원복 로직이 절대 개입하지 않게 함
             * - 반대로 "명확한 세로 의도"일 때만(세로가 충분히 우세) 가로 미끄러짐을 원복
             */
            const isMostlyHorizontal = e.shiftKey || (absX > 6 && absX >= absY * 0.9);
            if (isMostlyHorizontal) return; // 가로 스크롤은 네이티브 그대로

            const isMostlyVertical = absY > absX * 1.3;
            if (!isMostlyVertical) return; // 대각 입력은 개입하지 않음(자연스러움 유지)

            // 명확한 세로 의도에서만: 타임라인의 가로로 살짝 움직임 원복
            if (absX > 1) {
                pending = { el: roadmapTimeline, left: roadmapTimeline.scrollLeft };
                if (!rafId) rafId = requestAnimationFrame(flush);
            }
        },
        { passive: true, capture: true }
    );
})();

// Roadmap 타임라인: 마우스/터치 드래그로 가로 스크롤(DevTools on/off 무관하게 동작)
(() => {
    const timeline = document.querySelector('.roadmap-timeline');
    if (!timeline) return;

    let isDown = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let hasDragged = false;
    const dragStartThreshold = 6; // ✅ 드래그로 인정하는 최소 이동(px)
    let isHorizontalLocked = false; // ✅ 가로 드래그로 락(세로 스크롤 방해 방지)

    // rAF로 스크롤 적용(뚝뚝 끊김 방지)
    let rafId = null;
    let targetLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0; // px/ms
    let inertiaId = null;

    const applyScroll = () => {
        rafId = null;
        timeline.scrollLeft = targetLeft;
    };

    const stopInertia = () => {
        if (inertiaId) {
            cancelAnimationFrame(inertiaId);
            inertiaId = null;
        }
    };

    const onPointerDown = (e) => {
        // ✅ 모바일(터치)에서는 네이티브 가로 스크롤이 가장 부드럽고,
        // 세로 스크롤도 방해하지 않도록 JS 드래그는 마우스에서만 사용
        if (e.pointerType !== 'mouse') return;

        // 마우스는 좌클릭만 허용
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        stopInertia();
        isDown = true;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = timeline.scrollLeft;
        hasDragged = false;
        isHorizontalLocked = false;
        lastX = e.clientX;
        lastT = performance.now();
        velocity = 0;
        timeline.classList.add('is-dragging');
        // ✅ 모바일(터치)에서는 방향이 확정된 뒤에만 캡처(세로 스크롤 방해 최소화)
        if (e.pointerType === 'mouse') {
            try {
                timeline.setPointerCapture(pointerId);
            } catch (_) {}
        }
    };

    const onPointerMove = (e) => {
        if (!isDown || e.pointerId !== pointerId) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // ✅ 방향 락: 세로 의도가 우세하면 드래그 취소(페이지 세로 스크롤에 맡김)
        if (!isHorizontalLocked) {
            if (Math.abs(dy) > Math.abs(dx) * 1.2 && Math.abs(dy) > dragStartThreshold) {
                isDown = false;
                pointerId = null;
                timeline.classList.remove('is-dragging');
                return;
            }
            if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > dragStartThreshold) {
                isHorizontalLocked = true;
                // ✅ 가로로 확정된 순간에만(터치 포함) 캡처 시도
                if (e.pointerType !== 'mouse') {
                    try {
                        timeline.setPointerCapture(pointerId);
                    } catch (_) {}
                }
            } else {
                return; // 아직 애매하면 아무 것도 하지 않음
            }
        }

        // ✅ 가로 드래그로 확정된 경우에만 기본 동작 억제 + 스크롤
        e.preventDefault();
        hasDragged = true;
        // 속도 계산(관성 스크롤용)
        const now = performance.now();
        const dt = Math.max(1, now - lastT);
        const ddx = e.clientX - lastX;
        velocity = (-ddx) / dt; // 왼쪽으로 드래그하면 scrollLeft 증가 방향
        lastX = e.clientX;
        lastT = now;

        targetLeft = startLeft - dx;
        if (!rafId) rafId = requestAnimationFrame(applyScroll);
    };

    const endDrag = () => {
        if (!isDown) return;
        isDown = false;
        pointerId = null;
        timeline.classList.remove('is-dragging');
        // 관성은 "페이징처럼 느껴짐"을 만들 수 있어 제거(드래그 그대로 멈추는 자연스러운 UX)
    };

    // 드래그 후 클릭(링크/텍스트 선택) 방지: 드래그로 스크롤했을 때만 캡처 단계에서 차단
    timeline.addEventListener(
        'click',
        (e) => {
            if (!hasDragged) return;
            e.preventDefault();
            e.stopPropagation();
            hasDragged = false;
        },
        true
    );

    timeline.addEventListener('pointerdown', onPointerDown);
    timeline.addEventListener('pointermove', onPointerMove, { passive: false });
    timeline.addEventListener('pointerup', endDrag);
    timeline.addEventListener('pointercancel', endDrag);
})();

// Enhanced parallax for structure cards
// Note: 3D tilt effect takes priority, so parallax is disabled for cards with data-tilt
let ticking = false; // 전역 변수 선언
let cachedStructureCards = null; // 스크롤 중 querySelectorAll 비용 절감

function updateStructureParallax() {
    // 성능: 모바일/태블릿에서는 패럴럭스 비활성(스크롤 끊김 방지)
    if (window.innerWidth <= 1024) return;
    const structureSection = document.querySelector('.structure-section');
    if (!structureSection) return;
    
    const rect = structureSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    if (rect.top <= windowHeight && rect.bottom >= 0) {
        // 최초 1회만 캐싱(구조가 동적으로 바뀌지 않는 페이지이므로 안전)
        if (!cachedStructureCards) {
            cachedStructureCards = Array.from(document.querySelectorAll('.structure-card'));
        }
        const cards = cachedStructureCards;
        cards.forEach((card, index) => {
            // ★ data-tilt 카드에는 transform을 절대 적용하지 않음 (패럴럭스 영향 완전 제거)
            if (card.hasAttribute('data-tilt')) {
                return; // transform 적용 자체를 건너뜀
            }
            
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.top + cardRect.height / 2;
            const viewportCenter = windowHeight / 2;
            const distance = cardCenter - viewportCenter;
            const parallaxOffset = distance * 0.1;
            
            card.style.transform = `translateY(${parallaxOffset}px)`;
        });
    }
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            updateStructureParallax();
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });

// 초기 1번 실행
updateStructureParallax();

// 3D 틸트 효과 (마우스 호버 기반)
function initTiltEffect() {
    // ✅ 모바일/터치 환경에서는 틸트 비활성(요구사항)
    // - hover 가능한 마우스 환경에서만 동작
    if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        return;
    }
    // data-tilt가 붙은 structure 카드만 대상으로 함
    const cards = document.querySelectorAll('.structure-card[data-tilt]');
    if (!cards.length) return;

    cards.forEach((card) => {
        const maxRotate = 8; // 기울기 최대 각도

        // 카드 위로 마우스 들어올 때
        card.addEventListener('mouseenter', () => {
            // 슬라이드 인 transform이나 이전 상태 초기화
            card.style.transition = 'transform 0.12s ease-out';
        });

        // 카드 위에서 마우스 움직일 때
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;   // 카드 안에서의 X 좌표
            const y = e.clientY - rect.top;    // 카드 안에서의 Y 좌표

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // 중심에서 얼마나 떨어졌는지 비율로 계산 (-1 ~ 1)
            const percentX = (x - centerX) / centerX;
            const percentY = (y - centerY) / centerY;

            const rotateY = percentX * maxRotate;      // 좌우 움직임 → Y축 회전
            const rotateX = -percentY * maxRotate;     // 상하 움직임 → X축 회전 (위로 올리면 -)

            card.style.transition = 'transform 0.08s ease-out';
            card.style.transform =
                `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        });

        // 카드 밖으로 나갈 때 (원위치)
        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.25s ease-out';
            card.style.transform =
                'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });
}

// DOMContentLoaded에서 틸트 효과 초기화
document.addEventListener('DOMContentLoaded', () => {
    initTiltEffect();
    
    // NFT 캐러셀 기능
    initNFTCarousel();
    
    // NFT 레벨 페이지네이션 기능
    initNFTLevelPagination();

    // ✅ NFT 레벨 "자세히 보기" 모달
    initNFTLevelDetailsModal();
});

// NFT 레벨 "자세히 보기" 모달(테이블)
function initNFTLevelDetailsModal() {
    const overlay = document.getElementById('nft-level-modal-overlay');
    if (!overlay) return;

    const modal = overlay.querySelector('.nft-level-modal');
    const closeBtn = overlay.querySelector('.nft-level-modal-close');
    const triggers = Array.from(document.querySelectorAll('.view-details'));

    if (!modal || !closeBtn || !triggers.length) return;

    const FADE_MS = 220; // CSS transition 시간과 맞춤
    let lastFocusedEl = null;
    /**
     * ✅ 요구사항
     * - 바닥(배경) 콘텐츠는 그대로 보이되, 모달 오픈 동안 "배경 스크롤은 절대 안 됨"
     * - 모달 내부(.nft-level-modal-body)에서만 스크롤 가능
     *
     * ✅ 구현
     * - iOS/Safari에서도 안정적인 방식: body를 fixed로 고정(현재 화면을 그대로 유지)
     * - 닫을 때는 같은 위치로 즉시 복원(시점 점프/이동 방지)
     */
    let didFixedLock = false;
    let lockedY = 0;
    const prevLockStyles = {
        bodyOverflow: '',
        bodyPosition: '',
        bodyPosition: '',
        bodyTop: '',
        bodyLeft: '',
        bodyRight: '',
        bodyWidth: ''
    };

    const lockScroll = () => {
        // 다른 기능(예: 모바일 메뉴)에서 이미 fixed 잠금이면 건드리지 않음
        if (document.body.style.position === 'fixed') {
            didFixedLock = false;
            return;
        }
        didFixedLock = true;
        lockedY = window.scrollY || window.pageYOffset || 0;

        prevLockStyles.bodyOverflow = document.body.style.overflow;
        prevLockStyles.bodyPosition = document.body.style.position;
        prevLockStyles.bodyTop = document.body.style.top;
        prevLockStyles.bodyLeft = document.body.style.left;
        prevLockStyles.bodyRight = document.body.style.right;
        prevLockStyles.bodyWidth = document.body.style.width;

        // ✅ 바닥 화면은 그대로 유지(시점 점프 방지): html은 건드리지 않고 body만 fixed 처리
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${lockedY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
    };

    const unlockScroll = () => {
        if (!didFixedLock) return;
        document.body.style.overflow = prevLockStyles.bodyOverflow;
        document.body.style.position = prevLockStyles.bodyPosition;
        document.body.style.top = prevLockStyles.bodyTop;
        document.body.style.left = prevLockStyles.bodyLeft;
        document.body.style.right = prevLockStyles.bodyRight;
        document.body.style.width = prevLockStyles.bodyWidth;

        // ✅ 같은 위치로 "즉시" 복원(보던 화면 그대로)
        if (typeof scrollToInstantGlobal === 'function') {
            scrollToInstantGlobal(lockedY);
        } else {
            window.scrollTo(0, lockedY);
        }
        lockedY = 0;
        didFixedLock = false;
    };

    const open = () => {
        lastFocusedEl = document.activeElement;
        overlay.removeAttribute('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        lockScroll();
        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            // ✅ 일부 브라우저에서 focus가 스크롤 점프를 유발하는 케이스가 있어
            // "시점 이동 0"을 최우선으로 하여 오픈 시 자동 포커스 이동은 하지 않음
            // (필요 시 접근성 개선 단계에서 focus trap 추가)
        });
    };

    const close = () => {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        // 페이드 아웃 후 hidden 처리
        window.setTimeout(() => {
            overlay.setAttribute('hidden', '');
        }, FADE_MS);
        // ✅ 스크롤 복원 → 다음 프레임에 포커스 복원(포커스가 스크롤을 유발하는 브라우저 대응)
        unlockScroll();
        const toFocus = lastFocusedEl;
        lastFocusedEl = null;
        if (toFocus && typeof toFocus.focus === 'function') {
            requestAnimationFrame(() => {
                try {
                    toFocus.focus({ preventScroll: true });
                } catch (_) {
                    toFocus.focus();
                }
            });
        }
    };

    // 트리거(자세히 보기) 클릭
    triggers.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // ✅ 상위 클릭 핸들러(앵커/리플레이/기타)로 버블링되어 시점이동이 발생하지 않도록 차단
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
            open();
        });
    });

    // 닫기 버튼
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        close();
    });

    // 딤(배경) 클릭 시 닫기 (모달 내부 클릭은 무시)
    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close();
    });

    // ESC로 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
            close();
        }
    });
}

// NFT 캐러셀 초기화 및 제어 (6슬롯: 5개 보임 + 1개 숨김, 이동 방향 "역방향" 모션 방지)
function initNFTCarousel() {
    const carousel = document.querySelector(".nft-carousel");
    if (!carousel) return;
    
    // ----------------------------
    // 0) 기존 카드 내용을 템플릿으로 저장
    // ----------------------------
    const originalCards = Array.from(carousel.querySelectorAll(".nft-card"));
    const templates = originalCards.map((c) => c.innerHTML);
    const N = templates.length;
    if (N < 2) return;

    // ----------------------------
    // 1) carousel 안을 "렌더링 슬롯 6개"로 재구성
    //    (5개 보이는 슬롯 + 1개 숨김 슬롯)
    // ----------------------------
    carousel.innerHTML = "";
    const SLOT_COUNT = 6;
    const slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
        const el = document.createElement("div");
        el.className = "nft-card";
        carousel.appendChild(el);
        slots.push(el);
    }

    // 역할(5개 보임 + 1개 hidden)
    // slots[0]=L2, [1]=L1, [2]=C, [3]=R1, [4]=R2, [5]=hidden(incoming)
    const mod = (a, b) => ((a % b) + b) % b;
    let currentIndex = 0; // 중앙(C)의 데이터 index
    let isTransitioning = false;

    function setRole(el, role) {
        el.classList.remove(
            "prev-prev",
            "prev",
            "active",
            "next",
            "next-next",
            "hidden",
            "hidden-left",
            "hidden-right",
            "no-transform-transition"
        );
        el.classList.add(role);

        // ✅ CSS 변수 기반 transform(슬롯 step * slot index)을 JS에서 설정
        // - % 기반 translateX는 카드 너비에 종속되어 "겹침"이 쉽게 발생하므로,
        //   컨테이너 기준(step) 슬롯 배치로 변경한다.
        if (role === "active") {
            el.style.setProperty("--slot", "0");
            el.style.setProperty("--scale", "1");
            el.style.setProperty("--opacity", "1");
            el.style.zIndex = "3";
        } else if (role === "prev-prev") {
            el.style.setProperty("--slot", "-2");
            el.style.setProperty("--scale", "0.9");
            el.style.setProperty("--opacity", "0.2");
            el.style.zIndex = "0";
        } else if (role === "prev") {
            el.style.setProperty("--slot", "-1");
            el.style.setProperty("--scale", "0.9");
            el.style.setProperty("--opacity", "0.2");
            el.style.zIndex = "1";
        } else if (role === "next") {
            el.style.setProperty("--slot", "1");
            el.style.setProperty("--scale", "0.9");
            el.style.setProperty("--opacity", "0.2");
            el.style.zIndex = "1";
        } else if (role === "next-next") {
            el.style.setProperty("--slot", "2");
            el.style.setProperty("--scale", "0.9");
            el.style.setProperty("--opacity", "0.2");
            el.style.zIndex = "0";
        } else if (role === "hidden-left") {
            // ✅ 숨김 슬롯은 "왼쪽 2번째(prev-prev)" 위치에서 대기(역방향 이동 방지)
            el.style.setProperty("--slot", "-3");
            el.style.setProperty("--scale", "0.9");
            el.style.setProperty("--opacity", "0");
            el.style.zIndex = "0";
        } else if (role === "hidden-right") {
            // ✅ 숨김 슬롯은 "오른쪽 2번째(next-next)" 위치에서 대기(역방향 이동 방지)
            el.style.setProperty("--slot", "3");
            el.style.setProperty("--scale", "0.9");
            el.style.setProperty("--opacity", "0");
            el.style.zIndex = "0";
        }

        // 중앙만 드래그 가능
        el.style.pointerEvents = role === "active" ? "auto" : "none";
    }

    function render(el, dataIndex) {
        el.innerHTML = templates[dataIndex];
        el.dataset.index = String(dataIndex);
    }

    // ✅ 텔레포트(순간 이동): 역방향으로 "가로지르는" 모션이 보이지 않도록 transition을 끄고 위치만 바꾼다
    function teleportTo(el, role, dataIndex) {
        el.classList.add("no-transform-transition");
        if (dataIndex !== undefined) render(el, dataIndex);
        setRole(el, role);
        requestAnimationFrame(() => el.classList.remove("no-transform-transition"));
    }

    function layoutInitial() {
        // 보이는 5개: L2 L1 C R1 R2
        render(slots[0], mod(currentIndex - 2, N));
        setRole(slots[0], "prev-prev");

        render(slots[1], mod(currentIndex - 1, N));
        setRole(slots[1], "prev");

        render(slots[2], mod(currentIndex, N));
        setRole(slots[2], "active");

        render(slots[3], mod(currentIndex + 1, N));
        setRole(slots[3], "next");

        render(slots[4], mod(currentIndex + 2, N));
        setRole(slots[4], "next-next");

        // hidden 슬롯: 다음에 들어올 R2(= currentIndex + 3)를 미리 준비 (오른쪽 바깥)
        // ✅ hidden 준비는 항상 teleportTo로 처리(역방향으로 휙 움직이는 모션 방지)
        teleportTo(slots[5], "hidden-right", mod(currentIndex + 3, N));

        // CSS 적용 강제
        carousel.offsetHeight;
    }

    // styles.css transition(0.45s)과 동일
    const DURATION = 450;

    function goNext() {
        if (isTransitioning) return;
        isTransitioning = true;

        carousel.classList.remove("direction-prev");
        carousel.classList.add("direction-next");

        // NEXT: 오른쪽 → 왼쪽으로 한 칸씩
        teleportTo(slots[0], "hidden-left");               // L2 out
        setRole(slots[1], "prev-prev");                   // L1 -> L2
        setRole(slots[2], "prev");                        // C  -> L1
        setRole(slots[3], "active");                      // R1 -> C
        setRole(slots[4], "next");                        // R2 -> R1
        slots[5].classList.remove("no-transform-transition");
        setRole(slots[5], "next-next");                   // hidden -> R2

        setTimeout(() => {
            // 슬롯 참조 회전(역주행 방지)
            const oldL2 = slots[0];
            slots[0] = slots[1];
            slots[1] = slots[2];
            slots[2] = slots[3];
            slots[3] = slots[4];
            slots[4] = slots[5];
            slots[5] = oldL2;

            currentIndex = mod(currentIndex + 1, N);

            // 다음 hidden-right 준비 (오른쪽 바깥)
            // ✅ hidden 준비는 항상 teleportTo로 처리(역방향으로 휙 움직이는 모션 방지)
            teleportTo(slots[5], "hidden-right", mod(currentIndex + 3, N));

            carousel.classList.remove("direction-next");
            isTransitioning = false;
        }, DURATION);
    }

    function goPrev() {
        if (isTransitioning) return;
        isTransitioning = true;

        carousel.classList.remove("direction-next");
        carousel.classList.add("direction-prev");

        // PREV: 왼쪽 → 오른쪽으로 한 칸씩
        // prev에서는 hidden 슬롯을 왼쪽 바깥에서 들어오게 준비해야 함 (currentIndex-3)
        teleportTo(slots[5], "hidden-left", mod(currentIndex - 3, N));

        teleportTo(slots[4], "hidden-right");             // R2 out
        setRole(slots[3], "next-next");                   // R1 -> R2
        setRole(slots[2], "next");                        // C  -> R1
        setRole(slots[1], "active");                      // L1 -> C
        setRole(slots[0], "prev");                        // L2 -> L1
        slots[5].classList.remove("no-transform-transition");
        setRole(slots[5], "prev-prev");                   // hidden -> L2

        setTimeout(() => {
            const oldHidden = slots[5];
            slots[5] = slots[4];
            slots[4] = slots[3];
            slots[3] = slots[2];
            slots[2] = slots[1];
            slots[1] = slots[0];
            slots[0] = oldHidden;

            currentIndex = mod(currentIndex - 1, N);

            // 다음 hidden-right 준비 (오른쪽 바깥)
            // ✅ hidden 준비는 항상 teleportTo로 처리(역방향으로 휙 움직이는 모션 방지)
            teleportTo(slots[5], "hidden-right", mod(currentIndex + 3, N));

            carousel.classList.remove("direction-prev");
            isTransitioning = false;
        }, DURATION);
    }

    // ----------------------------
    // 버튼 이벤트: 버튼/드래그 모두 동일한 전환 함수(goPrev/goNext) 사용
    // ----------------------------
    const prevBtn = document.querySelector(".nft-carousel-nav .prev-btn");
    const nextBtn = document.querySelector(".nft-carousel-nav .next-btn");
    if (prevBtn) {
        prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
            e.stopPropagation();
            goPrev();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            goNext();
        });
    }

    // ----------------------------
    // 드래그: 버튼 클릭과 동일한 모션(릴리즈 시에만 전환)
    // ----------------------------
    let dragging = false;
    let startX = 0;
    let curX = 0;
    const TH = 60;
    const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);

    function dragStart(e) {
        if (isTransitioning) return;
        if (e.target.closest(".prev-btn") || e.target.closest(".next-btn")) return;
        dragging = true;
        startX = getX(e);
        curX = startX;
    }
    function dragMove(e) {
        if (!dragging) return;
        curX = getX(e);
        // ✅ 터치에서 가로 드래그 의도일 때만 페이지 스크롤 방지(버튼 클릭 모션 유지)
        if (e && e.touches && Math.abs(curX - startX) > 6) e.preventDefault();
    }
    function dragEnd() {
        if (!dragging) return;
        dragging = false;
        const diff = curX - startX;
        if (Math.abs(diff) >= TH) {
            // 왼쪽으로 드래그(음수) = 다음(오→왼)
            // 오른쪽으로 드래그(양수) = 이전(왼→오)
            if (diff < 0) goNext();
            else goPrev();
        }
    }

    carousel.addEventListener("mousedown", dragStart);
    carousel.addEventListener("touchstart", dragStart, { passive: true });
    document.addEventListener("mousemove", dragMove);
    document.addEventListener("touchmove", dragMove, { passive: false });
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("touchend", dragEnd);

    // 시작
    layoutInitial();
}

// NFT 레벨 페이지네이션 기능
function initNFTLevelPagination() {
    // 중복 초기화 방지(이벤트 중복 바인딩으로 인한 깜빡임/오동작 방지)
    if (window.__sjwNftLevelPaginationInited) return;
    window.__sjwNftLevelPaginationInited = true;

    const images = document.querySelectorAll('.nft-level-image');
    const indicators = document.querySelectorAll('.nft-level-indicators .indicator');
    const levelInfo = document.querySelector('.level-info');
    const scrollContainer = document.querySelector('.nft-scroll-container');
    const levelContentWrapper = document.querySelector('.nft-level-content-wrapper');
    const levelImageWrapper = document.querySelector('.nft-level-image-wrapper');
    const levelIndicatorsWrap = document.querySelector('.nft-level-indicators');
    
    if (!images.length || !indicators.length) return;
    
    // 레벨 정보 배열
    // ✅ 언어별 레벨 텍스트 (EN 페이지는 <html lang="en"> 기준)
    const isEnglish = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    const levelNames = isEnglish
        ? [
              // ✅ 모달(Role) 기준으로 통일
              'Lv.1\u00A0\u00A0Explorer (Beginner)',
              'Lv.2\u00A0\u00A0Builder (Active)',
              'Lv.3\u00A0\u00A0Contributor',
              'Lv.4\u00A0\u00A0Leader',
              'Lv.5\u00A0\u00A0Pioneer (Founder)'
          ]
        : [
        'Lv.1\u00A0\u00A0Explorer (입문자)',
        'Lv.2\u00A0\u00A0Builder (활동자)',
        'Lv.3\u00A0\u00A0Contributor (기여자)',
        'Lv.4\u00A0\u00A0Leader (리더)',
        'Lv.5\u00A0\u00A0Pioneer (창시자)'
    ];
    
    let currentLevelIndex = 0;

    // ✅ 스와이프는 해상도/DevTools 상태와 무관하게 항상 허용(안정성 최우선)
    // - 다만 데스크탑에서는 기본 스크롤/클릭을 방해하지 않도록 preventDefault는 "모바일(화살표 숨김)"에서만 수행
    const isMobileLike = () => {
        const arrow = document.querySelector('.nft-level-arrow');
        if (!arrow) return window.innerWidth <= 768;
        return window.getComputedStyle(arrow).display === 'none';
    };
    
    // 이미지 전환 함수
    function switchLevel(index) {
        if (index < 0 || index >= images.length) return;
        // 같은 인덱스 재선택이면 불필요한 class 토글(깜빡임) 방지
        if (index === currentLevelIndex) return;

        // ✅ 전체를 매번 토글하면 트랜지션이 겹쳐 깜빡임이 날 수 있어
        // 이전/현재만 최소 변경으로 처리
        const prev = currentLevelIndex;
        if (images[prev]) images[prev].classList.remove('active');
        if (indicators[prev]) indicators[prev].classList.remove('active');

        if (images[index]) images[index].classList.add('active');
        if (indicators[index]) indicators[index].classList.add('active');
        
        // 레벨 정보 업데이트
        if (levelInfo) {
            levelInfo.textContent = levelNames[index];
        }
        
        currentLevelIndex = index;
    }
    
    // 인디케이터 클릭 이벤트
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            // 모든 해상도: 인디케이터 클릭 시 해당 레벨로 전환
            switchLevel(index);
        });
    });
    
    // 화살표 버튼 클릭 이벤트
    const prevArrow = document.querySelector('.nft-level-arrow-prev');
    const nextArrow = document.querySelector('.nft-level-arrow-next');
    
    if (prevArrow) {
        prevArrow.addEventListener('click', () => {
            // 모바일(768↓)에서는 화살표 전환 비활성(드래그 전용)
            if (isMobileLike()) return;
            const newIndex = (currentLevelIndex - 1 + images.length) % images.length;
            switchLevel(newIndex);
        });
    }
    
    if (nextArrow) {
        nextArrow.addEventListener('click', () => {
            // 모바일(768↓)에서는 화살표 전환 비활성(드래그 전용)
            if (isMobileLike()) return;
            const newIndex = (currentLevelIndex + 1) % images.length;
            switchLevel(newIndex);
        });
    }

    // ✅ 모바일(768px 이하): "이미지 영역"에서만 스와이프로 전환
    // - 데스크탑/태블릿에서는 스와이프(드래그) 전환을 완전히 비활성 → 화살표/인디케이터만 사용
    // - 인디케이터 영역에는 스와이프 핸들러를 달지 않아 클릭이 절대 방해받지 않게 함
    if (levelImageWrapper) {
        const threshold = 45; // 스와이프 감지 거리(px)
        let startX = 0;
        let startY = 0;
        let isTouchDown = false;

        const getTouchXY = (evt) => {
            const t = (evt.touches && evt.touches[0]) || (evt.changedTouches && evt.changedTouches[0]);
            if (!t) return null;
            return { x: t.clientX, y: t.clientY };
        };

        const onTouchStart = (e) => {
            if (!isMobileLike()) return;
            isTouchDown = true;
            const p = getTouchXY(e);
            if (!p) return;
            startX = p.x;
            startY = p.y;
        };

        const onTouchMove = (e) => {
            if (!isTouchDown || !isMobileLike()) return;
            const p = getTouchXY(e);
            if (!p) return;
            const dx = p.x - startX;
            const dy = p.y - startY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
                // 가로 스와이프 의도면 세로 스크롤 방해 방지
                e.preventDefault();
            }
        };

        const onTouchEnd = (e) => {
            if (!isTouchDown || !isMobileLike()) return;
            isTouchDown = false;
            const p = getTouchXY(e);
            if (!p) return;
            const dx = p.x - startX;
            const dy = p.y - startY;
            if (Math.abs(dy) > Math.abs(dx)) return;
            if (Math.abs(dx) < threshold) return;
            if (dx > 0) switchLevel((currentLevelIndex - 1 + images.length) % images.length);
            else switchLevel((currentLevelIndex + 1) % images.length);
        };

        levelImageWrapper.addEventListener('touchstart', onTouchStart, { passive: true });
        levelImageWrapper.addEventListener('touchmove', onTouchMove, { passive: false });
        levelImageWrapper.addEventListener('touchend', onTouchEnd, { passive: true });
    }
    
    // 초기 레벨 설정 (첫 번째 이미지)
    switchLevel(0);
}

// TOP 버튼 클릭 시 빠르게 최상단으로 이동
document.addEventListener('DOMContentLoaded', () => {
    const topLink = document.getElementById('top-link');
    if (topLink) {
        topLink.addEventListener('click', (e) => {
            e.preventDefault();
            // ✅ TOP 버튼도 "브라우저 새로고침과 동일한 모션"으로 통일
            goToHeroWithReloadMotion();
        });
    }
});

