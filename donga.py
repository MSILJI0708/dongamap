# -*- coding: utf-8 -*-
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# 한글 폰트 자동 감지 (없으면 설치 시도, 그래도 없으면 대체 폰트 사용)
import os
import platform
import subprocess

def find_korean_font():
    # 흔히 설치돼 있는 한글 폰트 경로들 (OS별)
    candidates = [
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",  # Ubuntu/Debian (fonts-nanum)
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",  # macOS
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",  # macOS
        "C:/Windows/Fonts/malgun.ttf",  # Windows (맑은 고딕)
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",  # Noto CJK
    ]
    for path in candidates:
        if os.path.exists(path):
            return path

    # 시스템에 설치된 폰트 중 한글 지원 폰트 자동 탐색
    for f in fm.fontManager.ttflist:
        if any(k in f.name for k in ["Nanum", "Malgun", "AppleGothic", "Gothic", "Noto Sans CJK", "Batang", "Gulim"]):
            return f.fname

    # Ubuntu/Debian 계열이면 나눔고딕 설치 시도 (root 권한 필요, 실패해도 무시)
    if platform.system() == "Linux":
        try:
            subprocess.run(["apt-get", "install", "-y", "fonts-nanum"],
                            check=True, capture_output=True, timeout=60)
            fm._load_fontmanager(try_read_cache=False)
            path = "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"
            if os.path.exists(path):
                return path
        except Exception:
            pass

    return None

font_path = find_korean_font()
if font_path:
    fm.fontManager.addfont(font_path)
    font_name = fm.FontProperties(fname=font_path).get_name()
else:
    # 한글 폰트를 못 찾으면 기본 폰트로 진행 (한글이 네모(□)로 보일 수 있음)
    print("경고: 한글 폰트를 찾지 못했습니다. 그래프의 한글이 깨져 보일 수 있습니다.")
    print("Ubuntu/Debian: sudo apt-get install fonts-nanum")
    print("macOS: 기본 내장 폰트 사용, Windows: 맑은 고딕 사용")
    font_name = plt.rcParams['font.family'][0] if isinstance(plt.rcParams['font.family'], list) else plt.rcParams['font.family']

# 이미지의 인접 리스트를 (출발지, [도착지들]) 형태로 정리
adjacency = [
    ("정문", ["108계단", "차고지", "체대", "농구장"]),
    ("108계단", ["s01", "체대"]),
    ("차고지", ["s01"]),
    ("체대", ["s01", "삼각지", "농구장"]),
    ("s01", ["s02"]),
    ("농구장", ["도서관", "체대2"]),
    ("s02", ["s03"]),
    ("s03", ["s04", "도서관", "야외정원"]),
    ("s04", ["s05", "야외정원", "s06지하"]),
    ("s05", ["s06"]),
    ("도서관", ["체대2", "s11"]),
    ("s11", ["s12", "bs04"]),
    ("bs04", ["s04", "s12"]),
    ("s12 1층", ["s05"]),
    ("s12 4층", ["s05", "s06", "체대2"]),
]

# 중복 제거하며 edge 리스트 생성 (무방향 그래프 기준)
edges = []
seen = set()
for src, dsts in adjacency:
    for dst in dsts:
        key = tuple(sorted([src, dst]))
        if key not in seen:
            seen.add(key)
            edges.append((src, dst))

# 도로 데이터(r01: A, B) 형태로 출력
road_data = []
for i, (a, b) in enumerate(edges, start=1):
    road_id = f"r{i:02d}"
    road_data.append((road_id, a, b))

# 텍스트 파일로 저장
with open("road_data.txt", "w", encoding="utf-8") as f:
    for road_id, a, b in road_data:
        line = f"{road_id} : {a}, {b}"
        f.write(line + "\n")
        print(line)

print(f"\n총 도로(간선) 개수: {len(road_data)}")

# 그래프 생성
G = nx.Graph()
for road_id, a, b in road_data:
    G.add_edge(a, b, label=road_id)

print(f"총 노드(장소) 개수: {G.number_of_nodes()}")

# 시각화
plt.rcParams['font.family'] = font_name
plt.rcParams['axes.unicode_minus'] = False

pos = nx.spring_layout(G, seed=42, k=1.2, iterations=100)

plt.figure(figsize=(16, 12))
nx.draw_networkx_nodes(G, pos, node_size=1800, node_color="#a8d5ba", edgecolors="#2f6b4f", linewidths=1.5)
nx.draw_networkx_edges(G, pos, width=1.8, edge_color="#888888")
nx.draw_networkx_labels(G, pos, font_size=10, font_weight="bold", font_family=font_name)

edge_labels = nx.get_edge_attributes(G, 'label')
nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=8, font_color="#c0392b", font_family=font_name)

plt.title("캠퍼스 도로 네트워크 그래프", fontsize=18, fontweight="bold")
plt.axis("off")
plt.tight_layout()
plt.savefig("campus_graph.png", dpi=150, bbox_inches="tight")
print("\n그래프 이미지 저장 완료: campus_graph.png")