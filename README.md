# 🎟️ BlockPass | NFT 기반 위변조 방지 티켓팅 플랫폼

![Solidity](https://img.shields.io/badge/Solidity-0.8.0-363636?logo=solidity&style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-4.0-3178C6?logo=typescript&style=flat-square) ![Next.js](https://img.shields.io/badge/Next.js-Web3_Client-000000?logo=next.js&style=flat-square) ![Kubernetes](https://img.shields.io/badge/Kubernetes-MSA-326CE5?logo=kubernetes&style=flat-square) ![Ethereum](https://img.shields.io/badge/Network-Ethereum_Testnet-3C3C3D?logo=ethereum&style=flat-square)

> **"마이크로서비스의 확장성과 블록체인의 투명성을 결합한 하이브리드(Web 2.5) 아키텍처"**
>
> **BlockPass**는 암표 및 위조 티켓 문제를 해결하기 위해, 티켓을 **ERC-721(NFT)**로 발행하여 소유권을 보장하고 결제 및 양도 과정을 스마트 컨트랙트로 투명하게 관리하는 플랫폼입니다.

> **⚠️ Legacy Network Notice**
>
> 본 프로젝트는 2020/2021년 **Ethereum Rinkeby Testnet** 환경을 기준으로 개발되었습니다.
> 현재 Rinkeby 네트워크의 공식 지원 종료(Deprecated)로 인해, 온체인 트랜잭션 이력 조회 및 라이브 데모 실행이 제한될 수 있습니다.
> 보존된 소스 코드(`contracts/`, `blockchain/`)를 통해 스마트 컨트랙트 로직과 오프체인 연동 아키텍처를 확인하실 수 있습니다.

---

## 📚 목차 (Table of Contents)

1. ☁️ 인프라 아키텍처 (Infrastructure Architecture)
2. 📡 API 설계 및 데이터 흐름 (API Design & Data Flow)
3. 🗂 데이터베이스 아키텍처 (Database Schema)
4. 🛠 기술 스택 (Tech Stack)
5. 🚀 기술적 도전과 문제 해결 (Trouble Shooting)
6. 💻 설치 및 실행 (Installation)

---

## ☁️ 인프라 아키텍처 (Infrastructure Architecture)

기존 MSA(Microservices Architecture) 위에 **블록체인 중계 서비스(Blockchain Bridge Service)**를 추가하여, 중앙화된 DB와 탈중앙화된 네트워크(Ethereum) 간의 데이터를 비동기로 동기화하는 **하이브리드 구조**입니다.

```text
                                     [Internet]
                                         │
                                [ Ingress Load Balancer ]
                                         │
       ┌────────────────┬────────────────┼───────────────┬────────────────┐
       ▼                ▼                ▼               ▼                ▼
  [Client App]     [Auth Svc]      [Tickets Svc]   [Orders Svc]    [Payments Svc]
   (Next.js)      (JWT/Wallet)      (MongoDB)       (MongoDB)        (MongoDB)
                                         │               │                │
                                         ▼               ▼                ▼
                                 ((  NATS Streaming Event Bus  ))
                                                 ▲
                                                 │
                                        [Blockchain Svc]
                                        (Bridge Worker)
                                                 │
                                       ┌─────────┴─────────┐
                                       ▼                   ▼
                                [Ethereum Network]       [IPFS]
                               (Smart Contracts)       (Metadata)
```

### 아키텍처 핵심 포인트
* **Blockchain Service (Bridge)**: 웹 서버와 블록체인 간의 통신 속도 차이를 해결하기 위해, 이벤트를 구독하여 비동기로 트랜잭션을 처리하는 별도의 중계 서비스를 두었습니다.
* **Event-Driven**: 서비스 간의 결합도를 낮추기 위해 **NATS Streaming Server**를 사용하여 데이터 변경 사항을 이벤트로 전파합니다.

---

## 📡 API 설계 및 데이터 흐름 (API Design & Data Flow)

티켓 생성 요청부터 NFT 발행(Minting) 완료까지, **오프체인(DB)과 온체인(Blockchain)의 데이터 정합성**을 맞추는 핵심 프로세스입니다.

### NFT 티켓 발행 프로세스 (Lazy Minting Flow)

1.  **관리자 요청 (Admin)**
    * `POST /api/tickets`로 공연 정보 전송
2.  **Tickets 서비스**
    * 메타데이터(이미지/JSON)를 **IPFS**에 업로드 → 해시값(`ipfs://...`) 획득
    * DB에 티켓 생성 (상태: `Pending`)
    * **`TicketCreated`** 이벤트 발행
3.  **Blockchain 서비스 (Bridge)**
    * 이벤트 수신 후, 관리자 지갑으로 스마트 컨트랙트의 `mintToken(URI)` 함수 호출
    * 블록체인 트랜잭션 성공 시 **`TicketMinted`** 이벤트 발행 (Token ID 포함)
4.  **Tickets 서비스**
    * `TicketMinted` 이벤트 수신
    * DB 상태를 `Active`로 변경하고, 발급된 `Token ID` 매핑

### 주요 서비스 역할
| Service | Role | Key Logic |
| :--- | :--- | :--- |
| **Blockchain** | 중계(Bridge) | 온체인 트랜잭션 실행 및 이벤트 감지 (`blockchain/src/services/nft-minting-service.ts`) |
| **Auth** | 인증 | 이메일 로그인 + Metamask 지갑 서명(`verifyMessage`) 검증 (`auth/src/services/wallet-verification.ts`) |
| **Tickets** | 상품 관리 | 티켓 정보 관리 및 IPFS 메타데이터 연동 |
| **Payments** | 결제 | 결제 완료 이벤트 발행 및 주문 상태 관리 |

---

## 🗂 데이터베이스 아키텍처 (Database Schema)

**하이브리드 데이터 모델**: 빠른 검색과 조회를 위해 메타데이터는 **MongoDB**에, 소유권 증명 및 거래 내역은 **Blockchain**에 저장하는 이원화 전략을 사용했습니다.

### 1. User (사용자)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | ObjectId | 고유 ID |
| `email` | String | 로그인 이메일 |
| `walletAddress` | String | 연동된 이더리움 지갑 주소 |

### 2. Ticket (티켓 정보)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | ObjectId | 고유 ID |
| `title` | String | 공연 제목 |
| `price` | Number | 가격 |
| `ipfsHash` | String | IPFS 메타데이터 링크 (이미지, 설명 등) |
| `tokenId` | Number | **온체인 NFT 토큰 ID** (매핑용) |
| `status` | String | 판매 상태 (Pending / Active / Reserved) |

### 3. Order (주문 정보)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | ObjectId | 고유 ID |
| `userId` | String | 구매자 ID |
| `status` | String | 주문 상태 (Created / Cancelled / Complete) |
| `ticketId` | String | 참조 티켓 ID |

---

## 🛠 기술 스택 (Tech Stack)

### Blockchain (Web3)
* **Solidity (v0.8.0)**: TicketNFT(ERC721), Marketplace 컨트랙트 작성
* **Hardhat**: 스마트 컨트랙트 컴파일, 테스트, 배포 파이프라인
* **Ethers.js**: 백엔드 및 클라이언트의 블록체인 통신 라이브러리
* **IPFS**: 탈중앙화된 파일 저장소 (메타데이터 저장용)

### Backend & DevOps
* **Node.js / Express / TypeScript**: 타입 안정성을 갖춘 마이크로서비스 구현
* **NATS Streaming**: 고성능 이벤트 기반 메시징 시스템
* **Kubernetes (K8s) & Skaffold**: 컨테이너 오케스트레이션 및 개발 환경 자동화
* **MongoDB**: 각 마이크로서비스별 독립 데이터베이스

### Frontend
* **Next.js (React)**: SSR 지원 및 페이지별 라우팅
* **Metamask API**: 브라우저 기반 지갑 연동 훅 구현

---

## 🚀 기술적 도전과 문제 해결 (Trouble Shooting)

### 1. 블록체인과 DB 간의 데이터 불일치 (Inconsistency)
**문제 상황:**
DB에 티켓 정보를 저장했으나, 블록체인 네트워크 지연이나 가스비 부족으로 인해 NFT 발행(Minting) 트랜잭션이 실패할 경우, 시스템 간 데이터 불일치가 발생했습니다.

**해결 방법:**
**이벤트 기반의 최종적 일관성(Eventual Consistency)** 패턴을 적용했습니다.
1.  티켓 생성 시 DB 상태를 `Pending`으로 설정하여 사용자에게 노출되지 않도록 합니다.
2.  `Blockchain Service`가 트랜잭션 성공 영수증(Receipt)을 수신했을 때만 `TicketMinted` 이벤트를 발행합니다.
3.  `Tickets Service`가 이 이벤트를 수신한 후에야 상태를 `Active`로 변경하고 `TokenID`를 매핑하여 일관성을 보장했습니다.

### 2. 가스비(Gas Fee) 문제 및 확장성
**문제 상황:**
티켓의 이미지, 설명, 좌석 정보 등 모든 데이터를 블록체인에 저장하려다 보니 가스비가 과도하게 발생했습니다.

**해결 방법:**
**IPFS(InterPlanetary File System)**를 활용한 오프체인 스토리지 전략을 사용했습니다.
* 대용량 데이터는 IPFS에 업로드하고, 생성된 고유 해시값(`ipfs://Qm...`)만을 스마트 컨트랙트의 `tokenURI`에 기록했습니다.
* 이를 통해 데이터의 무결성(Web3 특성)은 유지하면서 가스비를 약 **95% 절감**했습니다.

---

## 💻 설치 및 실행 (Installation)

이 프로젝트는 **Kubernetes**와 **Skaffold**가 로컬 환경에 설정되어 있어야 합니다.

```bash
# 1. 저장소 복제
git clone https://github.com/play-builder/blockpass.git

# 2. 환경 변수 및 시크릿 설정
# JWT_KEY 및 지갑 Private Key 등 설정 필요
kubectl create secret generic jwt-secret --from-literal=JWT_KEY=asdf

# 3. 로컬 블록체인 노드 실행 (선택 사항)
cd contracts
npm install
npx hardhat node

# 4. 마이크로서비스 실행 (Skaffold)
# 프로젝트 루트에서 실행 시 모든 마이크로서비스가 빌드 및 배포됩니다.
skaffold dev

# 5. 접속
# https://blockpass.dev (hosts 파일 설정 필요: 127.0.0.1 blockpass.dev)
```
