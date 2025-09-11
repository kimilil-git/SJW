// Header scroll effect
window.addEventListener('scroll', function() {
  const header = document.querySelector('.header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
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
let currentRollingImageIndex = 0;
let rollingImageInterval = null;
let lastScrollTime = 0;
let scrollTimeout = null;

// 페이지 로드 시 카드 강제 표시 (테스트용)
document.addEventListener('DOMContentLoaded', function() {
  console.log('=== DOM 로드 완료 ===');
  
  const rollingContainer = document.querySelector('.rolling-sticky-container');
  console.log('DOM 로드 시 Rolling Container:', rollingContainer);
  
  if (rollingContainer) {
    rollingContainer.style.display = 'block';
    rollingContainer.style.background = 'rgba(255, 0, 0, 0.8)';
    rollingContainer.style.border = '5px solid blue';
    rollingContainer.style.zIndex = '9999';
    console.log('✅ DOM 로드 시 카드 강제 표시 완료!');
  } else {
    console.error('❌ DOM 로드 시 Rolling Container를 찾을 수 없습니다!');
  }
});

window.addEventListener('load', function() {
  console.log('=== 페이지 로드 완료 ===');
  
  const rollingContainer = document.querySelector('.rolling-sticky-container');
  console.log('페이지 로드 시 Rolling Container:', rollingContainer);
  
  if (rollingContainer) {
    rollingContainer.style.display = 'block';
    rollingContainer.style.background = 'rgba(255, 0, 0, 0.8)';
    rollingContainer.style.border = '5px solid blue';
    rollingContainer.style.zIndex = '9999';
    console.log('✅ 페이지 로드 시 카드 강제 표시 완료!');
  } else {
    console.error('❌ 페이지 로드 시 Rolling Container를 찾을 수 없습니다!');
  }
});

function startRollingImageTransition() {
  const rollingImages = document.querySelectorAll('.rolling-image');
  const totalImages = rollingImages.length;
  
  // 첫 번째 이미지 활성화
  currentRollingImageIndex = 0;
  rollingImages.forEach((img, index) => {
    if (index === 0) {
      img.classList.add('active');
    } else {
      img.classList.remove('active');
    }
  });
  
  rollingImageInterval = setInterval(() => {
    // 현재 이미지 숨기기
    rollingImages[currentRollingImageIndex].classList.remove('active');
    
    // 다음 이미지로 이동
    currentRollingImageIndex = (currentRollingImageIndex + 1) % totalImages;
    
    // 새 이미지 표시
    rollingImages[currentRollingImageIndex].classList.add('active');
  }, 1200); // 1.2초마다 전환
}

function stopRollingImageTransition() {
  if (rollingImageInterval) {
    clearInterval(rollingImageInterval);
    rollingImageInterval = null;
  }
}

// What we want to do 섹션 스크롤 애니메이션
window.addEventListener('scroll', function() {
  const whatWeWantSection = document.querySelector('.what-we-want-section');
  if (!whatWeWantSection) return; // 섹션이 없으면 즉시 리턴
  
  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  
  // Scroll-driven text reveal 애니메이션
  const textReveals = whatWeWantSection.querySelectorAll('.text-reveal');
  const sectionHeader = whatWeWantSection.querySelector('.section-header');
  
  // "WHAT WE WANT TO DO" 텍스트 위치 기준으로 카드 위치 동적 계산
  const rollingContainer = document.querySelector('.rolling-sticky-container');
  
  // 1단계: 디버깅 - 요소 존재 확인
  console.log('=== 디버깅 시작 ===');
  console.log('Rolling Container:', rollingContainer);
  console.log('Section Header:', sectionHeader);
  console.log('Scroll Y:', scrollY);
  console.log('Window Height:', windowHeight);
  
  // 강제로 카드 표시 (테스트용)
  if (rollingContainer) {
    rollingContainer.style.display = 'block';
    rollingContainer.style.background = 'rgba(255, 0, 0, 0.3)';
    rollingContainer.style.border = '2px solid red';
    console.log('카드 강제 표시 완료!');
  } else {
    console.error('❌ Rolling Container를 찾을 수 없습니다!');
  }
  
  if (rollingContainer && sectionHeader) {
    const headerRect = sectionHeader.getBoundingClientRect();
    const headerBottom = headerRect.bottom + window.scrollY;
    
    console.log('Header Rect:', headerRect);
    console.log('Header Bottom:', headerBottom);
    
    // 히어로 섹션을 지나서 스크롤했는지 확인
    if (scrollY > windowHeight) {
      // 스크롤 진행률 계산 (히어로 섹션 이후부터)
      const scrollAfterHero = scrollY - windowHeight;
      const maxScroll = 1000; // 최대 스크롤 거리
      const scrollProgress = Math.min(scrollAfterHero / maxScroll, 1);
      
      console.log('Scroll After Hero:', scrollAfterHero);
      console.log('Scroll Progress:', scrollProgress);
      console.log('Scroll Progress > 0.1:', scrollProgress > 0.1);
      
      // 카드가 보이기 시작하는 지점 (스크롤 10% 이후로 완화)
      if (scrollProgress > 0.1) {
        rollingContainer.style.display = 'block';
        
        // 스크롤 진행률에 따라 카드 위치 조정 (패럴랙스 효과)
        if (scrollProgress <= 0.6) {
          // 20% ~ 60% 구간: 카드가 300px 아래에서 시작해서 점점 올라옴
          const startDistance = 300; // 시작 거리
          const endDistance = 0; // 끝 거리 (텍스트와 겹치기 직전)
          const adjustedProgress = (scrollProgress - 0.2) / 0.4; // 20%~60% 구간을 0~1로 정규화
          const currentDistance = startDistance - (adjustedProgress * startDistance);
          
          rollingContainer.style.top = `${headerBottom + currentDistance}px`;
          
                  // 디버깅: 카드 위치 확인
        console.log('Card position:', headerBottom + currentDistance, 'px', 'Progress:', scrollProgress);
        console.log('Card display style:', rollingContainer.style.display);
        console.log('Card top style:', rollingContainer.style.top);
      } else if (scrollProgress <= 0.9) {
        // 60% ~ 90% 구간: 카드가 텍스트와 겹치기 시작해서 정중앙으로 이동
        const centerProgress = (scrollProgress - 0.6) / 0.3;
        
        // 텍스트의 중앙 위치 계산 (텍스트 높이의 절반만큼 위로)
        const textHeight = sectionHeader.offsetHeight;
        const centerOffset = textHeight / 2;
        
        // 0px → -centerOffset (텍스트 정중앙)으로 이동
        const centerDistance = 0 - (centerProgress * centerOffset);
        
        rollingContainer.style.top = `${headerBottom + centerDistance}px`;
        
        // 디버깅: 카드 위치 확인
        console.log('Card center position:', headerBottom + centerDistance, 'px', 'Progress:', scrollProgress);
        console.log('Card display style:', rollingContainer.style.display);
        console.log('Card top style:', rollingContainer.style.top);
      } else {
        // 90% 이상: 패럴랙스 효과로 카드가 계속 올라옴
        const finalProgress = (scrollProgress - 0.9) / 0.1;
        
        // 텍스트의 중앙 위치 계산
        const textHeight = sectionHeader.offsetHeight;
        const centerOffset = textHeight / 2;
        
        // 정중앙에서 시작해서 계속 위로 올라가는 패럴랙스 효과
        const parallaxDistance = -centerOffset - (finalProgress * 200); // -200px까지 계속 올라감
        
        rollingContainer.style.top = `${headerBottom + parallaxDistance}px`;
        
        // 디버깅: 카드 위치 확인
        console.log('Card parallax position:', headerBottom + parallaxDistance, 'px', 'Progress:', scrollProgress);
        console.log('Card display style:', rollingContainer.style.display);
        console.log('Card top style:', rollingContainer.style.top);
      }
      } else {
        // 20% 이전에는 카드 숨김
        rollingContainer.style.display = 'none';
      }
    } else {
      // 히어로 섹션 내에 있으면 카드 숨김
      rollingContainer.style.display = 'none';
    }
  }
  
  // 스크롤 시간 기록
  lastScrollTime = Date.now();
  
  // 스크롤 타임아웃 설정 (스크롤 멈춤 감지)
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(() => {
    // 스크롤이 멈춘 후 500ms 후에 이미지 전환 시작
    if (Date.now() - lastScrollTime >= 500) {
      startRollingImageTransition();
    }
  }, 500);
  
  // 히어로 섹션을 지나서 스크롤했는지 확인
  if (scrollY > windowHeight) {
    // 스크롤 진행률 계산 (히어로 섹션 이후부터)
    const scrollAfterHero = scrollY - windowHeight;
    const maxScroll = 1000; // 최대 스크롤 거리
    const scrollProgress = Math.min(scrollAfterHero / maxScroll, 1);
    
    // 스크롤에 따라 텍스트 위치 자연스럽게 조절
    if (scrollProgress <= 0.6) { // 0% ~ 60% 구간: 아래에서 중앙으로 올라옴
      // 스크롤 진행률에 따라 Y 위치 계산
      const startY = 100; // 100vh에서 시작
      const endY = -10; // -10vh (화면 중앙에서 약간 위)에서 끝
      const currentY = startY - (scrollProgress / 0.6) * (startY - endY);
      
      // transform으로 위치 직접 제어
      sectionHeader.style.transform = `translate(-50%, ${currentY}vh)`;
    } else { // 60% 이상: 중앙에 락
      sectionHeader.style.transform = 'translate(-50%, -10vh)'; // 화면 중앙에서 약간 위에 고정
    }
    
    // 텍스트 컬러 채우기 애니메이션 (중앙에 락이 걸린 후에 시작)
    if (scrollProgress > 0.8) { // 80% 스크롤 후에 컬러 채우기 시작
      const colorProgress = (scrollProgress - 0.8) / 0.2; // 80%~100% 구간에서 컬러 채우기
      
      textReveals.forEach((textReveal, index) => {
        // 각 문장별로 지연 시간을 두고 시작 (타이핑 효과)
        let sentenceDelay;
        
        if (index === 0) {
          sentenceDelay = 0;
        } else if (index === 1) {
          sentenceDelay = 0.6;
        }
        
        const sentenceProgress = Math.max(0, Math.min(1, (colorProgress - sentenceDelay) / 0.4)); // 진행 구간 확장
        
        if (sentenceProgress > 0) {
          // 10% 단위로 양자화해서 CSS와 매칭 (0,10,...,100)
          const step = Math.max(0, Math.min(100, Math.round(sentenceProgress * 10) * 10));
          const revealClass = `reveal-${step}`;
          
          // 기존 reveal 클래스 제거 (떨림 방지를 위해 한 번에 처리)
          const allClasses = ['reveal-0', 'reveal-10', 'reveal-20', 'reveal-30', 'reveal-40', 
                             'reveal-50', 'reveal-60', 'reveal-70', 'reveal-80', 'reveal-90', 'reveal-100'];
          
          // 현재 클래스가 다를 때만 변경하여 떨림 방지
          if (!textReveal.classList.contains(revealClass)) {
            textReveal.classList.remove(...allClasses);
            textReveal.classList.add(revealClass);
          }
        } else {
          // 아직 시작되지 않은 문장은 완전히 숨김
          const allClasses = ['reveal-0', 'reveal-10', 'reveal-20', 'reveal-30', 'reveal-40', 
                             'reveal-50', 'reveal-60', 'reveal-70', 'reveal-80', 'reveal-90', 'reveal-100'];
          textReveal.classList.remove(...allClasses);
        }
      });
      
      // Rolling 이미지 애니메이션 시작
      if (scrollProgress > 0.9) { // 90% 스크롤 후에 이미지 애니메이션 시작
        const imageProgress = (scrollProgress - 0.9) / 0.1; // 90%~100% 구간에서 이미지 애니메이션
        
        const rollingCard = document.querySelector('.rolling-card');
        if (rollingCard) {
          // 스크롤 진행률에 따라 카드 확대/축소 효과 (더 자연스럽게)
          const scale = 1 + (imageProgress * 0.1); // 1.0 → 1.1 (미세한 확대)
          rollingCard.style.transform = `scale(${scale})`;
          
          // 이미지 전환 시작
          if (!rollingImageInterval) {
            startRollingImageTransition();
          }
        }
      } else {
        // 이미지 애니메이션이 시작되기 전에는 초기 상태로 유지
        const rollingCard = document.querySelector('.rolling-card');
        if (rollingCard) {
          rollingCard.style.transform = 'scale(1)';
        }
        
        // 이미지 전환 중지
        stopRollingImageTransition();
      }
    } else {
      // 컬러 채우기가 시작되기 전에는 모든 텍스트를 초기 상태로 유지
      textReveals.forEach((textReveal) => {
        textReveal.classList.remove('reveal-0', 'reveal-10', 'reveal-20', 'reveal-30', 'reveal-40', 
                                   'reveal-50', 'reveal-60', 'reveal-70', 'reveal-80', 'reveal-90', 'reveal-100');
      });
      
      // 이미지 전환 중지
      stopRollingImageTransition();
    }
  } else {
    // 히어로 섹션 내에 있으면 텍스트를 아래로 숨김
    sectionHeader.style.transform = 'translate(-50%, 100vh)';
    
    // 모든 텍스트를 초기 상태로 리셋
    textReveals.forEach((textReveal) => {
      textReveal.classList.remove('reveal-0', 'reveal-10', 'reveal-20', 'reveal-30', 'reveal-40', 
                                 'reveal-50', 'reveal-60', 'reveal-70', 'reveal-80', 'reveal-90', 'reveal-100');
    });
    
    // 이미지 전환 중지
    stopRollingImageTransition();
  }
});

/* ==== WHAT WE WANT TO DO 타임라인 ==== */
(() => {
  const section   = document.querySelector('.vision-section');
  if (!section) return;

               const stage     = section.querySelector('.vision-container');
         const header    = section.querySelector('.vision-text');
         const lines     = section.querySelectorAll('.text-line');
         const card      = section.querySelector('.vision-card');
         const cardImages = section.querySelectorAll('.card-image');
         const earthImage = section.querySelector('.earth-image');
         const cardOverlay = section.querySelector('.card-overlay');

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
    if (r.top <= 120) {
      // 섹션이 헤더 아래에 도달하면 fixed로 고정
      stage.style.position = 'fixed';
      stage.style.top = '120px';
    } else {
      // 섹션이 아직 위에 있으면 relative로 복원
      stage.style.position = 'relative';
      stage.style.top = 'auto';
    }

    // 구간( WHAT WE WANT TO DO 애니메이션 타임라인 )
    const moveEnd   = 0.20;  // 헤드라인 아래→중앙 이동 종료 (0-20%)
    const fillStart = 0.20;  // 텍스트 채우기 시작 (20%에서 시작)
    const fillEnd   = 0.50;  // 텍스트 채우기 끝 (50%에서 완료)
    const imgStart  = 0.65;  // 이미지 위로 등장 시작 (65%에서 시작)
    const imgLock   = 0.80;  // 이미지 등장 완료 (80%에서 완료)
    const zoomEnd   = 1.00;  // 마지막에 살짝 줌 (80-100%)

             /* 1) 헤드라인: 아래(100vh)→중앙(무대 중앙)까지 '한 번만' 보간 (0-10%) */
         if (p <= moveEnd){
           // 무대 중심으로 끌어올리는 '연출'만 하고, grid 중앙 배치라 transform/top은 건드리지 않아도 됨.
           // 필요하면 opacity/scale만 살짝 보간해서 연출 추가.
           header.style.opacity = 0.4 + 0.6 * (p / moveEnd);
         } else {
           // 락 이후엔 더 이상 위치값을 갱신하지 않는다.
           header.style.opacity = 1;
         }

             /* 2) 텍스트 채우기 (한 줄씩 순차적으로) */
         const tFill = Math.max(0, Math.min(1,(p - fillStart) / (fillEnd - fillStart)));
         const totalSteps = lines.length * 10; // 총 단계 수 (줄 수 * 10)
         const currentStep = Math.round(tFill * totalSteps);

         lines.forEach((el, index) => {
           const lineStartStep = index * 10; // 각 줄의 시작 단계
           const lineEndStep = (index + 1) * 10; // 각 줄의 끝 단계

           if (currentStep <= lineStartStep) {
             // 아직 이 줄이 시작되지 않음
             el.style.setProperty('--p', '0%');
           } else if (currentStep >= lineEndStep) {
             // 이 줄이 완전히 채워짐
             el.style.setProperty('--p', '100%');
           } else {
             // 이 줄이 진행 중
             const lineProgress = (currentStep - lineStartStep) / 10;
             const step = Math.round(lineProgress * 10) * 10; // 0, 10, 20, ..., 100
             el.style.setProperty('--p', `${step}%`);
           }
         });

         /* 3) 카드 이미지: 화면 아래에서 위로 등장 (65%까지는 보이지 않음) */
         const tImg = Math.max(0, Math.min(1,(p - imgStart) / (imgLock - imgStart)));
         const startY = 100;  // 100vh 아래에서 시작
         const endY = -50;    // -50% (중앙)에서 끝
         const yOffset = startY + (endY - startY) * tImg;  // 100vh → -50%

         if (card) {
           card.style.transform = `translate(-50%, ${yOffset}%) scale(1)`;
           // opacity는 CSS에서 1로 고정, 페이드 효과 제거
         }

         // 텍스트와 중앙정렬될 때까지 사이즈 고정, 그 이후에만 줌
         const tZoom = Math.max(0, Math.min(1,(p - imgLock) / (zoomEnd - imgLock)));
         const zoom  = 1 + 0.08 * tZoom;
         if (card) {
           // 스케일과 translate를 함께 적용하여 정중앙 기준으로 확대
           card.style.transform = `translate(-50%, ${yOffset}%) scale(${zoom})`;
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
