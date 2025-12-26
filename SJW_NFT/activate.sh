#!/bin/bash

# SJW_NFT 폴더용 Figma MCP 플러그인 활성화 스크립트

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 프로젝트 루트 경로
PROJECT_ROOT="/Users/han-ilkim/Downloads/cursor-talk-to-figma-mcp-main"

echo -e "${GREEN}=== Figma MCP 플러그인 활성화 스크립트 ===${NC}\n"

# 1. Bun 설치 확인
echo -e "${YELLOW}[1/4] Bun 설치 확인 중...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Bun이 설치되어 있지 않습니다.${NC}"
    echo "설치 명령: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "${GREEN}✓ Bun 설치 확인됨: $(bun --version)${NC}\n"

# 2. 프로젝트 루트로 이동
echo -e "${YELLOW}[2/4] 프로젝트 디렉토리 확인 중...${NC}"
if [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}프로젝트 루트 디렉토리를 찾을 수 없습니다: $PROJECT_ROOT${NC}"
    exit 1
fi
cd "$PROJECT_ROOT"
echo -e "${GREEN}✓ 프로젝트 디렉토리 확인됨${NC}\n"

# 3. 의존성 설치 확인
echo -e "${YELLOW}[3/4] 의존성 확인 중...${NC}"
if [ ! -d "node_modules" ]; then
    echo "의존성 설치 중..."
    bun install
    if [ $? -ne 0 ]; then
        echo -e "${RED}의존성 설치 실패${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 의존성 확인됨${NC}\n"

# 4. WebSocket 서버 실행
echo -e "${YELLOW}[4/4] WebSocket 서버 시작 중...${NC}"
echo -e "${GREEN}WebSocket 서버가 포트 3055에서 실행됩니다.${NC}"
echo -e "${YELLOW}서버를 중지하려면 Ctrl+C를 누르세요.${NC}\n"
echo -e "${GREEN}다음 단계:${NC}"
echo "1. Figma를 열고 플러그인을 실행하세요"
echo "2. Cursor에서 MCP 명령을 사용하세요"
echo ""

# WebSocket 서버 실행
bun socket

