# SceneTalk
## AI-Powered Interactive K-Content Experience
### 최종 서비스 기획서 v2.0 — 확정본

**Google DeepMind AI Hackathon 2026**  
**Track 1 — Gemini 4 Argon in Entertainment**  
**기획 확정일: 2026.10.16**

> ### Watch it. Enter it. Live the story.
> **Don't just watch K-dramas. Step inside them.**
>
> 좋아하는 K-콘텐츠를 시청하고, AI가 생성한 3D 세계에 직접 들어가 가상 캐릭터와 한국어로 대화하며 자신만의 이야기를 만들어가는 몰입형 인터랙티브 엔터테인먼트 플랫폼.

---

# 1. 프로젝트 개요

## 1.1 기본 정보

| 항목 | 내용 |
|---|---|
| 프로젝트명 | **SceneTalk** |
| 서비스 유형 | AI Interactive Entertainment & Immersive Korean Learning |
| 참가 트랙 | Track 1 — Gemini 4 Argon in Entertainment |
| 핵심 타깃 | K-드라마, K-pop, 한국 예능을 즐기는 글로벌 사용자 |
| 서비스 플랫폼 | Chrome Extension + Web Application |
| 핵심 AI | Gemini 4 Argon |
| 핵심 기술 | Multimodal AI, Real-time Voice, 3D World Generation, Agentic Storytelling |
| 주요 오픈소스 | React Three Fiber, Drei, three-vrm, Gemini Live API Examples |
| 배포 환경 | Google Cloud |
| 핵심 가치 | 수동적인 콘텐츠 시청을 몰입형 인터랙티브 경험으로 전환 |

## 1.2 서비스 한 줄 소개

**SceneTalk은 사용자가 시청한 K-콘텐츠의 장면을 AI가 탐색 가능한 3D 세계로 재구성하고, 사용자가 그 세계에 직접 들어가 가상 캐릭터와 실시간으로 대화하며 자신의 발화와 행동으로 스토리를 변화시키는 서비스다.**

## 1.3 핵심 콘셉트

기존의 K-콘텐츠 시청은 일방향적이다.

사용자는 영상 속 인물의 대화를 듣고 이야기를 따라갈 수 있지만, 등장인물과 직접 대화하거나 이야기의 흐름을 바꿀 수는 없다.

SceneTalk은 이 경험을 확장한다.

사용자가 YouTube에서 K-드라마나 예능을 시청하다가 **Enter the Scene** 버튼을 클릭하면, Gemini 4 Argon이 해당 장면의 상황, 공간, 등장인물 관계, 대화 맥락을 분석한다.

이후 AI가 원본 콘텐츠의 상황에서 영감을 얻은 **새로운 3D 공간과 독창적인 가상 캐릭터**를 구성한다.

사용자는 1인칭 시점으로 공간에 진입하여 마우스로 주변을 자유롭게 둘러보고, 눈앞의 AI 캐릭터와 한국어로 실시간 대화한다.

AI 캐릭터는 사용자의 발화뿐 아니라 시선, 선택한 오브젝트, 현재 스토리 상태를 반영하여 감정과 행동을 변화시킨다.

사용자의 대답에 따라 이야기가 다른 방향으로 전개되며, 이 과정에서 한국어 표현을 자연스럽게 학습할 수 있다.

### 핵심 사용자 경험

**WATCH → LEARN → ENTER → EXPLORE → INTERACT → CHANGE → IMPROVE**

| 단계 | 사용자 경험 |
|---|---|
| WATCH | YouTube에서 K-콘텐츠 시청 |
| LEARN | 자막 속 한국어 표현을 선택하고 학습 |
| ENTER | 원하는 장면을 선택해 AI 세계로 진입 |
| EXPLORE | 1인칭 시점으로 3D 공간 탐색 |
| INTERACT | AI 캐릭터와 실시간 한국어 음성 대화 |
| CHANGE | 발화와 행동으로 캐릭터 및 스토리 변화 |
| IMPROVE | AI가 대화를 평가하고 학습 피드백 제공 |

---

# 2. 문제 정의

## 2.1 Passive Entertainment

K-콘텐츠는 전 세계적으로 소비되고 있지만, 대부분의 시청 경험은 수동적이다.

사용자는 좋아하는 드라마를 반복해서 시청할 수는 있어도, 그 세계에 직접 참여할 수는 없다.

## 2.2 Disconnected Language Learning

K-콘텐츠를 통해 한국어를 학습하는 사용자는 영상 시청과 언어 학습을 별도로 수행하는 경우가 많다.

모르는 표현을 검색하거나 저장할 수는 있지만, 해당 표현을 원래의 상황과 유사한 환경에서 직접 사용해 볼 기회는 제한적이다.

## 2.3 Limited Conversational Immersion

기존 AI 회화 서비스는 사용자와 AI의 대화 자체에 집중한다.

그러나 실제 언어 사용에서는 장소, 인물 관계, 감정, 문화적 맥락이 중요하다.

이러한 요소를 시각적 공간과 연결한 몰입형 학습 경험이 필요하다.

## 2.4 Static Storytelling

기존 영상 콘텐츠는 사용자의 반응과 무관하게 정해진 이야기로 진행된다.

사용자의 선택과 행동이 스토리에 영향을 미치는 경험을 제공하려면 동적인 스토리 생성과 상태 관리가 필요하다.

---

# 3. 서비스 목표

| ID | 목표 | 설명 |
|---|---|---|
| G-001 | Interactive Entertainment | 시청 중심 콘텐츠를 참여형 경험으로 전환 |
| G-002 | Immersive 3D Experience | 사용자가 탐색할 수 있는 3D 세계 제공 |
| G-003 | Real-time AI Interaction | AI 캐릭터와 자연스러운 음성 대화 |
| G-004 | Dynamic Storytelling | 사용자 발화와 행동에 따라 스토리 변화 |
| G-005 | Contextual Korean Learning | 콘텐츠의 문맥을 활용한 한국어 학습 |
| G-006 | Adaptive Learning | 사용자의 학습 수준과 결과에 따른 대화 조정 |
| G-007 | Generative Media Integration | AI 생성형 미디어와 인터랙티브 3D 결합 |

### 핵심 제품 원칙

**Entertainment First, Learning Through Interaction.**

사용자가 한국어 문제를 풀기 위해 게임을 하는 것이 아니라, 이야기에 참여하는 과정에서 자연스럽게 한국어를 사용하도록 설계한다.

---

# 4. 타깃 사용자

## 4.1 Primary Target

**K-콘텐츠를 즐기는 외국인 한국어 학습자**

| 항목 | 내용 |
|---|---|
| 연령 | 10대 후반~30대 |
| 관심사 | K-드라마, K-pop, 한국 예능, 한국 문화 |
| 한국어 수준 | 초급 후반~중급 |
| 주요 콘텐츠 플랫폼 | YouTube |
| 핵심 니즈 | 좋아하는 콘텐츠를 활용한 몰입형 한국어 학습 |
| 기대 경험 | 콘텐츠 속 상황에 직접 참여하며 한국어 사용 |

## 4.2 Secondary Target

**인터랙티브 엔터테인먼트를 즐기는 글로벌 K-콘텐츠 팬**

이 사용자는 언어 학습보다 AI 캐릭터와의 상호작용, 3D 세계 탐험, 스토리 분기에 더 큰 관심을 가진다.

### 서비스 모드

| 모드 | 설명 |
|---|---|
| Learning Mode | 학습 목표 표현을 중심으로 역할극 진행 |
| Entertainment Mode | 자유로운 캐릭터 대화와 스토리 경험 중심 |

**해커톤에서는 Learning Mode를 중심으로 구현하되, 화면과 사용자 경험은 인터랙티브 엔터테인먼트에 가깝게 설계한다.**

---

# 5. 서비스 구성

SceneTalk은 두 개의 주요 사용자 인터페이스로 구성된다.

## 5.1 Watch Mode — Chrome Extension

YouTube에서 콘텐츠를 시청하며 한국어 표현을 학습하는 인터페이스다.

### 주요 기능

- YouTube 영상 재생 상태 연동
- 타임스탬프 기반 한국어 자막
- 단어 및 표현 선택
- 문맥 기반 AI 해설
- 학습 표현 저장
- 현재 장면 선택
- Enter the Scene 실행

### UX 방향

YouTube 영상 시청을 방해하지 않도록 Chrome Side Panel 중심으로 구현한다.

학습 자막과 표현 해설을 영상과 연동하되, 원본 플레이어를 임의로 가리거나 수정하는 방식은 지양한다.

## 5.2 Enter the Scene Mode — Web Application

사용자가 선택한 콘텐츠의 상황을 새로운 3D 인터랙티브 세계로 변환하는 애플리케이션이다.

### 주요 기능

- AI 장면 분석
- 3D 공간 생성 및 구성
- 1인칭 시점 탐색
- AI 캐릭터 생성 및 렌더링
- 실시간 음성 대화
- 시선 및 오브젝트 상호작용
- 캐릭터 감정·행동 변화
- 동적 스토리 분기
- 학습 평가 및 피드백

---

# 6. 핵심 기능 명세

## F-001. Interactive Subtitle Learning

### 기능 설명

사용자가 YouTube 영상의 한국어 자막을 통해 단어와 표현을 학습할 수 있도록 한다.

### 주요 요구사항

- 영상 재생 시점과 자막 동기화
- 단어 및 구 단위 표현 선택
- 간단한 번역 제공
- 상세 문맥 해설 제공
- 문법 및 높임말 설명
- 학습 표현 저장
- 원본 영상 구간 재생

### AI 활용

Gemini가 한국어 표현의 문맥적 의미와 문화적 뉘앙스를 분석한다.

### 예시

**원문**

> 너 왜 이렇게 눈치를 봐?

**학습 표현**

`눈치를 보다`

**AI 해설**

- Meaning: To read the room
- Context: 상대방의 반응을 신경 쓰는 상황
- Speech Level: Informal
- Example: 눈치 보지 마.

---

## F-002. Context-Aware Expression Saving

### 기능 설명

사용자가 학습한 표현을 원본 영상의 문맥과 함께 저장한다.

### 저장 데이터

| 필드 | 설명 |
|---|---|
| expression | 학습 표현 |
| original_sentence | 원문 문장 |
| meaning | 의미 |
| grammar | 문법 정보 |
| video_id | 영상 식별자 |
| timestamp | 표현 등장 시점 |
| scene_context | 장면 상황 |
| learning_status | 학습 상태 |

### 핵심 요구사항

저장된 표현은 이후 AI 역할극의 학습 목표로 활용되어야 한다.

---

## F-003. Enter the Scene

### 기능 설명

사용자가 현재 시청 중인 장면을 선택하여 AI가 생성한 인터랙티브 세계로 진입한다.

### 사용자 흐름

1. 사용자가 영상 장면 선택
2. Enter the Scene 클릭
3. 장면 분석
4. 캐릭터 및 공간 생성
5. 3D 인터랙티브 세계 진입

### 주요 요구사항

- 선택한 영상의 시점 확보
- 장면 문맥 분석
- 사용자 역할 설정
- 학습 목표 반영
- Scene Specification 생성
- Web App으로 세션 정보 전달

---

## F-004. AI Scene Understanding

### 기능 설명

Gemini 4 Argon이 영상과 자막을 분석해 인터랙티브 장면 구성에 필요한 정보를 추출한다.

### 분석 항목

| 항목 | 설명 |
|---|---|
| Scene Context | 장면의 사건과 상황 |
| Environment | 장소, 시간, 분위기 |
| Characters | 등장인물의 역할과 특징 |
| Relationships | 인물 간 관계 |
| Emotions | 감정 상태 |
| Dialogue Context | 대화 목적 및 흐름 |
| Cultural Context | 문화적·언어적 맥락 |
| Learning Opportunities | 학습 가능한 한국어 표현 |

### 출력

구조화된 **Scene Specification**을 생성한다.

Scene Specification은 3D 공간 구성, 캐릭터 생성, 스토리 계획에 활용한다.

---

## F-005. Original AI Character Generation

### 기능 설명

원본 콘텐츠의 상황과 관계를 참고하여 **독창적인 가상 캐릭터**를 생성한다.

실존 배우·아이돌의 외형이나 음성을 복제하지 않는다.

### 캐릭터 구성 요소

| 요소 | 설명 |
|---|---|
| Appearance | 외형 및 의상 |
| Personality | 성격 |
| Voice | 음성 |
| Emotion | 현재 감정 |
| Relationship | 사용자와의 관계 |
| Speaking Style | 말투 및 높임말 |
| Behavior | 행동 특성 |
| Memory | 대화 및 사건 기억 |

### 주요 요구사항

- 장면에 적합한 가상 캐릭터 구성
- 대화 중 캐릭터 성격 일관성 유지
- 감정 및 관계 상태 유지
- 캐릭터 상태에 따른 음성·표정·행동 변화

---

## F-006. AI-Generated Immersive 3D World

### 기능 설명

AI가 콘텐츠의 상황을 기반으로 사용자가 탐색할 수 있는 3D 공간을 생성한다.

### 주요 기능

| 기능 | 설명 |
|---|---|
| World Generation | 장면에 맞는 3D 공간 구성 |
| First-Person View | 사용자 1인칭 시점 |
| Mouse Look | 마우스로 상하좌우 시점 회전 |
| 360° Exploration | 주변 환경 탐색 |
| Interactive Objects | 공간 내 오브젝트 선택 |
| Character Placement | AI 캐릭터 배치 |
| Dynamic Lighting | 장면 분위기에 맞는 조명 |
| Environmental Audio | 환경음 및 배경음 |
| Scene Transition | 스토리에 따른 공간 전환 |

### 사용자 경험 예시

사용자가 카페 장면에 진입한다.

화면에는 1인칭 시점의 카페 내부가 표시된다.

사용자는 마우스로 주변을 자유롭게 둘러볼 수 있다.

정면에는 AI 캐릭터가 앉아 있고, 창밖에는 비가 내리고 있다.

사용자가 창문을 바라보면 해당 공간 정보가 AI 대화에 반영된다.

### 기술 방향

Gemini 4 Argon이 장면의 구조화된 명세를 생성하고, React Three Fiber와 Three.js가 이를 실제 3D 공간으로 렌더링한다.

기본 구현에서는 사전에 준비된 3D 컴포넌트와 에셋을 조합한다.

장면에 맞는 새로운 오브젝트·환경을 동적으로 생성하는 기능은 모델 성능과 구현 가능성에 따라 확장한다.

---

## F-007. Spatially Aware Interaction

### 기능 설명

AI가 사용자의 음성뿐 아니라 현재 시선과 공간 내 상호작용 정보를 이해한다.

### 주요 기능

| 기능 | 설명 |
|---|---|
| Gaze Awareness | 사용자가 바라보는 방향 인식 |
| Object Selection | 선택한 오브젝트 식별 |
| Spatial Context | 현재 공간 정보 활용 |
| Contextual Dialogue | 공간 정보를 반영한 대화 |
| Environmental Interaction | 오브젝트 상호작용에 따른 사건 발생 |

### 예시

사용자가 카페 창밖을 바라본다.

**AI Character**

> 밖에 뭐 있어? 왜 자꾸 창밖을 봐?

**User**

> 밖에 비가 오네. 우산 가져왔어?

**AI Character**

> 아, 그러네! 나 우산 안 가져왔는데 어떡하지?

AI는 새로운 스토리 이벤트를 생성한다.

**Story Event: Find a way to get home without getting wet.**

### 기술 방향

Three.js Raycasting을 활용해 사용자가 바라보거나 선택한 오브젝트를 식별한다.

이 정보를 구조화하여 AI에 전달한다.

사용자 시선 정보는 지속적으로 모든 프레임을 전달하지 않고, 의미 있는 변화가 발생했을 때 전달한다.

---

## F-008. Real-Time AI Character Conversation

### 기능 설명

사용자가 마이크를 통해 AI 캐릭터와 실시간으로 한국어 대화를 진행한다.

### 주요 요구사항

- 실시간 음성 입력
- 한국어 발화 이해
- 실시간 한국어 음성 응답
- 대화 문맥 유지
- 사용자 발화 중단 처리
- 캐릭터 성격에 맞는 말투 유지
- 감정 및 관계 상태 반영

### 예시

**AI Character**

> 너 아까부터 왜 이렇게 조용해? 나한테 삐졌어?

**User**

> 아니, 그냥 네 눈치를 보고 있었어.

**AI Character**

> 내 눈치를 왜 봐? 우리 사이에!

---

## F-009. Dynamic Character Emotion & Animation

### 기능 설명

사용자의 발화와 스토리 상황에 따라 캐릭터의 감정, 표정, 행동을 변화시킨다.

### 캐릭터 상태

| 상태 | 예시 |
|---|---|
| Emotion | Happy, Sad, Angry, Surprised, Neutral |
| Relationship | Friendly, Distant, Conflicted |
| Engagement | Interested, Curious, Bored |
| Action | Wave, Nod, Look Away, Smile |
| Story State | Introduction, Conflict, Resolution |

### 주요 요구사항

- 발화 의도 분석
- 감정 상태 갱신
- 표정 애니메이션
- 제스처 애니메이션
- 음성과 입 모양 동기화
- 사용자 방향 응시

### 기술 방향

three-vrm을 활용해 3D 캐릭터를 렌더링하고, 캐릭터 상태에 따라 표정과 애니메이션을 제어한다.

---

## F-010. Dynamic Story Branching

### 기능 설명

사용자의 발화와 공간 내 행동에 따라 이야기의 흐름을 변화시킨다.

### 핵심 원칙

스토리는 고정된 대본이 아니라 현재 상황과 사용자 행동을 기반으로 동적으로 진행된다.

### 분기 예시

**상황**

친구가 사용자에게 서운함을 느끼고 있다.

| 사용자 행동 | 캐릭터 반응 | 스토리 변화 |
|---|---|---|
| 사과 | 감정 완화 | 화해 장면 |
| 장난 | 장난스럽거나 서운한 반응 | 추가 대화 |
| 무시 | 서운함 증가 | 갈등 심화 |
| 창밖을 바라봄 | 시선에 반응 | 새로운 사건 |
| 대답 실패 | 쉬운 질문 제공 | 학습 지원 |

### 주요 요구사항

- 스토리 상태 관리
- 캐릭터 관계 변화
- 분기 조건 평가
- 다음 이벤트 생성
- 장면 전환 트리거
- 대화 이력 반영

---

## F-011. AI Cinematic Scene Transition

### 기능 설명

중요한 스토리 이벤트 발생 시 생성형 미디어를 활용한 시네마틱 전환을 제공한다.

### 활용 예시

- 새로운 장소로 이동
- 중요한 사건 발생
- 감정적 전환
- 스토리 엔딩

### 구현 원칙

실시간 상호작용은 3D 환경에서 처리한다.

생성형 영상은 장면 전환이나 엔딩과 같이 비실시간 처리가 가능한 구간에 활용한다.

영상 생성이 지연되거나 실패하더라도 3D 장면 전환으로 진행할 수 있어야 한다.

---

## F-012. AI Korean Learning Verification

### 기능 설명

사용자의 실제 대화를 분석하여 학습 표현 사용 여부와 한국어의 적절성을 평가한다.

### 평가 항목

| 항목 | 설명 |
|---|---|
| Expression Usage | 목표 표현 사용 여부 |
| Contextual Accuracy | 문맥 적절성 |
| Grammar Accuracy | 문법 정확성 |
| Speech Appropriateness | 높임말 및 말투 |
| Communication Success | 의사소통 성공 여부 |

### 평가 예시

목표 표현: `눈치를 보다`

| 사용자 발화 | 평가 |
|---|---|
| 네 눈치를 보고 있었어. | 적절한 사용 |
| 눈치 보지 마. | 문맥에 따라 적절 |
| 눈치를 먹었어. | 부적절 |
| 네가 화난 줄 알았어. | 의미 전달 성공, 목표 표현 미사용 |

### 핵심 원칙

학습 평가와 스토리 진행을 분리한다.

사용자가 문법적으로 완벽하지 않더라도 의사소통에 성공했다면 스토리는 자연스럽게 이어질 수 있어야 한다.

---

## F-013. Adaptive AI Learning

### 기능 설명

사용자의 학습 결과에 따라 AI가 다음 대화의 난도와 학습 목표를 조정한다.

| 학습 상태 | AI 동작 |
|---|---|
| 성공 | 다음 표현 제시 |
| 부분 성공 | 유사한 상황에서 재연습 |
| 실패 | 힌트 제공 |
| 반복 실패 | 쉬운 표현으로 질문 변경 |

---

## F-014. Story Result & Learning Report

### 기능 설명

역할극 종료 후 스토리 결과와 한국어 학습 성과를 제공한다.

### Story Result

- 스토리 엔딩
- 주요 사건
- 캐릭터 관계 변화
- 사용자 선택 기록
- 다시 플레이하기

### Learning Report

- 학습한 표현
- 실제 사용한 표현
- 표현별 평가
- 문법 및 말투 피드백
- 개선이 필요한 표현
- 다음 학습 추천

---

# 7. 핵심 사용자 시나리오

## SC-001. 콘텐츠 시청 및 표현 학습

| 항목 | 내용 |
|---|---|
| 목표 | K-콘텐츠에서 한국어 표현 학습 |
| 사전 조건 | 지원 영상 및 자막 확보 |
| 입력 | 영상, 자막 |
| 출력 | 학습 표현 및 문맥 정보 |
| 성공 기준 | 표현 선택·해설·저장 완료 |

### 상세 흐름

1. 사용자가 YouTube에서 K-콘텐츠를 재생한다.
2. SceneTalk이 지원 영상을 인식한다.
3. 영상과 동기화된 학습 자막을 제공한다.
4. 사용자가 모르는 표현을 선택한다.
5. AI가 문맥 기반 해설을 제공한다.
6. 사용자가 표현을 저장한다.

---

## SC-002. AI 인터랙티브 세계 생성

| 항목 | 내용 |
|---|---|
| 목표 | 영상 장면을 3D 세계로 변환 |
| 사전 조건 | 장면 정보 확보 |
| 입력 | 영상 장면, 자막, 학습 표현 |
| 출력 | Scene Specification, Character Specification |
| 성공 기준 | 탐색 가능한 3D 장면 생성 |

### 상세 흐름

1. 사용자가 Enter the Scene을 클릭한다.
2. AI가 영상 장면을 분석한다.
3. 공간과 상황을 파악한다.
4. 가상 캐릭터와 사용자 역할을 정의한다.
5. 학습 목표를 반영한 스토리 초기 상태를 생성한다.
6. 3D 공간과 캐릭터를 구성한다.
7. 사용자가 인터랙티브 세계에 진입한다.

---

## SC-003. Immersive 3D Roleplay

| 항목 | 내용 |
|---|---|
| 목표 | 3D 공간에서 AI 캐릭터와 한국어로 대화 |
| 사전 조건 | 인터랙티브 장면 생성 완료 |
| 입력 | 사용자 음성, 카메라 방향, 오브젝트 상호작용 |
| 출력 | 캐릭터 음성·행동, 스토리 변화 |
| 성공 기준 | 음성 및 공간 상호작용이 대화에 반영 |

### 상세 흐름

1. 사용자가 1인칭 시점으로 3D 공간에 진입한다.
2. 마우스로 주변을 둘러본다.
3. AI 캐릭터가 사용자에게 한국어로 말을 건다.
4. 사용자가 마이크로 응답한다.
5. AI가 발화와 공간 정보를 분석한다.
6. 캐릭터가 대사·감정·행동을 변화시킨다.
7. 대화가 지속된다.

---

## SC-004. Dynamic Story Branching

| 항목 | 내용 |
|---|---|
| 목표 | 사용자 행동에 따른 스토리 변화 |
| 사전 조건 | 역할극 진행 중 |
| 입력 | 사용자 발화, 공간 상호작용, 스토리 상태 |
| 출력 | 다음 사건 및 장면 |
| 성공 기준 | 서로 다른 행동에 따라 다른 스토리 진행 |

### 상세 흐름

1. 사용자 발화 및 행동을 분석한다.
2. 현재 스토리 상태를 확인한다.
3. 캐릭터 감정과 관계를 갱신한다.
4. 다음 사건을 결정한다.
5. 필요한 경우 새로운 장면을 생성한다.
6. 변화된 상황에서 역할극을 이어간다.

---

## SC-005. Learning Evaluation

| 항목 | 내용 |
|---|---|
| 목표 | 한국어 학습 성과 평가 |
| 사전 조건 | 역할극 종료 |
| 입력 | 대화 기록, 학습 표현 |
| 출력 | 학습 리포트 |
| 성공 기준 | 표현별 평가와 개선점 제공 |

### 상세 흐름

1. 역할극이 종료된다.
2. AI가 대화 기록을 분석한다.
3. 목표 표현 사용 여부를 평가한다.
4. 문법과 문맥 적절성을 평가한다.
5. 스토리 결과를 생성한다.
6. 학습 리포트를 표시한다.

---

# 8. 화면 구성

| 화면 ID | 화면명 | 주요 구성 |
|---|---|---|
| UI-001 | Watch Mode | YouTube, 학습 자막, 표현 해설 |
| UI-002 | Scene Selection | 선택 장면, 학습 목표, Enter 버튼 |
| UI-003 | Scene Generation | 장면 분석 및 생성 상태 |
| UI-004 | Immersive 3D Scene | 1인칭 3D 세계, AI 캐릭터 |
| UI-005 | Learning Assistance | 힌트, 번역, 표현 설명 |
| UI-006 | Story Result | 스토리 엔딩 및 관계 변화 |
| UI-007 | Learning Report | 표현 평가 및 학습 피드백 |

## 8.1 Immersive 3D Scene UI

### 화면 구성

**중앙**

- 3D 세계
- AI 캐릭터
- 자유 시점 카메라
- 인터랙티브 오브젝트

**하단**

- 캐릭터 대사
- 사용자 음성 입력 상태
- 마이크 버튼

**측면**

- 학습 목표 표현
- 힌트
- 설정

### 사용자 조작

| 입력 | 동작 |
|---|---|
| 마우스 드래그 | 시점 회전 |
| 마우스 클릭 | 캐릭터 및 오브젝트 선택 |
| 마이크 | 한국어 음성 대화 |
| WASD | 공간 이동 — 확장 기능 |
| ESC | 메뉴 및 일시 정지 |

기본 서비스는 VR 헤드셋 없이 브라우저에서 동작하는 1인칭 3D 환경으로 제공한다.

---

# 9. AI 시스템 역할 정의

## 9.1 Scene Understanding Agent

영상과 자막을 분석하여 장면의 맥락과 등장인물 관계를 추출한다.

**입력:** 영상 정보, 자막, 선택 시점

**출력:** Scene Context

## 9.2 World & Character Planner

장면 정보를 기반으로 3D 공간과 가상 캐릭터의 구조화된 명세를 생성한다.

**입력:** Scene Context

**출력:** World Specification, Character Specification

## 9.3 Story Director

사용자 발화, 시선, 오브젝트 상호작용을 기반으로 스토리 상태와 다음 사건을 결정한다.

**입력:** Dialogue, Spatial Context, Story State

**출력:** Story Event, Character State Update

## 9.4 Real-Time Character Conversation

AI 캐릭터와 사용자의 실시간 음성 대화를 처리한다.

**입력:** User Voice, Character Context

**출력:** Character Voice, Dialogue

## 9.5 Learning Verifier

사용자의 한국어 발화를 평가한다.

**입력:** Dialogue History, Learning Goals

**출력:** Learning Evaluation

## 9.6 Adaptive Learning Planner

학습 평가 결과를 기반으로 다음 학습 목표와 대화 난도를 조정한다.

**입력:** Learning Evaluation, User Profile

**출력:** Updated Learning Goals

---

# 10. 기술 스택 및 오픈소스 활용 계획

## 10.1 기술 스택

| 영역 | 기술 | 활용 목적 |
|---|---|---|
| Chrome Extension | Chrome Extension API | YouTube 학습 인터페이스 |
| Frontend | React + Vite | Web Application |
| 3D Engine | Three.js | 3D 공간 렌더링 |
| 3D React Integration | React Three Fiber | 3D 컴포넌트 구성 |
| Camera & Controls | Drei | 1인칭 시점 및 공간 탐색 |
| Character Runtime | three-vrm | 3D 아바타 렌더링 |
| Character Assets | 사용 조건을 확인한 VRM 에셋 | 가상 캐릭터 |
| AI Orchestration | Gemini 4 Argon | 장면 이해, 스토리, 학습 검증 |
| Real-time Voice | Gemini Live API | 실시간 음성 대화 |
| Backend | FastAPI | API 및 세션 관리 |
| Cloud | Google Cloud Run | 백엔드 배포 |
| Data Storage | Firestore 등 | 사용자·세션·학습 데이터 |

## 10.2 오픈소스 활용 목록

| 프로젝트 | GitHub | 활용 영역 | 우선순위 |
|---|---|---|---|
| React Three Fiber | [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 3D 렌더링 | P0 |
| Drei | [pmndrs/drei](https://github.com/pmndrs/drei) | 카메라·시점 조작 | P0 |
| three-vrm | [pixiv/three-vrm](https://github.com/pixiv/three-vrm) | AI 아바타 | P0 |
| Gemini Live API Examples | [google-gemini/gemini-live-api-examples](https://github.com/google-gemini/gemini-live-api-examples) | 실시간 음성 | P0 |
| xlunar-ai-avatar | [iamenahs/xlunar-ai-avatar](https://github.com/iamenahs/xlunar-ai-avatar) | 아바타 표현 참고 | P1 |
| ReactFiberAvatarTalk | [absolutedimension/ReactFiberAvatarTalk](https://github.com/absolutedimension/ReactFiberAvatarTalk) | 음성·립싱크 참고 | P1 |
| Rhubarb Lip Sync | [DanielSWolf/rhubarb-lip-sync](https://github.com/DanielSWolf/rhubarb-lip-sync) | 립싱크 보조 | P2 |

### 오픈소스 활용 원칙

- 해커톤 규정에 따라 오픈소스 라이브러리와 스타터 템플릿 활용
- 실제 시연 코드는 해커톤 기간 내 작성
- 각 라이브러리 및 에셋의 라이선스 준수
- SceneTalk의 핵심 AI 오케스트레이션 및 상호작용 기능은 직접 구현

---

# 11. 데이터 요구사항

| 데이터 | 주요 항목 | 활용 목적 |
|---|---|---|
| User Profile | 언어, 한국어 수준, 관심사 | 개인화 |
| Video Metadata | 영상 ID, 제목, URL | 콘텐츠 식별 |
| Subtitle | 타임스탬프, 원문 | 표현 학습 |
| Saved Expression | 표현, 뜻, 문맥 | 학습 목표 |
| Scene Context | 장소, 상황, 감정, 관계 | 장면 생성 |
| World Specification | 공간, 오브젝트, 조명 | 3D 렌더링 |
| Character Specification | 외형, 성격, 말투 | 캐릭터 구성 |
| Character State | 감정, 관계, 행동 | 캐릭터 반응 |
| Spatial Context | 시선, 선택 오브젝트 | 공간 인식 |
| Story State | 사건, 분기, 목표 | 스토리 진행 |
| Dialogue History | 사용자·캐릭터 발화 | 대화 문맥 |
| Learning Evaluation | 표현 사용, 문법, 피드백 | 학습 검증 |
| Session Result | 스토리 엔딩, 학습 결과 | 결과 제공 |

---

# 12. 해커톤 구현 범위

## 12.1 P0 — 핵심 기능

| 기능 | 구현 목표 |
|---|---|
| YouTube Watch Mode | 영상과 연동된 학습 인터페이스 |
| Expression Learning | 표현 선택·해설·저장 |
| Scene Understanding | 영상 장면 분석 |
| Enter the Scene | 학습 모드에서 3D 세계로 전환 |
| 3D World | 탐색 가능한 3D 공간 |
| First-Person Camera | 마우스 기반 자유 시점 |
| AI Character | 3D 가상 캐릭터 |
| Real-time Voice | 한국어 음성 대화 |
| Story Branching | 발화 기반 스토리 변화 |
| Learning Verification | 목표 표현 사용 평가 |
| Learning Report | 학습 결과 제공 |

## 12.2 P1 — 몰입형 경험 강화

| 기능 | 구현 목표 |
|---|---|
| Emotion Animation | 감정에 따른 표정 변화 |
| Lip Sync | 음성에 맞춘 입 모양 |
| Spatial Awareness | 시선 및 오브젝트 정보 반영 |
| Interactive Objects | 공간 내 오브젝트 상호작용 |
| Cinematic Transition | 생성형 미디어 기반 장면 전환 |

## 12.3 P2 — 확장 기능

| 기능 | 구현 목표 |
|---|---|
| Multi-Character Interaction | 다수 캐릭터 동시 대화 |
| Dynamic World Generation | 새로운 3D 환경 생성 고도화 |
| Long-term Learning Memory | 장기 학습 이력 |
| Personalized Recommendations | 콘텐츠 및 학습 추천 |
| WebXR Support | VR 기기 지원 |

---

# 13. 해커톤 핵심 데모

## Demo Title

### From YouTube to Your Own K-Drama

**시연 목표:** 사용자가 YouTube에서 학습한 한국어 표현을 AI가 생성한 3D 세계에서 실제로 사용하고, 자신의 발화와 행동으로 스토리를 변화시키는 경험을 보여준다.

### Scene 1. WATCH

사용자가 YouTube에서 K-드라마를 시청한다.

자막 속 `눈치를 보다`, `삐지다`를 선택하고 저장한다.

### Scene 2. ENTER

사용자가 Enter the Scene을 클릭한다.

Gemini 4 Argon이 장면을 분석하고 새로운 인터랙티브 공간을 구성한다.

### Scene 3. EXPLORE

사용자가 1인칭 시점으로 카페에 진입한다.

마우스로 주변을 둘러본다.

정면에는 AI 캐릭터가 앉아 있고, 창밖에는 비가 내리고 있다.

### Scene 4. INTERACT

AI 캐릭터가 사용자에게 말을 건다.

> "너 아까부터 왜 이렇게 조용해? 나한테 삐졌어?"

사용자가 마이크로 응답한다.

> "아니, 그냥 네 눈치를 보고 있었어."

AI 캐릭터가 웃으며 반응한다.

### Scene 5. CHANGE

사용자가 창밖을 바라본다.

AI 캐릭터가 사용자의 시선을 인식하고 질문한다.

> "밖에 뭐 있어?"

사용자가 답한다.

> "비가 오네. 우산 가져왔어?"

AI가 새로운 스토리 이벤트를 생성한다.

캐릭터의 감정과 다음 대화가 변화한다.

### Scene 6. IMPROVE

역할극이 종료된다.

AI가 사용자의 한국어 표현 사용 여부와 문맥 적절성을 평가한다.

스토리 엔딩과 학습 리포트를 제공한다.

---

# 14. 성공 기준

| ID | 검증 항목 | 성공 기준 |
|---|---|---|
| V-001 | 자막 동기화 | 영상 재생 시점에 맞는 자막 표시 |
| V-002 | 표현 학습 | 문맥 기반 해설 제공 |
| V-003 | 학습 정보 전달 | 저장 표현이 역할극에 반영 |
| V-004 | 장면 생성 | 선택 장면 기반 3D 환경 구성 |
| V-005 | 자유 시점 | 마우스로 공간 탐색 가능 |
| V-006 | AI 캐릭터 | 3D 캐릭터 정상 렌더링 |
| V-007 | 실시간 대화 | 사용자 음성에 한국어로 응답 |
| V-008 | 감정 변화 | 발화에 따른 캐릭터 상태 변화 |
| V-009 | 공간 인식 | 시선 또는 오브젝트 정보가 대화에 반영 |
| V-010 | 스토리 분기 | 서로 다른 발화에 따라 다른 사건 생성 |
| V-011 | 학습 검증 | 목표 표현 사용 및 적절성 평가 |
| V-012 | End-to-End | 시청부터 학습 리포트까지 정상 작동 |

---

# 15. 주요 리스크 및 대응 방안

| 리스크 | 대응 방안 |
|---|---|
| YouTube 자막 접근 제한 | 사용 권한을 확보한 데모 영상 및 자막 활용 |
| 콘텐츠 저작권 | 원본 영상·음성·캐릭터의 무단 복제 방지 |
| 실존 인물 재현 문제 | 독창적인 가상 캐릭터만 생성 |
| 3D 장면 생성 시간 | 기존 3D 에셋과 컴포넌트 조합 |
| 실시간 음성 지연 | Gemini Live 중심으로 음성 파이프라인 단순화 |
| 캐릭터 립싱크 난도 | 기본 입 모양 애니메이션부터 구현 |
| AI 스토리 일관성 | 명시적인 Story State 관리 |
| 학습 평가 오류 | 구조화된 평가 기준 적용 |
| 모델 API 가용성 | 현장 모델 접근 권한 및 기능 검증 |
| 해커톤 시간 제약 | 단일 콘텐츠 기반 End-to-End 시연 우선 |

---

# 16. 해커톤 심사 기준 대응 전략

| 평가 관점 | SceneTalk의 강점 |
|---|---|
| Originality & Creativity | 시청하던 콘텐츠를 3D 인터랙티브 세계로 전환 |
| Technical Implementation | Gemini 4 Argon, 실시간 음성, 3D 렌더링 결합 |
| User Experience | 자유 시점 탐색과 AI 캐릭터 역할극 |
| Problem & Impact | K-콘텐츠 소비와 한국어 학습 연결 |
| Demo Quality | 시청 → 진입 → 대화 → 스토리 변화의 시각적 시연 |
| Scalability | 다양한 콘텐츠 및 언어 학습으로 확장 가능 |

### 핵심 차별화

기존 자막 학습 도구는 영상 속 표현을 이해하는 데 집중한다.

기존 AI 회화 서비스는 가상의 상황에서 언어를 연습하는 데 집중한다.

**SceneTalk은 사용자가 실제로 시청한 콘텐츠의 상황을 새로운 3D 세계로 확장하고, 그 안에서 직접 상호작용하며 언어를 학습하도록 한다.**

---

# 17. 향후 확장 방향

## 17.1 Interactive K-Drama Platform

여러 장면을 탐험하고 사용자 선택에 따라 새로운 이야기를 생성하는 장편 인터랙티브 콘텐츠 플랫폼으로 확장한다.

## 17.2 Multi-Character Storytelling

여러 AI 캐릭터가 동시에 등장하고 사용자와 상호작용하는 그룹 대화 및 스토리 진행을 지원한다.

## 17.3 Personalized Learning Journey

사용자의 학습 이력과 회화 수준을 분석하여 개인화된 학습 경로를 제공한다.

## 17.4 Creator Platform

콘텐츠 제작자가 자신이 보유한 영상과 에셋을 활용해 인터랙티브 AI 경험을 제작할 수 있는 플랫폼으로 확장한다.

## 17.5 WebXR Immersive Experience

브라우저 기반 3D 환경을 넘어 VR 기기에서도 몰입형 경험을 제공할 수 있도록 확장한다.

---

# 18. 최종 제품 비전

SceneTalk은 단순한 자막 번역 서비스나 AI 한국어 회화 서비스가 아니다.

**사용자가 좋아하는 K-콘텐츠를 새로운 인터랙티브 세계로 확장하고, 그 세계의 주인공이 되어 자신의 이야기를 만들어가는 경험을 제공한다.**

AI는 콘텐츠의 상황을 이해하고, 탐색 가능한 공간과 가상 캐릭터를 구성한다.

사용자는 그 공간을 자유롭게 둘러보고, AI 캐릭터와 한국어로 대화하며, 자신의 선택과 행동으로 스토리를 변화시킨다.

한국어 학습은 이 과정에서 자연스럽게 이루어진다.

### Final Value Proposition

> **SceneTalk transforms the K-content you love into a living, interactive 3D world—where AI characters talk to you, your choices shape the story, and every conversation becomes a learning experience.**

---

# 19. 기획 확정 사항

| 구분 | 확정 내용 |
|---|---|
| 프로젝트명 | SceneTalk |
| 핵심 콘셉트 | K-콘텐츠 기반 AI 인터랙티브 3D 엔터테인먼트 |
| 서비스 플랫폼 | Chrome Extension + Web App |
| 핵심 AI | Gemini 4 Argon |
| 실시간 대화 | Gemini Live |
| 3D 렌더링 | React Three Fiber + Three.js |
| 카메라 제어 | Drei |
| 캐릭터 렌더링 | three-vrm |
| 캐릭터 정책 | 독창적인 가상 캐릭터만 사용 |
| 공간 탐색 | 1인칭 자유 시점 |
| 사용자 입력 | 음성 + 시선 + 오브젝트 상호작용 |
| 스토리 진행 | 사용자 행동 기반 동적 분기 |
| 학습 기능 | 문맥 기반 표현 학습 및 AI 검증 |
| 배포 환경 | Google Cloud |
| 오픈소스 활용 | 공식 허용 범위 내 적극 활용 |

---

## 다음 단계: 시스템 아키텍처 설계

이 기획안을 **SceneTalk 최종 서비스 기획서 v2.0**으로 확정한다.

이제 아키텍처 설계에서는 다음 구성 요소를 중심으로 설계하면 된다.

**① Client Architecture**  
Chrome Extension, React Web App, 3D Scene Engine

**② AI Agent Architecture**  
Scene Understanding, World Planner, Story Director, Learning Verifier

**③ Real-Time Interaction Architecture**  
Gemini Live, 음성 스트리밍, 캐릭터 상태·애니메이션 동기화

**④ 3D World Architecture**  
Three.js, React Three Fiber, Drei, three-vrm, 공간 상태 및 Raycasting

**⑤ Backend & Data Architecture**  
FastAPI, 세션 관리, Story State, Learning State, Google Cloud

**가장 중요한 아키텍처 설계 원칙은 Gemini 4 Argon이 세계와 스토리를 계획하고, 3D 엔진이 이를 실시간으로 표현하며, Gemini Live가 사용자와 캐릭터 사이의 자연스러운 대화를 담당하도록 역할을 분리하는 것이다.**