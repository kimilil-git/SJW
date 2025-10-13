// 관리자 페이지 JavaScript
class AdminCMS {
    constructor() {
        this.content = null;
        this.isAuthenticated = false;
        this.currentTab = 'hero';
        this.careerFilter = 'all'; // 채용 공고 필터 상태
        
        this.init();
    }
    
    async init() {
        // 인증 상태 확인
        this.checkAuth();
        
        // 이벤트 리스너 등록
        this.setupEventListeners();
        
        // 콘텐츠 로드
        await this.loadContent();
        
        // 폼 바인딩
        this.bindFormData();
        
        // 시간 표시 시작
        this.startTimeDisplay();
    }
    
    // 인증 상태 확인
    checkAuth() {
        const token = localStorage.getItem('admin_token');
        if (token && this.isValidToken(token)) {
            this.isAuthenticated = true;
            this.showAdminInterface();
        } else {
            this.showLoginModal();
        }
    }
    
    // 토큰 유효성 검사
    isValidToken(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch {
            return false;
        }
    }
    
    // 로그인 모달 표시
    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('adminInterface').style.display = 'none';
    }
    
    // 관리자 인터페이스 표시
    showAdminInterface() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('adminInterface').style.display = 'block';
    }
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // 로그인 폼
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // 로그아웃
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
        
        // 탭 전환
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // 저장 버튼
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveContent();
        });
        
        // 미리보기 버튼
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.previewContent();
        });
        
        // 이미지 업로드
        this.setupImageUpload();
        
        // 동적 아이템 추가
        this.setupDynamicItems();
        
        // 기존 업로드 존들 초기화
        this.setupDragAndDropForNewZones();
        
        // 푸터와 SEO 업로드는 setupDragAndDropForNewZones에서 처리됨
        
        // Earth 배경 이미지 특별 처리
        this.setupEarthImageUpload();
        
        // 채용 공고 필터링 설정
        this.setupCareerFiltering();
    }
    
    
    // Earth 배경 이미지 업로드 특별 설정
    setupEarthImageUpload() {
        // DOM이 완전히 로드될 때까지 대기
        setTimeout(() => {
            const earthUploadZone = document.querySelector('[data-dropzone="vision-earth"]');
            const earthInput = document.getElementById('visionEarthUpload');
            
            console.log('Earth 배경 이미지 요소 검색 결과:', {
                earthUploadZone: !!earthUploadZone,
                earthInput: !!earthInput,
                earthUploadZoneElement: earthUploadZone,
                earthInputElement: earthInput
            });
            
            if (!earthUploadZone || !earthInput) {
                console.error('Earth 배경 이미지 업로드 요소를 찾을 수 없습니다');
                console.error('earthUploadZone:', earthUploadZone);
                console.error('earthInput:', earthInput);
                return;
            }
            
            // 이미 설정되었는지 확인
            if (earthUploadZone.hasAttribute('data-earth-setup')) {
                console.log('Earth 배경 이미지 업로드가 이미 설정되어 있습니다');
                return;
            }
            
            console.log('Earth 배경 이미지 업로드 설정 시작');
            
            // 설정 완료 표시
            earthUploadZone.setAttribute('data-earth-setup', 'true');
            
            // 기존 change 이벤트 제거 후 새로 추가 (중복 방지)
            earthInput.removeEventListener('change', earthInput._changeHandler);
            earthInput._changeHandler = (e) => {
                console.log('Earth 배경 이미지 파일 선택 이벤트 발생');
                const files = e.target.files;
                console.log('Earth 선택된 파일:', files ? files.length : 'null', '개');
                if (files && files.length) {
                    console.log('Earth 파일명:', files[0].name, '타입:', files[0].type, '크기:', files[0].size);
                    this.handleFileUpload(files, 'vision-earth');
                } else {
                    console.log('Earth 선택된 파일이 없습니다');
                }
            };
            earthInput.addEventListener('change', earthInput._changeHandler);
            
            // 기존 클릭 이벤트 제거 후 새로 추가 (중복 방지)
            earthUploadZone.removeEventListener('click', earthUploadZone._clickHandler);
            earthUploadZone._clickHandler = (e) => {
                // 재진입 가드 (이미 파일 선택 창이 열려있으면 무시)
                if (earthInput._opening) {
                    console.log('이미 Earth 배경 이미지 파일 선택 창이 열려있습니다');
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                console.log('Earth 배경 이미지 업로드 존 클릭됨');
                
                earthInput._opening = true;
                earthInput.click();
                
                // 파일 선택 완료 후 가드 해제
                const resetOpening = () => {
                    earthInput._opening = false;
                };
                
                // change 이벤트 발생 시 즉시 해제
                earthInput.addEventListener('change', resetOpening, { once: true });
                
                // 사용자가 취소한 경우 대비 (2초 후 안전 해제)
                setTimeout(resetOpening, 2000);
            };
            earthUploadZone.addEventListener('click', earthUploadZone._clickHandler);
            
            
            // 테스트용 직접 클릭 함수 (전역에서 접근 가능)
            window.testEarthUpload = () => {
                console.log('테스트: Earth 업로드 직접 실행');
                earthInput.click();
            };
            
            console.log('Earth 배경 이미지 업로드 설정 완료');
            console.log('테스트: 브라우저 콘솔에서 testEarthUpload() 실행해보세요');
        }, 1000); // 1초 후 실행
    }
    
    // 로그인 처리
    async handleLogin() {
        const password = document.getElementById('password').value;
        
        if (!password) {
            this.showToast('비밀번호를 입력해주세요', 'error');
            return;
        }
        
        try {
            this.showLoading();
            console.log('로그인 시도 중...', { password: password ? '***' : 'empty' });
            
            const response = await fetch('/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password })
            });
            
            console.log('로그인 응답 상태:', response.status);
            console.log('로그인 응답 헤더:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('로그인 응답 데이터:', result);
            
            if (result.success) {
                localStorage.setItem('admin_token', result.token);
                this.isAuthenticated = true;
                this.showAdminInterface();
                this.showToast('로그인 성공', 'success');
                console.log('로그인 성공, 토큰 저장됨');
            } else {
                this.showToast(result.error || '비밀번호가 올바르지 않습니다', 'error');
                console.error('로그인 실패:', result.error);
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            this.showToast(`로그인 중 오류가 발생했습니다: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // 로그아웃
    logout() {
        localStorage.removeItem('admin_token');
        this.isAuthenticated = false;
        this.showLoginModal();
        this.showToast('로그아웃되었습니다', 'success');
    }
    
    // 탭 전환
    switchTab(tabName) {
        // 모든 탭 비활성화
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 선택된 탭 활성화
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        
        // 탭 전환 후 업로드 존 완전 재설정
        setTimeout(() => {
            console.log('탭 전환 후 업로드 존 재설정 시작');
            this.setupDragAndDropForNewZones();
        }, 100);
    }
    
    // 콘텐츠 로드
    async loadContent() {
        try {
            const response = await fetch('../content.json');
            this.content = await response.json();
            console.log('콘텐츠 로드 완료:', this.content);
        } catch (error) {
            console.error('콘텐츠 로드 실패:', error);
            this.showToast('콘텐츠 로드에 실패했습니다', 'error');
        }
    }
    
    // 폼 데이터 바인딩
    bindFormData() {
        if (!this.content) return;
        
        // Hero 섹션
        if (this.content.hero) {
            this.renderHeroSlides();
        }
        
        // Vision 섹션
        if (this.content.vision) {
            document.getElementById('visionTitle').value = this.content.vision.title || '';
            document.getElementById('visionSubtitle').value = this.content.vision.subtitle || '';
            this.renderVisionRollingItems();
            this.renderImagePreview('visionEarthPreview', this.content.vision.backgroundImage);
        }
        
        // Business 섹션
        if (this.content.business) {
            document.getElementById('businessSubtitle').value = this.content.business.subtitleHtml || '';
            document.getElementById('businessMoreButton').value = this.content.business.moreButtonText || '';
            this.renderBusinessCards();
        }
        
        // Media 섹션
        if (this.content.media) {
            const mediaIntro = document.getElementById('mediaIntro');
            if (mediaIntro && this.content.media.richTextIntroHtml) {
                mediaIntro.innerHTML = this.content.media.richTextIntroHtml;
            }
            // 섹션 활성/비활성 상태 설정
            const mediaSectionActive = document.getElementById('mediaSectionActive');
            if (mediaSectionActive) {
                mediaSectionActive.checked = this.content.media.active !== false; // 기본값 true
            }
            this.renderMediaItems();
        }
        
        // Career 섹션
        if (this.content.career) {
            document.getElementById('careerCategories').value = (this.content.career.categories || []).join(', ');
            // 섹션 활성/비활성 상태 설정
            const careerSectionActive = document.getElementById('careerSectionActive');
            if (careerSectionActive) {
                careerSectionActive.checked = this.content.career.active !== false; // 기본값 true
            }
            this.renderCareerPosts();
        }
        
        // Footer 섹션
        if (this.content.footer) {
            document.getElementById('footerTitle').value = this.content.footer.title || '';
            document.getElementById('footerSubtitle').value = this.content.footer.subtitle || '';
            document.getElementById('footerButtonText').value = this.content.footer.buttonText || '';
            this.renderImagePreview('footerLogoPreview', this.content.footer.logo);
            
            if (this.content.footer.sns) {
                document.getElementById('instagramLink').value = this.content.footer.sns.instagram || '';
                document.getElementById('linkedinLink').value = this.content.footer.sns.linkedin || '';
                document.getElementById('youtubeLink').value = this.content.footer.sns.youtube || '';
                document.getElementById('blogLink').value = this.content.footer.sns.blog || '';
            }
        }
        
        // SEO 섹션
        if (this.content.seo) {
            document.getElementById('seoTitle').value = this.content.seo.title || '';
            document.getElementById('seoDescription').value = this.content.seo.description || '';
            document.getElementById('seoKeywords').value = (this.content.seo.keywords || []).join(', ');
            this.renderImagePreview('ogImagePreview', this.content.seo.ogImage);
        }
        
        // 모든 렌더링이 완료된 후 업로드 존에 이벤트 리스너 설정
        // (동적으로 생성된 업로드 존들이 DOM에 추가된 이후 실행)
        setTimeout(() => {
            this.setupDragAndDropForNewZones();
        }, 50);
    }
    
    // 이미지 업로드 설정
    setupImageUpload() {
        // 전역 드래그 이벤트 방지 (업로드 존이 아닌 곳에서만 차단)
        document.addEventListener('dragover', (e) => {
            // 업로드 존이 아닌 경우에만 기본 동작 차단
            if (!e.target.closest('.image-upload-zone')) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        document.addEventListener('drop', (e) => {
            // 업로드 존이 아닌 곳에서의 드롭은 차단 (브라우저 기본 동작 방지)
            if (!e.target.closest('.image-upload-zone')) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        // 초기 드래그 앤 드롭 설정
        this.setupDragAndDropForNewZones();
    }
    
    // 파일 업로드 처리
    async handleFileUpload(files, dropzone) {
        console.log('handleFileUpload 호출됨:', { files: files.length, dropzone });
        if (!files.length) return;
        
        // 비전 섹션은 이미지만 허용, 푸터는 SVG도 허용
        const isVisionSection = dropzone.startsWith('vision-');
        const isFooterSection = dropzone === 'footer-logo';
        const allowedTypes = isVisionSection 
            ? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
            : isFooterSection
            ? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4']
            : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
        
        console.log('허용된 파일 타입:', allowedTypes);
        
        const validFiles = Array.from(files).filter(file => {
            console.log('파일 유효성 검사:', { name: file.name, type: file.type, size: file.size });
            console.log('허용된 타입:', allowedTypes);
            console.log('타입 매치:', allowedTypes.includes(file.type));
            
            if (!allowedTypes.includes(file.type)) {
                const errorMsg = isVisionSection 
                    ? `${file.name}: 비전 섹션은 이미지 파일만 지원합니다 (JPG, PNG, GIF, WebP)`
                    : `${file.name}: 지원하지 않는 파일 형식입니다`;
                console.error('파일 타입 오류:', errorMsg);
                this.showToast(errorMsg, 'error');
                return false;
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB 제한
                const sizeErrorMsg = `${file.name}: 파일 크기가 너무 큽니다 (최대 10MB)`;
                console.error('파일 크기 오류:', sizeErrorMsg);
                this.showToast(sizeErrorMsg, 'error');
                return false;
            }
            console.log('파일 유효성 검사 통과:', file.name);
            return true;
        });
        
        console.log('유효한 파일 개수:', validFiles.length);
        if (validFiles.length === 0) {
            console.log('유효한 파일이 없어서 업로드를 중단합니다');
            return;
        }
        
        try {
            this.showLoading();
            
            for (const file of validFiles) {
                console.log('파일 업로드 시작:', { 
                    name: file.name, 
                    type: file.type, 
                    size: file.size, 
                    dropzone 
                });
                
                const formData = new FormData();
                formData.append('file', file);
                
                console.log('FormData 생성 완료, 서버 요청 시작');
                
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                console.log('서버 응답 상태:', response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('서버 오류 응답:', errorText);
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }
                
                const result = await response.json();
                console.log('업로드 응답:', result);
                
                if (result.success) {
                    console.log('업로드 성공, addImageToList 호출:', { dropzone, url: result.url });
                    this.addImageToList(dropzone, result.url);
                    
                    // 콘텐츠 데이터 자동 업데이트
                    this.updateContentDataFromUI();
                    
                    this.showToast(`${file.name} 업로드 성공`, 'success');
                } else {
                    console.error('업로드 실패:', result);
                    this.showToast(`${file.name} 업로드 실패: ${result.message || '알 수 없는 오류'}`, 'error');
                }
            }
            
            // 업로드 완료 후 input 리셋 (동일 파일 재업로드 가능하도록)
            const uploadZone = document.querySelector(`[data-dropzone="${dropzone}"]`);
            const input = uploadZone?.querySelector('input[type="file"]');
            if (input) {
                input.value = '';
            }
        } catch (error) {
            console.error('업로드 오류:', error);
            this.showToast('업로드 중 오류가 발생했습니다: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // 이미지를 리스트에 추가
    addImageToList(dropzone, url) {
        console.log('addImageToList 호출됨:', { dropzone, url });
        
        // 개별 아이템의 드롭존인지 확인 (hero-slide-0, business-card-1 등)
        const isIndividualItem = dropzone.includes('-') && (
            dropzone.startsWith('hero-slide-') ||
            dropzone.startsWith('business-card-') ||
            dropzone.startsWith('media-item-') ||
            dropzone.startsWith('vision-rolling-')
        );
        
        if (isIndividualItem) {
            // 개별 아이템의 미리보기 영역 업데이트
            console.log('개별 아이템 미리보기 업데이트:', dropzone);
            const uploadZone = document.querySelector(`[data-dropzone="${dropzone}"]`);
            const previewElement = uploadZone?.closest('.slide-item, .card-item, .accordion-item, .media-item')?.querySelector('.image-preview');
            
            if (previewElement) {
                // 기존 미리보기 제거 후 새 이미지 추가
                previewElement.innerHTML = '';
                
                if (this.isVideoFile(url)) {
                    // 비디오 파일인 경우
                    previewElement.innerHTML = `
                        <video src="${url}" controls class="video-thumbnail" muted>
                            <source src="${url}" type="video/mp4">
                            브라우저가 비디오를 지원하지 않습니다.
                        </video>
                    `;
                } else {
                    // 이미지 파일인 경우
                    previewElement.innerHTML = `
                        <img src="${url}" alt="Uploaded image">
                    `;
                }
                console.log('개별 아이템 미리보기 업데이트 완료');
            } else {
                console.error('미리보기 요소를 찾을 수 없습니다:', dropzone);
            }
        } else {
            // 정적 드롭존 처리 (footer-logo, og-image, vision-earth 등)
            console.log('정적 드롭존 미리보기 렌더링:', dropzone);
            const previewId = this.getPreviewIdFromDropzone(dropzone);
            this.renderImagePreview(previewId, url, dropzone);
        }
        
        // 콘텐츠 데이터 자동 업데이트
        this.updateContentDataFromUI();
    }
    
    // 새로 생성된 업로드 존에 드래그 앤 드롭 설정
    setupDragAndDropForNewZones() {
        console.log('setupDragAndDropForNewZones 시작');
        
        // 모든 업로드 존의 기존 이벤트 리스너 완전 제거
        document.querySelectorAll('.image-upload-zone').forEach(zone => {
            if (zone.dataset.dropzone === 'vision-earth') {
                return; // vision-earth는 별도 처리
            }
            
            // 기존 이벤트 리스너 제거
            if (zone._clickHandler) {
                zone.removeEventListener('click', zone._clickHandler);
                zone._clickHandler = null;
            }
            
            // 드래그앤드롭 이벤트 리스너 제거
            if (zone._dragoverHandler) {
                zone.removeEventListener('dragover', zone._dragoverHandler);
                zone._dragoverHandler = null;
            }
            
            if (zone._dragleaveHandler) {
                zone.removeEventListener('dragleave', zone._dragleaveHandler);
                zone._dragleaveHandler = null;
            }
            
            if (zone._dropHandler) {
                zone.removeEventListener('drop', zone._dropHandler);
                zone._dropHandler = null;
            }
            
            const input = zone.querySelector('input[type="file"]');
            if (input && input._changeHandler) {
                input.removeEventListener('change', input._changeHandler);
                input._changeHandler = null;
            }
            
            // 설정 플래그 제거
            zone.removeAttribute('data-drag-setup');
        });
        
        // 새로 설정되지 않은 업로드 존만 설정
        document.querySelectorAll('.image-upload-zone:not([data-drag-setup])').forEach(zone => {
            if (zone.dataset.dropzone === 'vision-earth') {
                return; // vision-earth는 별도 처리
            }
            
            const input = zone.querySelector('input[type="file"]');
            if (!input) {
                console.log('업로드 존에서 input을 찾을 수 없습니다:', zone);
                return;
            }
            
            // 이미 설정되었음을 표시
            zone.setAttribute('data-drag-setup', 'true');
            console.log('업로드 존 설정 완료:', zone.dataset.dropzone);
            
            // 클릭 이벤트 핸들러 생성 및 저장 (zone에만)
            zone._clickHandler = (e) => {
                // input 요소를 직접 클릭한 경우는 무시
                if (e.target === input) {
                    return;
                }
                
                // 재진입 가드 (이미 파일 선택 창이 열려있으면 무시)
                if (input._opening) {
                    console.log('이미 파일 선택 창이 열려있습니다:', zone.dataset.dropzone);
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                console.log('업로드 존 클릭됨:', zone.dataset.dropzone);
                
                input._opening = true;
                input.click();
                
                // 파일 선택 완료 후 가드 해제
                const resetOpening = () => {
                    input._opening = false;
                };
                
                // change 이벤트 발생 시 즉시 해제
                input.addEventListener('change', resetOpening, { once: true });
                
                // 사용자가 취소한 경우 대비 (2초 후 안전 해제)
                setTimeout(resetOpening, 2000);
            };
            
            // change 이벤트 핸들러 생성 및 저장
            input._changeHandler = (e) => {
                console.log('파일 선택 이벤트 발생:', zone.dataset.dropzone);
                const files = e.target.files;
                if (files.length > 0) {
                    this.handleFileUpload(files, zone.dataset.dropzone);
                }
            };
            
            // 드래그앤드롭 이벤트 핸들러 생성 및 저장
            zone._dragoverHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.add('drag-over');
            };
            
            zone._dragleaveHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.remove('drag-over');
            };
            
            zone._dropHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    console.log('드롭된 파일:', files, '드롭존:', zone.dataset.dropzone);
                    this.handleFileUpload(files, zone.dataset.dropzone);
                }
            };
            
            // 이벤트 리스너 등록
            zone.addEventListener('click', zone._clickHandler);
            zone.addEventListener('dragover', zone._dragoverHandler);
            zone.addEventListener('dragleave', zone._dragleaveHandler);
            zone.addEventListener('drop', zone._dropHandler);
            input.addEventListener('change', input._changeHandler);
        });
        
        console.log('setupDragAndDropForNewZones 완료');
    }
    
    // 드롭존에서 리스트 ID 가져오기
    getListIdFromDropzone(dropzone) {
        console.log('getListIdFromDropzone 호출됨:', dropzone);
        
        // 동적 드롭존 처리 (예: hero-slide-0, business-card-1 등)
        if (dropzone.startsWith('hero-slide-')) {
            return 'heroSlidesList';
        }
        if (dropzone.startsWith('business-card-')) {
            return 'businessCardsList';
        }
        if (dropzone.startsWith('media-item-')) {
            return 'mediaItemsList';
        }
        if (dropzone.startsWith('vision-rolling-')) {
            return 'visionRollingItemsList';
        }
        
        const mapping = {
            // 정적 드롭존들
        };
        const result = mapping[dropzone] || '';
        console.log('매핑 결과:', result);
        return result;
    }
    
    // 드롭존에서 미리보기 ID 가져오기
    getPreviewIdFromDropzone(dropzone) {
        const mapping = {
            'vision-earth': 'visionEarthPreview',
            'footer-logo': 'footerLogoPreview',
            'og-image': 'ogImagePreview'
        };
        return mapping[dropzone] || '';
    }
    
    // 이미지 아이템 생성
    createImageItem(url) {
        const item = document.createElement('div');
        item.className = 'image-item';
        
        const isVideo = this.isVideoFile(url);
        
        if (isVideo) {
            // 비디오 파일인 경우 (삭제 버튼 없음)
            item.innerHTML = `
                <video src="${url}" controls class="video-thumbnail" muted>
                    <source src="${url}" type="video/mp4">
                    브라우저가 비디오를 지원하지 않습니다.
                </video>
            `;
        } else {
            // 이미지 파일인 경우 (삭제 버튼 없음)
            item.innerHTML = `
                <img src="${url}" alt="Uploaded image">
            `;
        }
        
        return item;
    }
    
    // 이미지 리스트 렌더링
    renderImageList(listId, images) {
        const list = document.getElementById(listId);
        if (!list) return;
        
        list.innerHTML = '';
        images.forEach(url => {
            if (url) {
                const item = this.createImageItem(url);
                list.appendChild(item);
            }
        });
    }
    
    // 이미지 미리보기 렌더링
    renderImagePreview(previewId, url, dropzone = null) {
        const preview = document.getElementById(previewId);
        if (!preview) return;
        
        // 기존 미리보기 완전히 제거
        preview.innerHTML = '';
        
        if (!url) return;
        
        // 비디오 파일인지 확인
        const isVideo = this.isVideoFile(url);
        
        if (isVideo) {
            // 비디오 파일인 경우 비디오 태그로 직접 표시 (삭제 버튼 없음)
            preview.innerHTML = `
                <video src="${url}" controls class="video-thumbnail" muted>
                    <source src="${url}" type="video/mp4">
                    브라우저가 비디오를 지원하지 않습니다.
                </video>
            `;
        } else {
            // 이미지 미리보기 (삭제 버튼 없음)
            preview.innerHTML = `
                <img src="${url}" alt="Preview">
            `;
        }
    }
    
    // 비디오 파일인지 확인하는 헬퍼 함수
    isVideoFile(url) {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        const lowerUrl = url.toLowerCase();
        return videoExtensions.some(ext => lowerUrl.includes(ext));
    }
    
    // 비디오 썸네일 생성
    createVideoThumbnail(videoUrl, previewElement, isEarthBackground) {
        console.log('비디오 썸네일 생성 시작:', videoUrl);
        console.log('미리보기 요소:', previewElement);
        console.log('Earth 배경 여부:', isEarthBackground);
        
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        video.preload = 'metadata';
        // crossOrigin 제거 - 같은 도메인이므로 불필요
        
        // 타임아웃 설정 (20초로 증가)
        const timeout = setTimeout(() => {
            console.log('비디오 로딩 타임아웃 (20초)');
            this.showVideoPlaceholder(previewElement, isEarthBackground);
        }, 20000);
        
        video.onloadstart = () => {
            console.log('비디오 로딩 시작');
        };
        
        video.onloadedmetadata = () => {
            console.log('비디오 메타데이터 로드 완료, duration:', video.duration);
        };
        
        video.oncanplay = () => {
            console.log('비디오 재생 가능 상태');
            clearTimeout(timeout);
            
            try {
                // 비디오의 첫 번째 프레임으로 이동
                video.currentTime = 0.1; // 0.1초 지점으로 이동
                
                // 비디오의 첫 번째 프레임을 캔버스로 캡처
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 캔버스 크기 설정 (미리보기 크기에 맞춤)
                canvas.width = 200;
                canvas.height = 150;
                
                // 비디오의 첫 번째 프레임을 캔버스에 그리기
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // 캔버스를 이미지로 변환
                const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                console.log('비디오 썸네일 생성 성공');
                
                // 미리보기 HTML 생성
                if (isEarthBackground) {
                    previewElement.innerHTML = `
                        <div class="video-preview">
                            <img src="${thumbnailUrl}" alt="Video Thumbnail" class="video-thumbnail">
                            <div class="video-overlay">
                                <span class="video-icon">▶️</span>
                                <span class="video-label">MP4</span>
                            </div>
                        </div>
                    `;
                } else {
                    previewElement.innerHTML = `
                        <div class="video-preview">
                            <img src="${thumbnailUrl}" alt="Video Thumbnail" class="video-thumbnail">
                            <div class="video-overlay">
                                <span class="video-icon">▶️</span>
                                <span class="video-label">MP4</span>
                            </div>
                            <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.innerHTML=''">삭제</button>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('썸네일 생성 중 오류:', error);
                this.showVideoPlaceholder(previewElement, isEarthBackground);
            }
        };
        
        video.onerror = (error) => {
            console.error('비디오 로딩 실패:', error);
            console.error('비디오 URL:', videoUrl);
            console.error('비디오 요소:', video);
            clearTimeout(timeout);
            this.showVideoPlaceholder(previewElement, isEarthBackground);
        };
        
        video.onabort = () => {
            console.log('비디오 로딩 중단');
            clearTimeout(timeout);
            this.showVideoPlaceholder(previewElement, isEarthBackground);
        };
        
        // 비디오 로딩 시작
        video.load();
    }
    
    // 비디오 플레이스홀더 표시
    showVideoPlaceholder(previewElement, isEarthBackground) {
        if (isEarthBackground) {
            previewElement.innerHTML = `
                <div class="video-preview">
                    <div class="video-placeholder">
                        <span class="video-icon">🎥</span>
                        <span class="video-label">MP4</span>
                    </div>
                </div>
            `;
        } else {
            previewElement.innerHTML = `
                <div class="video-preview">
                    <div class="video-placeholder">
                        <span class="video-icon">🎥</span>
                        <span class="video-label">MP4</span>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.innerHTML=''">삭제</button>
                </div>
            `;
        }
    }
    
    // 히어로 슬라이드 렌더링
    renderHeroSlides() {
        const list = document.getElementById('heroSlidesList');
        if (!list) return;
        
        list.innerHTML = '';
        
        // 새로운 슬라이드 구조 처리
        if (this.content.hero?.slides) {
            this.content.hero.slides
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .forEach((slide, index) => {
                    const slideElement = this.createHeroSlide(slide, index);
                    list.appendChild(slideElement);
                });
        }
        // 기존 구조 호환성
        else if (this.content.hero?.backgrounds) {
            this.content.hero.backgrounds.forEach((background, index) => {
                const slide = {
                    id: `hero-${index + 1}`,
                    title: index === 0 ? (this.content.hero.title || '') : '',
                    subtitle: index === 0 ? (this.content.hero.subtitle || '') : '',
                    background: background,
                    active: true,
                    order: index + 1
                };
                const slideElement = this.createHeroSlide(slide, index);
                list.appendChild(slideElement);
            });
        }
        this.updateHeroSlideButtons();
        
        // 렌더링 완료 후 업로드 존에 이벤트 리스너 설정
        setTimeout(() => {
            this.setupDragAndDropForNewZones();
        }, 0);
    }
    
    // 히어로 슬라이드 생성
    createHeroSlide(slide, index) {
        const slideElement = document.createElement('div');
        slideElement.className = 'slide-item';
        
        // 최소 1개 유지를 위한 삭제 버튼 비활성화 체크
        // DOM에 실제 렌더링된 슬라이드 수를 기준으로 판단
        const list = document.getElementById('heroSlidesList');
        const totalSlides = list.children.length;
        const canDelete = totalSlides > 1;
        
        slideElement.innerHTML = `
            <div class="item-header">
                <h4 class="item-title">슬라이드 ${index + 1}</h4>
                <div class="item-actions">
                    <label class="active-toggle">
                        <input type="checkbox" ${slide.active ? 'checked' : ''} onchange="this.dataset.changed='true'">
                        활성
                    </label>
                    <button class="btn btn-sm btn-outline" onclick="adminCMS.moveSlideUp(this.closest('.slide-item'))">↑</button>
                    <button class="btn btn-sm btn-outline" onclick="adminCMS.moveSlideDown(this.closest('.slide-item'))">↓</button>
                    <button class="btn btn-sm btn-danger ${!canDelete ? 'disabled' : ''}" 
                            onclick="${canDelete ? 'adminCMS.deleteHeroSlide(this.closest(\'.slide-item\'))' : 'return false'}" 
                            ${!canDelete ? 'disabled' : ''}>${canDelete ? '삭제' : '삭제 불가'}</button>
                </div>
            </div>
            <div class="form-group">
                <label>순서</label>
                <input type="number" class="order-input" value="${slide.order || index + 1}" min="1" max="5" onchange="this.dataset.changed='true'">
            </div>
            <div class="form-group">
                <label>배경 이미지</label>
                <div class="image-upload-zone" data-dropzone="hero-slide-${index}">
                    <div class="upload-placeholder">
                        <p>여기에 파일을 드래그하거나 클릭하여 업로드</p>
                        <p class="file-info">지원 형식: JPG, PNG, GIF, WebP, MP4 | 최대 10MB</p>
                        <input type="file" accept="image/*,video/mp4" class="file-input-hidden">
                    </div>
                </div>
                <div class="image-preview">
                </div>
            </div>
            <div class="form-group">
                <label>타이틀</label>
                <input type="text" value="${slide.title || ''}" placeholder="슬라이드 타이틀" onchange="this.dataset.changed='true'">
            </div>
            <div class="form-group">
                <label>서브타이틀</label>
                <textarea rows="2" placeholder="슬라이드 서브타이틀" onchange="this.dataset.changed='true'">${slide.subtitle || ''}</textarea>
            </div>
        `;
        
        // 이미지 업로드 이벤트 설정
        const uploadZone = slideElement.querySelector('.image-upload-zone');
        const input = uploadZone.querySelector('input[type="file"]');
        const preview = slideElement.querySelector('.image-preview');
        
        // 클릭 핸들러는 setupDragAndDropForNewZones()에서 전역으로 처리
        input.addEventListener('change', (e) => {
            this.handleSlideImageUpload(e.target.files[0], preview);
        });
        
        // 기존 배경 이미지가 있으면 동적으로 렌더링
        if (slide.background) {
            if (this.isVideoFile(slide.background)) {
                // 비디오 파일인 경우
                preview.innerHTML = `
                    <video src="${slide.background}" controls class="video-thumbnail" muted>
                        <source src="${slide.background}" type="video/mp4">
                        브라우저가 비디오를 지원하지 않습니다.
                    </video>
                `;
            } else {
                // 이미지 파일인 경우
                preview.innerHTML = `<img src="${slide.background}" alt="Slide ${index + 1}">`;
            }
        }
        
        return slideElement;
    }
    
    // 슬라이드 이미지 업로드 처리
    async handleSlideImageUpload(file, previewElement) {
        if (!file) return;
        
        try {
            this.showLoading();
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 업로드 존을 찾아서 dropzone 값 가져오기
                const uploadZone = previewElement.closest('.slide-item')?.querySelector('.image-upload-zone');
                const dropzone = uploadZone?.dataset.dropzone;
                
                if (dropzone) {
                    // addImageToList 함수를 사용해서 일관성 있게 처리
                    this.addImageToList(dropzone, result.url);
                } else {
                    console.error('dropzone을 찾을 수 없습니다');
                }
                
                this.showToast('이미지 업로드 성공', 'success');
                
                // 업로드 완료 후 input 리셋 (동일 파일 재업로드 가능하도록)
                const input = uploadZone?.querySelector('input[type="file"]');
                if (input) {
                    input.value = '';
                }
            } else {
                this.showToast('이미지 업로드 실패', 'error');
            }
        } catch (error) {
            console.error('업로드 오류:', error);
            this.showToast('업로드 중 오류가 발생했습니다', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // 슬라이드 위로 이동
    moveSlideUp(slideElement) {
        const list = document.getElementById('heroSlidesList');
        const slides = Array.from(list.children);
        const currentIndex = slides.indexOf(slideElement);
        
        if (currentIndex > 0) {
            // DOM에서 위치 변경
            list.insertBefore(slideElement, slides[currentIndex - 1]);
            
            // 모든 슬라이드의 순서 재설정
            this.updateSlideOrders();
        }
    }
    
    // 슬라이드 아래로 이동
    moveSlideDown(slideElement) {
        const list = document.getElementById('heroSlidesList');
        const slides = Array.from(list.children);
        const currentIndex = slides.indexOf(slideElement);
        
        if (currentIndex < slides.length - 1) {
            // DOM에서 위치 변경
            if (currentIndex < slides.length - 2) {
                list.insertBefore(slideElement, slides[currentIndex + 2]);
            } else {
                list.appendChild(slideElement);
            }
            
            // 모든 슬라이드의 순서 재설정
            this.updateSlideOrders();
        }
    }
    
    // 히어로 슬라이드 삭제
    deleteHeroSlide(slideElement) {
        const list = document.getElementById('heroSlidesList');
        const totalSlides = list.children.length;
        
        if (totalSlides <= 1) {
            this.showToast('최소 1개의 히어로 슬라이드는 유지해야 합니다', 'warning');
            return;
        }
        
        slideElement.remove();
        this.updateSlideOrders();
        this.updateHeroSlideButtons();
    }
    
    // 히어로 슬라이드 버튼 상태 업데이트
    updateHeroSlideButtons() {
        const list = document.getElementById('heroSlidesList');
        const addButton = document.getElementById('addHeroSlide');
        // DOM에 실제 렌더링된 슬라이드 수를 기준으로 판단
        const totalSlides = list.children.length;
        
        // 추가 버튼 비활성화 (5개일 때)
        if (totalSlides >= 5) {
            addButton.disabled = true;
            addButton.classList.add('disabled');
            addButton.textContent = '최대 5개 (추가 불가)';
        } else {
            addButton.disabled = false;
            addButton.classList.remove('disabled');
            addButton.textContent = '슬라이드 추가';
        }
        
        // 삭제 버튼 상태 업데이트
        const deleteButtons = list.querySelectorAll('.btn-danger');
        deleteButtons.forEach((button, index) => {
            const canDelete = totalSlides > 1;
            if (canDelete) {
                button.disabled = false;
                button.classList.remove('disabled');
                button.textContent = '삭제';
                button.onclick = () => this.deleteHeroSlide(button.closest('.slide-item'));
            } else {
                button.disabled = true;
                button.classList.add('disabled');
                button.textContent = '삭제 불가';
                button.onclick = () => false;
            }
        });
    }
    
    // 슬라이드 순서 업데이트
    updateSlideOrders() {
        const list = document.getElementById('heroSlidesList');
        const slides = Array.from(list.children);
        
        slides.forEach((slide, index) => {
            const orderInput = slide.querySelector('.order-input');
            const titleElement = slide.querySelector('.item-title');
            
            if (orderInput) {
                orderInput.value = index + 1;
            }
            
            if (titleElement) {
                titleElement.textContent = `슬라이드 ${index + 1}`;
            }
        });
    }

    // 비전 롤링 이미지 렌더링
    renderVisionRollingItems() {
        const list = document.getElementById('visionRollingItemsList');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.content.vision?.rollingImages) {
            this.content.vision.rollingImages.forEach((imageUrl, index) => {
                const itemElement = this.createVisionRollingItem(imageUrl, index);
                list.appendChild(itemElement);
            });
        }
        this.updateVisionRollingButtons();
        
        // 렌더링 완료 후 업로드 존에 이벤트 리스너 설정
        setTimeout(() => {
            this.setupDragAndDropForNewZones();
        }, 0);
    }
    
    // 비전 롤링 이미지 아이템 생성
    createVisionRollingItem(imageUrl, index) {
        const itemElement = document.createElement('div');
        itemElement.className = 'media-item';
        itemElement.innerHTML = `
            <div class="item-header">
                <h4 class="item-title">롤링 이미지 ${index + 1}</h4>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline" onclick="adminCMS.moveVisionRollingUp(this.closest('.media-item'))">↑</button>
                    <button class="btn btn-sm btn-outline" onclick="adminCMS.moveVisionRollingDown(this.closest('.media-item'))">↓</button>
                    <button class="btn btn-sm btn-danger" onclick="this.closest('.media-item').remove()">삭제</button>
                </div>
            </div>
            <div class="form-group">
                <label>이미지</label>
                <div class="image-upload-zone" data-dropzone="vision-rolling-${index}">
                    <div class="upload-placeholder">
                        <p>여기에 파일을 드래그하거나 클릭하여 업로드</p>
                        <p class="file-info">지원 형식: JPG, PNG, GIF, WebP | 최대 10MB</p>
                        <input type="file" accept="image/*" class="file-input-hidden">
                    </div>
                </div>
                <div class="image-preview">
                </div>
            </div>
        `;
        
        // 이미지 업로드 이벤트 설정
        const uploadZone = itemElement.querySelector('.image-upload-zone');
        const input = uploadZone.querySelector('input[type="file"]');
        const preview = itemElement.querySelector('.image-preview');
        
        // 클릭 핸들러는 setupDragAndDropForNewZones()에서 전역으로 처리
        input.addEventListener('change', (e) => {
            this.handleVisionRollingImageUpload(e.target.files[0], preview);
        });
        
        // 기존 이미지가 있으면 동적으로 렌더링
        if (imageUrl) {
            if (this.isVideoFile(imageUrl)) {
                // 비디오 파일인 경우 (삭제 버튼 없음)
                preview.innerHTML = `
                    <video src="${imageUrl}" controls class="video-thumbnail" muted>
                        <source src="${imageUrl}" type="video/mp4">
                        브라우저가 비디오를 지원하지 않습니다.
                    </video>
                `;
            } else {
                // 이미지 파일인 경우 (삭제 버튼 없음)
                preview.innerHTML = `<img src="${imageUrl}" alt="Vision Rolling ${index + 1}">`;
            }
        }
        
        return itemElement;
    }
    
    // 비전 롤링 이미지 업로드 처리
    async handleVisionRollingImageUpload(file, previewElement) {
        if (!file) return;
        
        try {
            this.showLoading();
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 업로드 존을 찾아서 dropzone 값 가져오기
                const uploadZone = previewElement.closest('.media-item')?.querySelector('.image-upload-zone');
                const dropzone = uploadZone?.dataset.dropzone;
                
                if (dropzone) {
                    // addImageToList 함수를 사용해서 일관성 있게 처리
                    this.addImageToList(dropzone, result.url);
                } else {
                    console.error('dropzone을 찾을 수 없습니다');
                }
                
                this.showToast('이미지 업로드 성공', 'success');
                
                // 업로드 완료 후 input 리셋 (동일 파일 재업로드 가능하도록)
                const input = uploadZone?.querySelector('input[type="file"]');
                if (input) {
                    input.value = '';
                }
            } else {
                this.showToast('이미지 업로드 실패', 'error');
            }
        } catch (error) {
            console.error('업로드 오류:', error);
            this.showToast('업로드 중 오류가 발생했습니다', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // 비전 롤링 이미지 위로 이동
    moveVisionRollingUp(itemElement) {
        const list = document.getElementById('visionRollingItemsList');
        const items = Array.from(list.children);
        const currentIndex = items.indexOf(itemElement);
        
        if (currentIndex > 0) {
            list.insertBefore(itemElement, items[currentIndex - 1]);
            this.updateVisionRollingOrders();
        }
    }
    
    // 비전 롤링 이미지 아래로 이동
    moveVisionRollingDown(itemElement) {
        const list = document.getElementById('visionRollingItemsList');
        const items = Array.from(list.children);
        const currentIndex = items.indexOf(itemElement);
        
        if (currentIndex < items.length - 1) {
            if (currentIndex < items.length - 2) {
                list.insertBefore(itemElement, items[currentIndex + 2]);
            } else {
                list.appendChild(itemElement);
            }
            this.updateVisionRollingOrders();
        }
    }
    
    // 비전 롤링 이미지 순서 업데이트
    updateVisionRollingOrders() {
        const list = document.getElementById('visionRollingItemsList');
        const items = Array.from(list.children);
        
        items.forEach((item, index) => {
            const titleElement = item.querySelector('.item-title');
            if (titleElement) {
                titleElement.textContent = `롤링 이미지 ${index + 1}`;
            }
        });
    }

    // 비즈니스 카드 렌더링
    renderBusinessCards() {
        const list = document.getElementById('businessCardsList');
        if (!list || !this.content.business?.cards) return;
        
        list.innerHTML = '';
        this.content.business.cards.forEach((card, index) => {
            const cardElement = this.createBusinessCard(card, index);
            list.appendChild(cardElement);
        });
        this.updateBusinessCardButtons();
        
        // 렌더링 완료 후 업로드 존에 이벤트 리스너 설정
        setTimeout(() => {
            this.setupDragAndDropForNewZones();
        }, 0);
    }
    
    // 비즈니스 카드 생성
    createBusinessCard(card, index) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        
        // 최소 1개 유지를 위한 삭제 버튼 비활성화 체크
        // DOM에 실제 렌더링된 카드 수를 기준으로 판단
        const list = document.getElementById('businessCardsList');
        const totalCards = list.children.length;
        const canDelete = totalCards > 1;
        
        cardElement.innerHTML = `
            <div class="item-header">
                <h4 class="item-title">비즈니스 카드 ${index + 1}</h4>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline" onclick="adminCMS.moveBusinessCardUp(this.closest('.card-item'))">↑</button>
                    <button class="btn btn-sm btn-outline" onclick="adminCMS.moveBusinessCardDown(this.closest('.card-item'))">↓</button>
                    <button class="btn btn-sm btn-danger ${!canDelete ? 'disabled' : ''}" 
                            onclick="${canDelete ? 'adminCMS.deleteBusinessCard(this.closest(\'.card-item\'))' : 'return false'}" 
                            ${!canDelete ? 'disabled' : ''}>${canDelete ? '삭제' : '삭제 불가'}</button>
                </div>
            </div>
            <div class="form-group">
                <label>이미지</label>
                <div class="image-upload-zone" data-dropzone="business-card-${index}">
                    <div class="upload-placeholder">
                        <p>여기에 파일을 드래그하거나 클릭하여 업로드</p>
                        <p class="file-info">지원 형식: JPG, PNG, GIF, WebP, MP4 | 최대 10MB</p>
                        <input type="file" accept="image/*,video/mp4" class="file-input-hidden">
                    </div>
                </div>
                <div class="image-preview">
                    ${card.image ? `<img src="${card.image}" alt="Business Card ${index + 1}">` : ''}
                </div>
            </div>
            <div class="form-group">
                <label>제목</label>
                <input type="text" value="${card.title || ''}" placeholder="카드 제목" onchange="this.dataset.changed='true'">
            </div>
            <div class="form-group">
                <label>설명</label>
                <textarea rows="3" placeholder="카드 설명" onchange="this.dataset.changed='true'">${card.desc || ''}</textarea>
            </div>
            <div class="form-group">
                <label>링크</label>
                <input type="url" value="${card.link || ''}" placeholder="링크 URL" onchange="this.dataset.changed='true'">
            </div>
        `;
        
        // 이미지 업로드 이벤트 설정
        const uploadZone = cardElement.querySelector('.image-upload-zone');
        const input = uploadZone.querySelector('input[type="file"]');
        const preview = cardElement.querySelector('.image-preview');
        
        // 클릭 핸들러는 setupDragAndDropForNewZones()에서 전역으로 처리
        input.addEventListener('change', (e) => {
            this.handleBusinessCardImageUpload(e.target.files[0], preview);
        });
        
        return cardElement;
    }
    
    // 비즈니스 카드 이미지 업로드 처리
    async handleBusinessCardImageUpload(file, previewElement) {
        if (!file) return;
        
        try {
            this.showLoading();
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 업로드 존을 찾아서 dropzone 값 가져오기
                const uploadZone = previewElement.closest('.card-item')?.querySelector('.image-upload-zone');
                const dropzone = uploadZone?.dataset.dropzone;
                
                if (dropzone) {
                    // addImageToList 함수를 사용해서 일관성 있게 처리
                    this.addImageToList(dropzone, result.url);
                } else {
                    console.error('dropzone을 찾을 수 없습니다');
                }
                
                this.showToast('이미지 업로드 성공', 'success');
                
                // 업로드 완료 후 input 리셋 (동일 파일 재업로드 가능하도록)
                const input = uploadZone?.querySelector('input[type="file"]');
                if (input) {
                    input.value = '';
                }
            } else {
                this.showToast('이미지 업로드 실패', 'error');
            }
        } catch (error) {
            console.error('업로드 오류:', error);
            this.showToast('업로드 중 오류가 발생했습니다', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // 비즈니스 카드 위로 이동
    moveBusinessCardUp(cardElement) {
        const list = document.getElementById('businessCardsList');
        const cards = Array.from(list.children);
        const currentIndex = cards.indexOf(cardElement);
        
        if (currentIndex > 0) {
            list.insertBefore(cardElement, cards[currentIndex - 1]);
            this.updateBusinessCardOrders();
        }
    }
    
    // 비즈니스 카드 아래로 이동
    moveBusinessCardDown(cardElement) {
        const list = document.getElementById('businessCardsList');
        const cards = Array.from(list.children);
        const currentIndex = cards.indexOf(cardElement);
        
        if (currentIndex < cards.length - 1) {
            if (currentIndex < cards.length - 2) {
                list.insertBefore(cardElement, cards[currentIndex + 2]);
            } else {
                list.appendChild(cardElement);
            }
            this.updateBusinessCardOrders();
        }
    }
    
    // 비즈니스 카드 삭제
    deleteBusinessCard(cardElement) {
        const list = document.getElementById('businessCardsList');
        const totalCards = list.children.length;
        
        if (totalCards <= 1) {
            this.showToast('최소 1개의 비즈니스 카드는 유지해야 합니다', 'warning');
            return;
        }
        
        cardElement.remove();
        this.updateBusinessCardOrders();
        this.updateBusinessCardButtons();
    }
    
    // 비즈니스 카드 버튼 상태 업데이트
    updateBusinessCardButtons() {
        const list = document.getElementById('businessCardsList');
        const addButton = document.getElementById('addBusinessCard');
        // DOM에 실제 렌더링된 카드 수를 기준으로 판단
        const totalCards = list.children.length;
        
        // 추가 버튼 비활성화 (5개일 때)
        if (totalCards >= 5) {
            addButton.disabled = true;
            addButton.classList.add('disabled');
            addButton.textContent = '최대 5개 (추가 불가)';
        } else {
            addButton.disabled = false;
            addButton.classList.remove('disabled');
            addButton.textContent = '카드 추가';
        }
        
        // 삭제 버튼 상태 업데이트
        const deleteButtons = list.querySelectorAll('.btn-danger');
        deleteButtons.forEach((button, index) => {
            const canDelete = totalCards > 1;
            if (canDelete) {
                button.disabled = false;
                button.classList.remove('disabled');
                button.textContent = '삭제';
                button.onclick = () => this.deleteBusinessCard(button.closest('.card-item'));
            } else {
                button.disabled = true;
                button.classList.add('disabled');
                button.textContent = '삭제 불가';
                button.onclick = () => false;
            }
        });
    }
    
    // 비전 롤링 이미지 버튼 상태 업데이트
    updateVisionRollingButtons() {
        const list = document.getElementById('visionRollingItemsList');
        const addButton = document.getElementById('addVisionRollingItem');
        // DOM에 실제 렌더링된 이미지 수를 기준으로 판단
        const totalImages = list.children.length;
        
        // 추가 버튼 비활성화 (5개일 때)
        if (totalImages >= 5) {
            addButton.disabled = true;
            addButton.classList.add('disabled');
            addButton.textContent = '최대 5개 (추가 불가)';
        } else {
            addButton.disabled = false;
            addButton.classList.remove('disabled');
            addButton.textContent = '이미지 추가';
        }
    }
    
    // 비즈니스 카드 순서 업데이트
    updateBusinessCardOrders() {
        const list = document.getElementById('businessCardsList');
        const cards = Array.from(list.children);
        
        cards.forEach((card, index) => {
            const titleElement = card.querySelector('.item-title');
            if (titleElement) {
                titleElement.textContent = `비즈니스 카드 ${index + 1}`;
            }
        });
    }
    
    // 미디어 아이템 렌더링
    renderMediaItems() {
        const list = document.getElementById('mediaItemsList');
        if (!list || !this.content.media?.items) return;
        
        list.innerHTML = '';
        this.content.media.items.forEach((item, index) => {
            const itemElement = this.createMediaItem(item, index);
            list.appendChild(itemElement);
        });
        
        // 렌더링 완료 후 업로드 존에 이벤트 리스너 설정
        setTimeout(() => {
            this.setupDragAndDropForNewZones();
        }, 0);
    }
    
    // 미디어 아이템 생성 (아코디언 UI)
    createMediaItem(item, index) {
        const itemElement = document.createElement('div');
        itemElement.className = 'accordion-item media-accordion collapsed';
        itemElement.innerHTML = `
            <div class="accordion-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="accordion-title">
                    미디어 아이템 ${index + 1}
                </div>
                <div class="accordion-actions">
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); this.closest('.accordion-item').remove()">삭제</button>
                    <button class="accordion-toggle"></button>
                </div>
            </div>
            <div class="accordion-content">
                <div class="form-group">
                    <label>이미지/비디오</label>
                    <div class="image-upload-zone" data-dropzone="media-item-${index}">
                        <div class="upload-placeholder">
                            <p>여기에 파일을 드래그하거나 클릭하여 업로드</p>
                            <p class="file-info">지원 형식: JPG, PNG, GIF, WebP, MP4 | 최대 10MB</p>
                            <input type="file" accept="image/*,video/mp4" class="file-input-hidden">
                        </div>
                    </div>
                    <div class="image-preview">
                    </div>
                </div>
                <div class="form-group">
                    <label>카테고리</label>
                    <input type="text" value="${item.category || ''}" placeholder="카테고리" onchange="this.dataset.changed='true'">
                </div>
                <div class="form-group">
                    <label>제목</label>
                    <input type="text" value="${item.title || ''}" placeholder="제목" onchange="this.dataset.changed='true'">
                </div>
                <div class="form-group">
                    <label>날짜</label>
                    <input type="text" value="${item.date || ''}" placeholder="2025.01.01" onchange="this.dataset.changed='true'">
                </div>
                <div class="form-group">
                    <label>순서</label>
                    <input type="number" value="${item.order || index}" placeholder="순서" onchange="this.dataset.changed='true'">
                </div>
            </div>
        `;
        
        // 이미지 업로드 이벤트 설정
        const uploadZone = itemElement.querySelector('.image-upload-zone');
        const input = uploadZone.querySelector('input[type="file"]');
        const preview = itemElement.querySelector('.image-preview');
        
        // 클릭 핸들러는 setupDragAndDropForNewZones()에서 전역으로 처리
        input.addEventListener('change', (e) => {
            this.handleMediaItemImageUpload(e.target.files[0], preview);
        });
        
        // 기존 이미지가 있으면 동적으로 렌더링
        if (item.image) {
            if (this.isVideoFile(item.image)) {
                // 비디오 파일인 경우
                preview.innerHTML = `
                    <video src="${item.image}" controls class="video-thumbnail" muted>
                        <source src="${item.image}" type="video/mp4">
                        브라우저가 비디오를 지원하지 않습니다.
                    </video>
                `;
            } else {
                // 이미지 파일인 경우
                preview.innerHTML = `<img src="${item.image}" alt="Media Item ${index + 1}">`;
            }
        }
        
        return itemElement;
    }
    
    // 미디어 아이템 이미지 업로드 처리
    async handleMediaItemImageUpload(file, previewElement) {
        if (!file) return;
        
        try {
            this.showLoading();
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 업로드 존을 찾아서 dropzone 값 가져오기
                const uploadZone = previewElement.closest('.accordion-item')?.querySelector('.image-upload-zone');
                const dropzone = uploadZone?.dataset.dropzone;
                
                if (dropzone) {
                    // addImageToList 함수를 사용해서 일관성 있게 처리
                    this.addImageToList(dropzone, result.url);
                } else {
                    console.error('dropzone을 찾을 수 없습니다');
                }
                
                this.showToast('이미지 업로드 성공', 'success');
                
                // 업로드 완료 후 input 리셋 (동일 파일 재업로드 가능하도록)
                const input = uploadZone?.querySelector('input[type="file"]');
                if (input) {
                    input.value = '';
                }
            } else {
                this.showToast('이미지 업로드 실패', 'error');
            }
        } catch (error) {
            console.error('업로드 오류:', error);
            this.showToast('업로드 중 오류가 발생했습니다', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // 채용 공고 렌더링
    renderCareerPosts() {
        const list = document.getElementById('careerPostsList');
        if (!list || !this.content.career?.posts) return;
        
        list.innerHTML = '';
        
        // 필터링된 공고만 렌더링
        const filteredPosts = this.getFilteredCareerPosts();
        filteredPosts.forEach((post, index) => {
            const postElement = this.createCareerPost(post, index);
            list.appendChild(postElement);
        });
        
        // 필터 상태 업데이트
        this.updateFilterStatus();
    }
    
    // 채용 공고 생성 (아코디언 UI)
    createCareerPost(post, index) {
        const postElement = document.createElement('div');
        postElement.className = 'accordion-item career-accordion collapsed';
        postElement.innerHTML = `
            <div class="accordion-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="accordion-title">
                    채용 공고 ${index + 1}
                </div>
                <div class="accordion-actions">
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); this.closest('.accordion-item').remove()">삭제</button>
                    <button class="accordion-toggle"></button>
                </div>
            </div>
            <div class="accordion-content">
                <div class="form-group">
                    <label>제목</label>
                    <input type="text" value="${post.title || ''}" placeholder="채용 공고 제목" onchange="this.dataset.changed='true'">
                </div>
                <div class="form-group">
                    <label>카테고리</label>
                    <select onchange="this.dataset.changed='true'">
                        <option value="">카테고리 선택</option>
                        ${(this.content.career?.categories || []).map(cat => 
                            `<option value="${cat}" ${post.category === cat ? 'selected' : ''}>${cat}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>본문 (HTML 허용)</label>
                    <div class="rich-editor" contenteditable="true" onchange="this.dataset.changed='true'">${post.bodyHtml || ''}</div>
                </div>
                <div class="form-group">
                    <label>시작일</label>
                    <input type="date" value="${post.period?.start || ''}" onchange="this.dataset.changed='true'">
                </div>
                <div class="form-group">
                    <label>종료일</label>
                    <input type="date" value="${post.period?.end || ''}" onchange="this.dataset.changed='true'">
                    <small class="form-help">종료일을 비워두면 상시채용으로 설정됩니다</small>
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" ${post.status === 'closed' ? 'checked' : ''} onchange="this.dataset.changed='true'">
                        채용 마감 처리
                    </label>
                    <small class="form-help">체크하면 종료일과 관계없이 채용 마감으로 표시됩니다</small>
                </div>
            </div>
        `;
        return postElement;
    }
    
    // 동적 아이템 추가 설정
    setupDynamicItems() {
        // 히어로 슬라이드 추가
        document.getElementById('addHeroSlide').addEventListener('click', () => {
            const list = document.getElementById('heroSlidesList');
            if (list.children.length >= 5) {
                this.showToast('최대 5개의 슬라이드만 추가할 수 있습니다', 'warning');
                return;
            }
            const newSlide = this.createHeroSlide({
                id: `hero-${Date.now()}`,
                title: '',
                subtitle: '',
                background: '',
                active: true,
                order: list.children.length + 1
            }, list.children.length);
            list.appendChild(newSlide);
            this.updateHeroSlideButtons();
            // 새로 추가된 업로드 존에 이벤트 리스너 설정
            setTimeout(() => {
                this.setupDragAndDropForNewZones();
            }, 50);
        });
        
        // 비즈니스 카드 추가
        document.getElementById('addBusinessCard').addEventListener('click', () => {
            const list = document.getElementById('businessCardsList');
            if (list.children.length >= 5) {
                this.showToast('최대 5개의 비즈니스 카드만 추가할 수 있습니다', 'warning');
                return;
            }
            const newCard = this.createBusinessCard({}, list.children.length);
            list.appendChild(newCard);
            this.updateBusinessCardButtons();
            // 새로 추가된 업로드 존에 이벤트 리스너 설정
            setTimeout(() => {
                this.setupDragAndDropForNewZones();
            }, 50);
        });
        
        // 비전 롤링 이미지 추가
        document.getElementById('addVisionRollingItem').addEventListener('click', () => {
            const list = document.getElementById('visionRollingItemsList');
            if (list.children.length >= 5) {
                this.showToast('최대 5개의 롤링 이미지만 추가할 수 있습니다', 'warning');
                return;
            }
            const newItem = this.createVisionRollingItem('', list.children.length);
            list.appendChild(newItem);
            this.updateVisionRollingButtons();
            // 새로 추가된 업로드 존에 이벤트 리스너 설정
            setTimeout(() => {
                this.setupDragAndDropForNewZones();
            }, 50);
        });
        
        // 미디어 아이템 추가
        document.getElementById('addMediaItem').addEventListener('click', () => {
            const list = document.getElementById('mediaItemsList');
            const newItem = this.createMediaItem({}, list.children.length);
            list.appendChild(newItem);
            // 새로 추가된 업로드 존에 이벤트 리스너 설정
            setTimeout(() => {
                this.setupDragAndDropForNewZones();
            }, 50);
        });
        
        // 채용 공고 추가
        document.getElementById('addCareerPost').addEventListener('click', () => {
            const list = document.getElementById('careerPostsList');
            const newPost = this.createCareerPost({}, list.children.length);
            list.appendChild(newPost);
        });
    }
    
    // 콘텐츠 저장
    async saveContent() {
        try {
            this.showLoading();
            
            // 폼 데이터 수집
            const updatedContent = this.collectFormData();
            
            // 서버에 저장
            const response = await fetch('/api/save-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                },
                body: JSON.stringify(updatedContent)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.content = updatedContent;
                this.updateLastSavedTime();
                this.showToast('저장되었습니다', 'success');
            } else {
                this.showToast('저장에 실패했습니다', 'error');
            }
        } catch (error) {
            console.error('저장 오류:', error);
            this.showToast('저장 중 오류가 발생했습니다', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // 폼 데이터 수집
    collectFormData() {
        const content = JSON.parse(JSON.stringify(this.content)); // 깊은 복사
        
        // Hero 섹션
        content.hero = {
            slides: this.getHeroSlides()
        };
        
        // Vision 섹션
        content.vision = {
            title: document.getElementById('visionTitle').value,
            subtitle: document.getElementById('visionSubtitle').value,
            rollingImages: this.getVisionRollingImages(),
            backgroundImage: this.getImagePreview('visionEarthPreview')
        };
        
        // Business 섹션
        content.business = {
            subtitleHtml: document.getElementById('businessSubtitle').value,
            moreButtonText: document.getElementById('businessMoreButton').value,
            cards: this.getBusinessCards()
        };
        
        // Media 섹션
        content.media = {
            active: document.getElementById('mediaSectionActive').checked,
            richTextIntroHtml: document.getElementById('mediaIntro').innerHTML,
            items: this.getMediaItems()
        };
        
        // Career 섹션
        content.career = {
            active: document.getElementById('careerSectionActive').checked,
            categories: document.getElementById('careerCategories').value.split(',').map(s => s.trim()).filter(s => s),
            posts: this.getCareerPosts()
        };
        
        // Footer 섹션
        content.footer = {
            title: document.getElementById('footerTitle').value,
            subtitle: document.getElementById('footerSubtitle').value,
            buttonText: document.getElementById('footerButtonText').value,
            logo: this.getImagePreview('footerLogoPreview'),
            sns: {
                instagram: document.getElementById('instagramLink').value,
                linkedin: document.getElementById('linkedinLink').value,
                youtube: document.getElementById('youtubeLink').value,
                blog: document.getElementById('blogLink').value
            }
        };
        
        // SEO 섹션
        content.seo = {
            title: document.getElementById('seoTitle').value,
            description: document.getElementById('seoDescription').value,
            keywords: document.getElementById('seoKeywords').value.split(',').map(s => s.trim()).filter(s => s),
            ogImage: this.getImagePreview('ogImagePreview')
        };
        
        // 메타데이터 업데이트
        content.meta = {
            ...content.meta,
            lastModified: new Date().toISOString(),
            modifiedBy: 'admin'
        };
        
        return content;
    }
    
    // 히어로 슬라이드 데이터 가져오기
    getHeroSlides() {
        const slides = [];
        document.querySelectorAll('#heroSlidesList .slide-item').forEach((slide, index) => {
            const checkbox = slide.querySelector('input[type="checkbox"]');
            const orderInput = slide.querySelector('.order-input');
            const mediaPreview = slide.querySelector('.image-preview img, .image-preview video');
            
            // 각 슬라이드의 입력 필드들을 정확하게 선택
            const formGroups = slide.querySelectorAll('.form-group');
            let titleInput = null;
            let subtitleInput = null;
            
            // 순서대로 입력 필드 찾기
            formGroups.forEach((group, groupIndex) => {
                const input = group.querySelector('input[type="text"]');
                const textarea = group.querySelector('textarea');
                
                if (input && !input.classList.contains('order-input')) {
                    // 첫 번째 텍스트 입력은 타이틀
                    if (!titleInput) {
                        titleInput = input;
                    }
                }
                
                if (textarea) {
                    // 첫 번째 텍스트 영역은 서브타이틀
                    if (!subtitleInput) {
                        subtitleInput = textarea;
                    }
                }
            });
            
            const slideData = {
                id: `hero-${index + 1}`,
                title: titleInput?.value || '',
                subtitle: subtitleInput?.value || '',
                background: mediaPreview ? mediaPreview.src : '',
                active: checkbox ? checkbox.checked : true,
                order: orderInput ? parseInt(orderInput.value) || (index + 1) : (index + 1)
            };
            
            console.log(`히어로 슬라이드 ${index + 1} 데이터:`, slideData);
            slides.push(slideData);
        });
        return slides;
    }
    
    // 비전 롤링 이미지 데이터 가져오기
    getVisionRollingImages() {
        const images = [];
        document.querySelectorAll('#visionRollingItemsList .media-item').forEach((item) => {
            const mediaPreview = item.querySelector('.image-preview img, .image-preview video');
            if (mediaPreview && mediaPreview.src) {
                images.push(mediaPreview.src);
            }
        });
        return images;
    }
    
    // 이미지 리스트 가져오기
    getImageList(listId) {
        const list = document.getElementById(listId);
        if (!list) return [];
        
        return Array.from(list.querySelectorAll('.image-item img, .image-item video')).map(media => media.src);
    }
    
    // 이미지 미리보기 가져오기 (이미지와 비디오 모두 지원)
    getImagePreview(previewId) {
        const preview = document.getElementById(previewId);
        if (!preview) return '';
        
        const img = preview.querySelector('img');
        const video = preview.querySelector('video');
        
        // 이미지가 있으면 이미지 src 반환, 없으면 비디오 src 반환
        return img ? img.src : (video ? video.src : '');
    }
    
    // 비즈니스 카드 데이터 가져오기
    getBusinessCards() {
        const cards = [];
        document.querySelectorAll('#businessCardsList .card-item').forEach((card, index) => {
            const imagePreview = card.querySelector('.image-preview img');
            const descTextarea = card.querySelector('textarea');
            const linkInput = card.querySelector('input[type="url"]');
            
            // 제목 입력 필드를 정확하게 찾기
            const formGroups = card.querySelectorAll('.form-group');
            let titleInput = null;
            
            formGroups.forEach((group) => {
                const input = group.querySelector('input[type="text"]');
                const label = group.querySelector('label');
                
                // 라벨이 "제목"인 입력 필드 찾기
                if (input && label && label.textContent.includes('제목')) {
                    titleInput = input;
                }
            });
            
            const cardData = {
                image: imagePreview ? imagePreview.src : '',
                title: titleInput ? titleInput.value : '',
                desc: descTextarea ? descTextarea.value : '',
                link: linkInput ? linkInput.value : ''
            };
            
            console.log(`비즈니스 카드 ${index + 1} 데이터:`, cardData);
            cards.push(cardData);
        });
        return cards;
    }
    
    // 미디어 아이템 데이터 가져오기
    getMediaItems() {
        const items = [];
        document.querySelectorAll('#mediaItemsList .accordion-item').forEach((item, index) => {
            const formGroups = item.querySelectorAll('.form-group');
            let activeInput = null;
            let categoryInput = null;
            let titleInput = null;
            let dateInput = null;
            let orderInput = null;
            
            // 이미지 미리보기에서 URL 가져오기
            const imagePreview = item.querySelector('.image-preview img, .image-preview video');
            const imageUrl = imagePreview ? imagePreview.src : '';
            
            // 각 입력 필드를 라벨로 정확하게 찾기
            formGroups.forEach((group) => {
                const input = group.querySelector('input');
                const label = group.querySelector('label');
                
                if (input && label) {
                    const labelText = label.textContent;
                    if (labelText.includes('활성화')) {
                        activeInput = input;
                    } else if (labelText.includes('카테고리')) {
                        categoryInput = input;
                    } else if (labelText.includes('제목')) {
                        titleInput = input;
                    } else if (labelText.includes('날짜')) {
                        dateInput = input;
                    } else if (labelText.includes('순서')) {
                        orderInput = input;
                    }
                }
            });
            
            items.push({
                id: `media-${index + 1}`,
                image: imageUrl,
                category: categoryInput?.value || '',
                title: titleInput?.value || '',
                date: dateInput?.value || '',
                order: orderInput ? parseInt(orderInput.value) || index : index
            });
        });
        return items;
    }
    
    // 채용 공고 데이터 가져오기
    getCareerPosts() {
        const posts = [];
        document.querySelectorAll('#careerPostsList .accordion-item').forEach((post, index) => {
            const editor = post.querySelector('.rich-editor');
            
            const formGroups = post.querySelectorAll('.form-group');
            let activeInput = null;
            let titleInput = null;
            let categorySelect = null;
            let startDateInput = null;
            let endDateInput = null;
            let statusCheckbox = null;
            
            // 각 입력 필드를 라벨로 정확하게 찾기
            formGroups.forEach((group) => {
                const input = group.querySelector('input');
                const select = group.querySelector('select');
                const label = group.querySelector('label');
                
                if (label) {
                    const labelText = label.textContent;
                    if (labelText.includes('활성화') && input) {
                        activeInput = input;
                    } else if (labelText.includes('제목') && input) {
                        titleInput = input;
                    } else if (labelText.includes('카테고리') && select) {
                        categorySelect = select;
                    } else if (labelText.includes('시작일') && input) {
                        startDateInput = input;
                    } else if (labelText.includes('종료일') && input) {
                        endDateInput = input;
                    } else if (labelText.includes('채용 마감 처리') && input) {
                        statusCheckbox = input;
                    }
                }
            });
            
            posts.push({
                id: `career-${index + 1}`,
                title: titleInput?.value || '',
                category: categorySelect?.value || '',
                bodyHtml: editor?.innerHTML || '',
                period: {
                    start: startDateInput?.value || '',
                    end: endDateInput?.value || ''
                },
                status: statusCheckbox?.checked ? 'closed' : 'active'
            });
        });
        return posts;
    }
    
    // 채용 공고 필터링 설정
    setupCareerFiltering() {
        // 필터 버튼 이벤트 리스너
        document.getElementById('showAllPosts')?.addEventListener('click', () => {
            this.setCareerFilter('all');
        });
        
        document.getElementById('showActivePosts')?.addEventListener('click', () => {
            this.setCareerFilter('active');
        });
        
        document.getElementById('showClosedPosts')?.addEventListener('click', () => {
            this.setCareerFilter('closed');
        });
    }
    
    // 채용 공고 필터 설정
    setCareerFilter(filter) {
        this.careerFilter = filter;
        
        // 버튼 활성화 상태 업데이트
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
        
        // 공고 목록 다시 렌더링
        this.renderCareerPosts();
    }
    
    // 필터링된 채용 공고 가져오기
    getFilteredCareerPosts() {
        if (!this.content.career?.posts) return [];
        
        return this.content.career.posts.filter(post => {
            if (this.careerFilter === 'all') return true;
            
            const isActive = this.isCareerPostActive(post);
            
            if (this.careerFilter === 'active') {
                return isActive;
            } else if (this.careerFilter === 'closed') {
                return !isActive;
            }
            
            return true;
        });
    }
    
    // 채용 공고가 활성 상태인지 확인
    isCareerPostActive(post) {
        // 수동으로 마감 처리된 경우
        if (post.status === 'closed') {
            return false;
        }
        
        // 종료일이 없는 경우 (상시채용)
        if (!post.period?.end) {
            return true;
        }
        
        // 종료일이 현재 날짜보다 이후인 경우
        const endDate = new Date(post.period.end);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정
        
        return endDate >= today;
    }
    
    // 필터 상태 업데이트
    updateFilterStatus() {
        const statusElement = document.getElementById('filterStatus');
        if (!statusElement) return;
        
        const totalPosts = this.content.career?.posts?.length || 0;
        const filteredPosts = this.getFilteredCareerPosts().length;
        
        let statusText = '';
        switch (this.careerFilter) {
            case 'all':
                statusText = `전체 ${totalPosts}개 공고를 표시 중입니다`;
                break;
            case 'active':
                statusText = `채용중 ${filteredPosts}개 공고를 표시 중입니다`;
                break;
            case 'closed':
                statusText = `채용마감 ${filteredPosts}개 공고를 표시 중입니다`;
                break;
        }
        
        statusElement.textContent = statusText;
    }
    
    // 미리보기
    previewContent() {
        // 먼저 UI에서 콘텐츠 데이터 업데이트
        this.updateContentDataFromUI();
        
        // 폼 데이터 수집
        const updatedContent = this.collectFormData();
        
        // 새 창에서 미리보기
        const previewWindow = window.open('../index.html', '_blank');
        
        // 콘텐츠를 새 창에 전달 (postMessage 사용)
        previewWindow.addEventListener('load', () => {
            // 약간의 지연을 두어 페이지가 완전히 로드된 후 메시지 전송
            setTimeout(() => {
                previewWindow.postMessage({
                    type: 'PREVIEW_CONTENT',
                    content: updatedContent
                }, '*');
            }, 1000); // 지연 시간을 늘려서 이미지 로딩 시간 확보
        });
        
        this.showToast('미리보기 창이 열렸습니다', 'success');
    }
    
    // 로딩 표시
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }
    
    // 로딩 숨김
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
    
    // 토스트 알림
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // 시간 표시 시작
    startTimeDisplay() {
        this.updateCurrentTime();
        this.updateLastSavedTime();
        
        // 1분마다 현재 시간 업데이트
        setInterval(() => {
            this.updateCurrentTime();
        }, 60000);
    }
    
    // 현재 시간 업데이트
    updateCurrentTime() {
        const currentTimeElement = document.getElementById('currentTime');
        if (currentTimeElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            currentTimeElement.textContent = `현재: ${timeString}`;
        }
    }
    
    // 마지막 저장 시간 업데이트
    updateLastSavedTime() {
        const lastSavedElement = document.getElementById('lastSaved');
        if (lastSavedElement && this.content?.meta?.lastModified) {
            const lastModified = new Date(this.content.meta.lastModified);
            const timeString = lastModified.toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            lastSavedElement.textContent = `저장: ${timeString}`;
        } else if (lastSavedElement) {
            lastSavedElement.textContent = '저장: 없음';
        }
    }
    
    // UI에서 콘텐츠 데이터 업데이트 (이미지 업로드 후 자동 호출)
    updateContentDataFromUI() {
        if (!this.content) return;
        
        try {
            // Hero 섹션 업데이트
            if (this.content.hero?.slides) {
                const heroSlides = this.getHeroSlides();
                this.content.hero.slides = heroSlides;
            }
            
            // Vision 섹션 업데이트
            if (this.content.vision) {
                this.content.vision.rollingImages = this.getVisionRollingImages();
                
                // Earth 배경 이미지 업데이트
                const earthPreview = this.getImagePreview('visionEarthPreview');
                if (earthPreview) {
                    this.content.vision.backgroundImage = earthPreview;
                }
            }
            
            // Business 섹션 업데이트
            if (this.content.business) {
                this.content.business.cards = this.getBusinessCards();
            }
            
            // Footer 섹션 업데이트
            if (this.content.footer) {
                const logoPreview = this.getImagePreview('footerLogoPreview');
                if (logoPreview) {
                    this.content.footer.logo = logoPreview;
                }
            }
            
            // SEO 섹션 업데이트
            if (this.content.seo) {
                const ogImagePreview = this.getImagePreview('ogImagePreview');
                if (ogImagePreview) {
                    this.content.seo.ogImage = ogImagePreview;
                }
            }
            
            console.log('콘텐츠 데이터가 UI에서 업데이트되었습니다:', this.content);
        } catch (error) {
            console.error('콘텐츠 데이터 업데이트 오류:', error);
        }
    }
}

// 페이지 로드 시 관리자 CMS 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.adminCMS = new AdminCMS();
});

// 미리보기 메시지 수신 (메인 페이지에서)
window.addEventListener('message', (event) => {
    if (event.data.type === 'PREVIEW_CONTENT') {
        // 전역 변수에 미리보기 콘텐츠 저장
        window.previewContent = event.data.content;
        
        // 콘텐츠 적용
        if (typeof applyContent === 'function') {
            applyContent(event.data.content);
        }
    }
});
