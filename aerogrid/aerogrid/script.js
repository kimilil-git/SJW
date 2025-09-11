// Header scroll effect
let lastScrollY = 0;
let isScrollingDown = false;
let scrollTimeout = null;

window.addEventListener('scroll', function() {
  const header = document.querySelector('.header');
  const currentScrollY = window.scrollY;
  
  // 기존 타이머 클리어
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  // 스크롤 방향 감지
  if (currentScrollY > lastScrollY && currentScrollY > 100) {
    // 아래로 스크롤 - GNB 숨김
    isScrollingDown = true;
    header.classList.add('hidden');
  } else if (currentScrollY < lastScrollY) {
    // 위로 스크롤 - GNB 표시
    isScrollingDown = false;
    header.classList.remove('hidden');
  }
  
  // 스크롤 상태에 따른 배경 변경
  if (currentScrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
  
  // 2초 후 자동으로 GNB 노출
  scrollTimeout = setTimeout(() => {
    if (currentScrollY > 100) { // 100px 이상 스크롤된 상태에서만
      header.classList.remove('hidden');
    }
  }, 2000);
  
  lastScrollY = currentScrollY;
});

// Hero image slider
document.addEventListener('DOMContentLoaded', function() {
  const images = document.querySelectorAll('.hero-bg-image');
  const dots = document.querySelectorAll('.pagination-dots .dot');
  let currentSlide = 0;
  let isTransitioning = false;
  
  // 슬라이드별 텍스트 데이터
  const slideTexts = [
    {
      title: "하늘을 설계하다",
      subtitle: "산업용 자율비행 드론부터 관제·AI 비전까지"
    },
    {
      title: "효율적으로<br>설계하고 계획하다",
      subtitle: "매핑, 모델링, 워크플로 자동화"
    },
    {
      title: "최대한의 안전을<br>확보하다",
      subtitle: "신속한 상황 인식으로 효율적인 공공 안전 확보"
    },
    {
      title: "정밀하고 간소한<br>데이터 처리",
      subtitle: "지리·환경·농업등 다양한 분야의 데이터를 제공"
    }
  ];
  
  // 초기 텍스트 상태 설정 (즉시 실행)
  const heroTitle = document.querySelector('.hero-title');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  
  // 첫 진입 시에도 줄바꿈 처리를 위해 텍스트 내용 설정
  const titleContent = heroTitle.querySelector('.text-content');
  const titleText = slideTexts[0].title; // 첫 번째 슬라이드 텍스트
  
  if (titleText.includes('<br>')) {
    const lines = titleText.split('<br>');
    titleContent.innerHTML = lines.map((line, i) => 
      `<div class="title-line" data-line="${i}"><span class="line-text">${line.trim()}</span></div>`
    ).join('');
  } else {
    titleContent.innerHTML = `<div class="title-line" data-line="0"><span class="line-text">${titleText}</span></div>`;
  }
  
  // 기존 클래스 완전히 제거하여 기본 상태로 시작
  heroTitle.classList.remove('animate', 'exit', 'enter');
  heroSubtitle.classList.remove('animate', 'exit', 'enter');
  
  // 첫 진입 시에는 기본 상태로 시작 (텍스트가 보이는 상태)
  // 200ms 후 바로 animate 클래스로 변경하여 모션 시작
  setTimeout(() => {
    // 타이틀과 서브타이틀을 동시에 animate 클래스로 변경
    heroTitle.classList.add('animate');
    heroSubtitle.classList.add('animate');
  }, 200);
  
  // 초기 프로그레스 바 애니메이션 시작 (페이지 로드 후 4초 타이머와 동기화)
  setTimeout(() => {
    startProgressAnimation();
  }, 100); // 약간의 지연으로 초기 전환 방지

  function showSlide(index, isManualClick = false) {
    if (isTransitioning || index === currentSlide) return;
    
    isTransitioning = true;
    
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    
    // 1단계: 기존 텍스트 아래로 사라짐 (exit)
    heroTitle.classList.add('exit');
    heroSubtitle.classList.add('exit');
    
    // 2단계: 이미지 전환
    setTimeout(() => {
      // 현재 활성 이미지 비활성화
      images[currentSlide].classList.remove('active');
      dots[currentSlide].classList.remove('active');
      
      // 이전 슬라이드의 프로그레스 바 즉시 초기화
      const prevDot = dots[currentSlide];
      const prevProgressCircle = prevDot.querySelector('.progress-ring-circle');
      if (prevProgressCircle) {
        const radius = 12;
        const circumference = 2 * Math.PI * radius;
        prevProgressCircle.style.strokeDashoffset = circumference; // 0% 상태로 즉시 초기화
      }
      
      // 새로운 이미지 활성화
      images[index].classList.add('active');
      dots[index].classList.add('active');
      
      currentSlide = index;
      
      // 텍스트 내용 변경
      const titleContent = heroTitle.querySelector('.text-content');
      const subtitleContent = heroSubtitle.querySelector('.text-content');
      
      // 줄바꿈된 텍스트를 div로 감싸기
      const titleText = slideTexts[index].title;
      if (titleText.includes('<br>')) {
        const lines = titleText.split('<br>');
        titleContent.innerHTML = lines.map((line, i) => 
          `<div class="title-line" data-line="${i}"><span class="line-text">${line.trim()}</span></div>`
        ).join('');
      } else {
        titleContent.innerHTML = `<div class="title-line" data-line="0"><span class="line-text">${titleText}</span></div>`;
      }
      
      subtitleContent.innerHTML = slideTexts[index].subtitle;
      
      // exit 클래스 제거하고 enter 클래스 추가
      heroTitle.classList.remove('exit');
      heroSubtitle.classList.remove('exit');
      heroTitle.classList.add('enter');
      heroSubtitle.classList.add('enter');
      
      // 3단계: 새 텍스트 아래에서 위로 나타남
      setTimeout(() => {
        heroTitle.classList.remove('enter');
        heroTitle.classList.add('animate');
      }, 100);
      
      // 서브 텍스트는 0.25초 후에 나타남
      setTimeout(() => {
        heroSubtitle.classList.remove('enter');
        heroSubtitle.classList.add('animate');
      }, 250);
      
    }, 400);
    
    // 전환 완료 후 플래그 리셋 및 프로그레스 바 시작
    setTimeout(() => {
      isTransitioning = false;
      // 프로그레스 바 시작 (자동 전환인 경우)
      if (isPlaying) {
        startProgressAnimation();
      }
    }, 800);
  }

  // 플레이/일시정지 버튼 클릭 이벤트
  const playPauseBtn = document.querySelector('.play-pause-btn');
  playPauseBtn.addEventListener('click', togglePlayPause);
  
  // 점 클릭 이벤트
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      // 수동 클릭 시 즉시 슬라이드 전환
      showSlide(index, true);
      // 클릭 시 자동 슬라이드 재시작
      restartAutoSlide();
    });
  });

  // 자동 슬라이드 함수 (프로그레스 바 완료 시점에만 전환)
  function startAutoSlide() {
    // 프로그레스 바가 완료되면 자동으로 다음 슬라이드로 전환
    // 실제 전환은 startProgressAnimation 함수에서 처리
    return setInterval(() => {
      // 이 함수는 더 이상 직접 슬라이드를 전환하지 않음
      // 프로그레스 바 완료 시점에 showSlide가 호출됨
    }, 4000);
  }
  
  // 자동 슬라이드 시작
  let autoSlideInterval = startAutoSlide();
  let isPlaying = true;
  
  // 자동 슬라이드 재시작 함수
  function restartAutoSlide() {
    if (isPlaying) {
      clearInterval(autoSlideInterval);
      autoSlideInterval = startAutoSlide();
    }
  }
  
  // 프로그레스 바 애니메이션
  let currentProgressInterval = null;
  let savedProgress = 0; // 일시정지 시점의 진행률 저장
  let progressStartTime = 0; // 프로그레스 시작 시간 저장
  
  function startProgressAnimation(resumeFromSaved = false) {
    // 기존 프로그레스 바 애니메이션 정리
    if (currentProgressInterval) {
      clearInterval(currentProgressInterval);
      currentProgressInterval = null;
    }
    
    const activeDot = document.querySelector('.dot.active');
    if (!activeDot) return;
    
    const progressCircle = activeDot.querySelector('.progress-ring-circle');
    if (!progressCircle) return;
    
    // 원의 둘레 계산 (2 * π * r)
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    
    if (!resumeFromSaved) {
      // 새로운 슬라이드 시작 시 모든 프로그레스 바를 0%로 리셋
      document.querySelectorAll('.progress-ring-circle').forEach(circle => {
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference;
      });
      savedProgress = 0;
      progressStartTime = Date.now();
    }
    
    // stroke-dasharray와 stroke-dashoffset 설정
    progressCircle.style.strokeDasharray = circumference;
    
    if (resumeFromSaved) {
      // 일시정지 시점부터 재개
      const offset = circumference - (savedProgress / 40) * circumference;
      progressCircle.style.strokeDashoffset = offset;
    } else {
      progressCircle.style.strokeDashoffset = circumference;
    }
    
    // 4초 동안 프로그레스 바 애니메이션 (더 부드럽게)
    let progress = resumeFromSaved ? savedProgress : 0;
    const startProgress = progress;
    
    currentProgressInterval = setInterval(() => {
      if (!isPlaying || !activeDot.classList.contains('active')) {
        clearInterval(currentProgressInterval);
        currentProgressInterval = null;
        return;
      }
      
      progress += 0.5; // 0.5씩 증가하여 더 부드럽게
      savedProgress = progress; // 현재 진행률 저장
      const offset = circumference - (progress / 40) * circumference;
      progressCircle.style.strokeDashoffset = offset;
      
      if (progress >= 40) {
        clearInterval(currentProgressInterval);
        currentProgressInterval = null;
        savedProgress = 0; // 완료 시 저장된 진행률 리셋
        // 프로그레스 바 완료 시점에 즉시 슬라이드 전환
        if (isPlaying && !isTransitioning) {
          const nextSlide = (currentSlide + 1) % images.length;
          showSlide(nextSlide);
        }
      }
    }, 50); // 50ms 간격으로 더 부드럽게
  }
  
  // 플레이/일시정지 토글
  function togglePlayPause() {
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    
    if (isPlaying) {
      // 일시정지
      clearInterval(autoSlideInterval);
      if (currentProgressInterval) {
        clearInterval(currentProgressInterval);
        currentProgressInterval = null;
      }
      pauseIcon.classList.remove('active');
      playIcon.classList.add('active');
      isPlaying = false;
    } else {
      // 재생
      autoSlideInterval = startAutoSlide();
      playIcon.classList.remove('active');
      pauseIcon.classList.add('active');
      isPlaying = true;
      startProgressAnimation(true); // 저장된 진행률부터 재개
    }
  }
});

// Rolling Images 자동 전환 및 스크롤 애니메이션

// 페이지 로드 완료 로그
document.addEventListener('DOMContentLoaded', function() {
  console.log('=== DOM 로드 완료 ===');
});

window.addEventListener('load', function() {
  console.log('=== 페이지 로드 완료 ===');
});


/* ==== WHAT WE WANT TO DO 타임라인 ==== */
(() => {
  const section   = document.querySelector('.vision-section');
  if (!section) return;

               const stage     = section.querySelector('.vision-container');
  const header    = section.querySelector('.vision-text');
         const headlineLines = section.querySelectorAll('.headline-line');
  const lines     = section.querySelectorAll('.text-line');
  const card      = section.querySelector('.vision-card');
         const cardImages = section.querySelectorAll('.card-image');
         const earthBackground = section.querySelector('.earth-background');
         const earthOverlay = section.querySelector('.earth-overlay');
         const cardOverlay = section.querySelector('.card-overlay');
         const earthMaskRect = document.getElementById('earth-mask-rect');
         const earthTitle = section.querySelector('.earth-title');
         const earthSubtitle = section.querySelector('.earth-subtitle');

         // 헤드라인 애니메이션 상태 관리
         let headlineAnimated = false;

  let ticking = false;
  const clamp01 = v => Math.max(0, Math.min(1, v));

  function onScroll(){
    if (!ticking){ requestAnimationFrame(update); ticking = true; }
  }
  function update(){
    ticking = false;

    const r = section.getBoundingClientRect();
    const total = Math.max(1, r.height - window.innerHeight);  // 섹션 내 스크롤 길이
    const y = Math.min(Math.max(-r.top, 0), total);
               const p = y / total;                                       // 0..1
           const vh = window.innerHeight; // px 기반 계산

           // JavaScript로 sticky 효과 구현
           if (r.top <= 0) {
             // 섹션이 화면 상단에 도달하면 fixed로 고정
             stage.style.position = 'fixed';
             stage.style.top = '0px';
    } else {
             // 섹션이 아직 위에 있으면 absolute로 복원
             stage.style.position = 'absolute';
             stage.style.top = '0px';
           }

    // 구간( WHAT WE WANT TO DO 애니메이션 타임라인 - 1000vh 기준)
    const fillStart = 0.08;  // 텍스트 채우기 시작 (8% = 80vh)
    const fillEnd   = 0.30;  // 텍스트 채우기 끝 (30% = 300vh)
    const imgStart  = 0.33;  // 카드 등장 시작 (33% = 330vh)
    const imgLock   = 0.45;  // 카드 중앙 도달 (45% = 450vh)
    const earthMaskStart = 0.53;  // earth 마스크 등장 (53% = 530vh)
    const earthMaskExpand = 0.58; // earth 마스크 확장 시작 (58% = 580vh)
    const zoomEnd   = 0.70;  // earth 마스크 최대 확장 (70% = 700vh)
    const textStart = 0.75;  // 텍스트 등장 시작 (75% = 750vh)

             /* 1) 헤드라인: 섹션 진입 시 자동 애니메이션 */
         if (r.top <= 200 && !headlineAnimated) { // 200px 더 일찍 시작
           // 섹션이 뷰포트에 진입하기 전에 헤드라인 애니메이션 시작
           headlineAnimated = true;
           
           headlineLines.forEach((line, index) => {
             const textLine = line.querySelector('.text-line');
             if (textLine) {
               // 모든 줄이 동시에 나타남 (시간차 0)
               textLine.style.transform = `translateY(0%)`;
             }
           });
         } else if (r.top > 200 && headlineAnimated) {
           // 백스크롤 시 초기화 (등장과 같은 속도로 사라짐)
           headlineAnimated = false;
           headlineLines.forEach((line) => {
             const textLine = line.querySelector('.text-line');
             if (textLine) {
               // 등장과 같은 0.4초 transition으로 사라짐
               textLine.style.transform = `translateY(100%)`;
             }
           });
         }
         
         // 헤드라인은 항상 보이도록 설정
         header.style.opacity = 1;

             /* 2) 텍스트 채우기 (8% ~ 30% = 80vh ~ 300vh) */
         if (p >= fillStart && p <= fillEnd) {
           const tFill = (p - fillStart) / (fillEnd - fillStart); // 0~1
           
           // "WHAT WE" 줄: 8% ~ 19%에서 채워짐 (0% ~ 50% 구간)
           // "WANT TO DO" 줄: 19% ~ 30%에서 채워짐 (50% ~ 100% 구간)
           lines.forEach((el, index) => {
             const lineStart = index * 0.5; // 각 줄의 시작 비율 (0, 0.5)
             const lineEnd = (index + 1) * 0.5; // 각 줄의 끝 비율 (0.5, 1.0)

             if (tFill <= lineStart) {
               // 아직 이 줄이 시작되지 않음
               el.style.setProperty('--p', '0%');
             } else if (tFill >= lineEnd) {
               // 이 줄이 완전히 채워짐
               el.style.setProperty('--p', '100%');
  } else {
               // 이 줄이 진행 중 - 스크롤과 정확히 1:1 매칭
               const lineProgress = (tFill - lineStart) / 0.5;
               const percentage = Math.max(0, Math.min(100, lineProgress * 100));
               el.style.setProperty('--p', `${percentage}%`);
             }
           });
         } else if (p < fillStart) {
           // 채우기 시작 전 - 모든 줄 0%
           lines.forEach((el) => {
             el.style.setProperty('--p', '0%');
           });
         } else if (p > fillEnd) {
           // 채우기 완료 후 - 모든 줄 100%
           lines.forEach((el) => {
             el.style.setProperty('--p', '100%');
           });
         }

           /* 3) Earth 배경 레이어: 마스크로 제어 (53% ~ 70% = 530vh ~ 700vh) */
         if (earthBackground) {
           earthBackground.style.opacity = '1'; // 항상 불투명
           
             if (p >= earthMaskStart) {
               // 53%: 카드와 동일한 사이즈로 마스크 구멍 생성 (카드에 가려서 보이지 않음)
               if (p >= earthMaskStart && p < earthMaskExpand) {
                 // 카드와 동일한 크기 (라운딩 사각형 마스크)
                 const viewportWidth = window.innerWidth;
                 const viewportHeight = window.innerHeight;
                 
                 // 카드 크기를 뷰포트 기준으로 계산
                 const cardWidthPercent = (480 / viewportWidth) * 100;
                 const cardHeightPercent = (640 / viewportHeight) * 100;
                 
                 earthBackground.style.setProperty('--earth-mask-width', `${cardWidthPercent}%`);
                 earthBackground.style.setProperty('--earth-mask-height', `${cardHeightPercent}%`);
                 earthBackground.style.setProperty('--earth-mask-radius', '0px');
               }
               // 58%: earth 마스크 확장 및 카드 사라짐
               else if (p >= earthMaskExpand) {
                 const tExpand = Math.max(0, Math.min(1, (p - earthMaskExpand) / (zoomEnd - earthMaskExpand)));
               
               // 58% 시점의 지구 마스크 크기 (576 * 768)로 마스크 시작
               const viewportWidth = window.innerWidth;
               const viewportHeight = window.innerHeight;
               
               // 58% 시점의 실제 마스크 크기
               const cardWidth = 576;
               const cardHeight = 768;
               
               const cardWidthPercent = (cardWidth / viewportWidth) * 100;
               const cardHeightPercent = (cardHeight / viewportHeight) * 100;
               
               // 카드 크기에서 화면 전체 크기로 확장 (GNB 높이 포함)
               const expandWidth = cardWidthPercent + (100 - cardWidthPercent) * tExpand;
               const expandHeight = cardHeightPercent + (100 - cardHeightPercent) * tExpand;
               
                 // radius가 19.2에서 0으로 점차 변경
                 const startRadius = 19.2;
                 const endRadius = 0;
                 const currentRadius = startRadius - (startRadius - endRadius) * tExpand;
               
               earthBackground.style.setProperty('--earth-mask-width', `${expandWidth}%`);
               earthBackground.style.setProperty('--earth-mask-height', `${expandHeight}%`);
               earthBackground.style.setProperty('--earth-mask-radius', `${currentRadius}px`);
               
               // 디버깅용 로그
               if (p > 0.58) {
                 console.log('Earth 마스크 확장:', {
                   progress: p.toFixed(3),
                   expandProgress: tExpand.toFixed(3),
                   width: expandWidth.toFixed(1) + '%',
                   height: expandHeight.toFixed(1) + '%',
                   radius: currentRadius.toFixed(1) + 'px'
                 });
               }
      }
      } else {
               // 53% 이전까지는 마스크 크기 0% (완전히 가려짐)
               earthBackground.style.setProperty('--earth-mask-width', '0%');
               earthBackground.style.setProperty('--earth-mask-height', '0%');
               earthBackground.style.setProperty('--earth-mask-radius', '0px');
             }
         }
         
         if (earthOverlay) {
           if (p >= earthMaskStart) {
             earthOverlay.classList.add('active');
    } else {
             earthOverlay.classList.remove('active');
           }
         }

         /* 5) Earth 텍스트 애니메이션 (75% ~ 100% = 750vh ~ 1000vh) */
         if (p >= textStart) {
           // 타이틀과 서브타이틀 순차 등장 (0.2초 차이)
           if (earthTitle) {
             earthTitle.style.transform = `translateY(0%)`;
           }
           
           // 0.2초 후 서브타이틀 등장
           setTimeout(() => {
             if (earthSubtitle) {
               earthSubtitle.style.transform = `translateY(0%)`;
             }
           }, 200);
         } else {
           // 75% 이전에는 텍스트 숨김
           if (earthTitle) {
             earthTitle.style.transform = `translateY(100%)`;
           }
           if (earthSubtitle) {
             earthSubtitle.style.transform = `translateY(100%)`;
           }
         }

           /* 4) 카드 이미지: 화면 아래에서 위로 등장 (33% ~ 58% = 330vh ~ 580vh) */
           const tImg = Math.max(0, Math.min(1,(p - imgStart) / (imgLock - imgStart)));
           const startY = 125;  // 125vh 아래에서 시작 (화면에 완전히 숨김)
           const endY = 0;      // 0% (컨테이너 중앙)에서 끝
           const yOffset = startY + (endY - startY) * tImg;  // 125vh → 0%
           
           // 디버깅용 로그
           if (p >= imgStart && p <= imgLock) {
             console.log('카드 위치:', {
               progress: p.toFixed(3),
               tImg: tImg.toFixed(3),
               yOffset: yOffset.toFixed(1),
               isCenter: Math.abs(yOffset) < 0.1,
               transform: Math.abs(yOffset) < 0.1 ? 
                 'translate(-50%, -50%)' : 
                 `translate(-50%, calc(-50% + ${yOffset}vh))`
             });
           }

         if (card) {
           // 33% 이전에는 완전히 숨김 (330vh 이전)
           if (p < imgStart) {
             card.style.opacity = '0';
             card.style.transform = `translate(-50%, calc(-50% + 125vh)) scale(1)`;
           }
           // 58% 지점에서 카드 사라짐 (580vh)
           else if (p >= earthMaskExpand) {
             card.style.opacity = '0';
           } else {
             card.style.opacity = '1';
             if (Math.abs(yOffset) < 0.1) {
               // 45%에서 정확히 중앙에 도달할 때 (450vh, 부동소수점 오차 고려)
               card.style.transform = `translate(-50%, -50%) scale(1)`;
             } else {
               card.style.transform = `translate(-50%, calc(-50% + ${yOffset}vh)) scale(1)`;
             }
           }
         }

         // 텍스트와 중앙정렬될 때까지 사이즈 고정, 그 이후에만 줌 (58% = 580vh 이전까지만)
         if (p >= imgStart && p < earthMaskExpand) {
           const tZoom = Math.max(0, Math.min(1,(p - imgLock) / (earthMaskExpand - imgLock)));
           const zoom  = 1 + 0.2 * tZoom; // 1.0 → 1.2 (20% 확대)
           
           // 라운딩값이 1.0 → 1.2 확대되면서 16px → 0px로 점차 변경
           const startRadius = 16;
           const endRadius = 0;
           const currentRadius = startRadius - (startRadius - endRadius) * tZoom;
           
           if (card && p >= imgLock) {
             // 스케일과 translate를 함께 적용하여 정중앙 기준으로 확대
             if (Math.abs(yOffset) < 0.1) {
               // 45%에서 정확히 중앙에 도달할 때 (450vh, 부동소수점 오차 고려)
               card.style.transform = `translate(-50%, -50%) scale(${zoom})`;
        } else {
               card.style.transform = `translate(-50%, calc(-50% + ${yOffset}vh)) scale(${zoom})`;
             }
             
             // 라운딩값 동적 변경
             card.style.borderRadius = `${currentRadius}px`;
           }
         }
  }

  window.addEventListener('scroll', onScroll, { passive:true });
  
  // 카드 이미지 자동 전환 (0.8초 간격) - 겹침 없는 전환
  let currentImageIndex = 0;
  let isEarthMode = false;
  
  function switchCardImage() {
    if (cardImages.length === 0) return;

    // 다음 이미지 인덱스 계산
    const nextImageIndex = (currentImageIndex + 1) % cardImages.length;
    const currentActive = cardImages[currentImageIndex];
    const nextImage = cardImages[nextImageIndex];

    // 1. 다음 이미지를 먼저 불투명하게 설정 (겹침 방지)
    nextImage.classList.add('active');
    nextImage.style.opacity = '1';

    // 2. 현재 이미지를 페이드 아웃
    if (currentActive) {
      currentActive.style.opacity = '0';

      // 페이드 아웃 완료 후 클래스 제거
      setTimeout(() => {
        currentActive.classList.remove('active');
      }, 400); // transition 시간의 절반
    }

    // 3. 현재 인덱스 업데이트
    currentImageIndex = nextImageIndex;
  }

  // 0.8초 간격으로 이미지 전환
  const imageInterval = setInterval(switchCardImage, 800);

  // 초기화 확인 로그
  console.log('WHAT WE WANT TO DO 섹션 초기화 완료:', {
    section: !!section,
    stage: !!stage,
    header: !!header,
    lines: lines.length,
    card: !!card,
    cardImages: cardImages.length
  });

  update();
})();

/* ==== BUSINESS SECTION 애니메이션 ==== */
(() => {
  const section = document.querySelector('.business-section');
  if (!section) return;

  const container = section.querySelector('.business-container');
  const businessText = section.querySelector('.business-text');
  const businessSubtitle = section.querySelector('.business-subtitle');
  const businessMoreBtn = section.querySelector('.business-more-btn');
  const businessCards = section.querySelectorAll('.business-card');

  let ticking = false;
  let textAnimated = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  function update() {
    ticking = false;

    const r = section.getBoundingClientRect();
    
    // 비즈니스 섹션에 접근했을 때만 애니메이션 활성화
    const isInView = r.top <= window.innerHeight && r.bottom >= 0;
    
    if (!isInView) {
      // 섹션 밖에 있을 때는 애니메이션 비활성화
      return;
    }

    const total = Math.max(1, r.height - window.innerHeight);
    const y = Math.min(Math.max(-r.top, 0), total);
    const p = y / total; // 0..1

    // 비즈니스 섹션 sticky 동작 제어
    if (r.top <= 0) {
      // 섹션이 화면 상단에 도달했을 때 sticky 유지
      section.classList.add('sticky');
      container.style.position = 'fixed';
      container.style.top = '0px';
    } else {
      // 섹션이 아직 화면 상단에 도달하지 않았을 때
      section.classList.remove('sticky');
      container.style.position = 'absolute';
      container.style.top = '0px';
    }

    // Section in view 모션 - 텍스트 등장
    if (r.top <= 200 && !textAnimated) {
      textAnimated = true;
      
      // 타이틀 등장
      if (businessSubtitle) {
        businessSubtitle.style.transform = 'translateY(0)';
        businessSubtitle.style.opacity = '1';
      }
      
      // 버튼 등장 (0.2초 후)
      setTimeout(() => {
        if (businessMoreBtn) {
          businessMoreBtn.style.transform = 'translateY(0)';
          businessMoreBtn.style.opacity = '1';
        }
      }, 200);
    } else if (r.top > 200 && textAnimated) {
      textAnimated = false;
      
      // 텍스트 숨김
      if (businessSubtitle) {
        businessSubtitle.style.transform = 'translateY(100px)';
        businessSubtitle.style.opacity = '0';
      }
      if (businessMoreBtn) {
        businessMoreBtn.style.transform = 'translateY(100px)';
        businessMoreBtn.style.opacity = '0';
      }
    }

    // 카드 애니메이션 - 상하 갭을 유지하며 자연스럽게 스크롤
    businessCards.forEach((card, index) => {
      const cardHeight = 600; // 카드 높이 (px) - 450*600으로 축소
      const cardGap = 180; // 카드 간 상하 갭 (px)
      const totalCardSpace = cardHeight + cardGap; // 카드 + 갭의 총 공간 (780px)
      const cardStartY = 100; // 첫 번째 카드 시작 위치 (px)
      const cardY = cardStartY + (index * totalCardSpace); // 각 카드의 Y 위치
      
      // 스크롤 진행률에 따른 카드 위치 계산
      const totalScrollDistance = (businessCards.length - 1) * totalCardSpace + cardHeight;
      const scrollOffset = p * totalScrollDistance;
      const currentY = cardY - scrollOffset;
      
      // 카드가 화면 중앙에 오는지 확인 (농업 카드가 마지막)
      const isLastCard = index === businessCards.length - 1;
      const centerY = window.innerHeight / 2;
      
      if (isLastCard && currentY <= centerY) {
        // 마지막 카드가 화면 중앙에 도달하면 스크롤 종료
        // 카드 전체가 화면 중앙에 완전히 보이도록 위치 조정
        card.style.opacity = '1';
        card.style.transform = `translateY(${centerY - cardHeight/2}px)`;
      } else {
        // 모든 카드는 항상 opacity: 1로 유지하고 화면 밖으로 나가면서 자연스럽게 사라짐
        card.style.opacity = '1';
        card.style.transform = `translateY(${currentY - cardHeight/2}px)`;
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();
