
places = {
    "GATE": "정문",

    "SB01": "동아대학교정문 버스정류장",
    "SB02": "공과대학 버스정류장",
    "SB03": "생활관 버스정류장",
    "SB04": "산학협력관 버스정류장",
    "SB05": "공대2호관 버스정류장",
    "SB06": "대학본부 버스정류장",

    "S01": "대학본부 및 인문과학대학",
    "S02": "학생회관",
    "S03": "공대1호관",
    "S04": "공대2호관",
    "S05": "공대3호관",
    "S06": "공대5호관",
    "S07": "예술체육대학1관",
    "S08": "교수회관",
    "S09": "생명자원과학대학 및 건강과학대학",
    "S10": "한림도서관",
    "S11": "자연과학대학",
    "S12": "공과대학4호관",
    "S13": "창업관",
    "S14": "산학관",
    "S15": "한림생활관 승학1관",
    "S16": "학생군사교육단",
    "S17": "예술체육대학2관",
    "S18": "예술체육대학 실습동",
    "S19": "한림생활관 승학2관",
    "S20": "한림생활관 승학2관",

    "EL01": "대학본부 및 인문과학대학 엘리베이터",
    "EL04": "공대2호관 엘리베이터",
    "EL06": "공대5호관 엘리베이터",
    "EL07": "예술체육대학1관 엘리베이터",
    "EL10": "한림도서관 엘리베이터",
    "EL17": "예술체육대학2관 엘리베이터",
}



campus_graph = {}

for pid in places:
    campus_graph[pid] = []

for road in road_data:
    campus_graph[road["from"]].append({
        "to": road["to"],
        "time": road["time"],
        "type": road["type"],
        "indoor": road["indoor"],
        "hidden": road["hidden"]
    })

    campus_graph[road["to"]].append({
        "to": road["from"],
        "time": road["time"],
        "type": road["type"],
        "indoor": road["indoor"],
        "hidden": road["hidden"]
    }) 

def dijkstra(start):
    distance = {}
    previous = {}

    for node in campus_graph:
        distance[node] = float("inf")
        previous[node] = None

    distance[start] = 0
    pq = []
    heapq.heappush(pq, (0, start))

    while pq:
        current_cost, current = heapq.heappop(pq)

        if current_cost > distance[current]:
            continue

        for edge in campus_graph[current]:
            nxt = edge["to"]
            new_cost = current_cost + edge["time"]

            if new_cost < distance[nxt]:
                distance[nxt] = new_cost
                previous[nxt] = current
                heapq.heappush(pq, (new_cost, nxt))

    return distance, previous


def build_path(previous, target):
    path = []

    while target is not None:
        path.append(target)
        target = previous[target]

    path.reverse()
    return path


def find_edge(frm, to):
    for edge in campus_graph[frm]:
        if edge["to"] == to:
            return edge
    return None 

def print_selectable_places():
    print("\n========== 출발/도착 가능 장소 ==========\n")

    for pid, name in places.items():
        if place_type[pid] == "selectable":
            print(f"{pid:5} | {name}")


def print_route(path, total_time):
    print("\n========== 최단 경로 ==========\n")

    for i, node in enumerate(path):
        print(f"{places[node]} ({node})")

        if i != len(path) - 1:
            edge = find_edge(node, path[i + 1])

            print("  │")
            print(f"  ├─ 이동 종류 : {edge['type']}")
            print(f"  ├─ 예상 시간 : {edge['time']}분")
            print(f"  └─ 실내 여부 : {edge['indoor']}")
            print("  │")

    print("\n==============================")
    print(f"총 예상 시간 : {total_time}분")




def navigation():
    print_selectable_places()

    start = input("\n출발지 ID 입력 : ").upper()
    target = input("도착지 ID 입력 : ").upper()

    if start not in places or target not in places:
        print("없는 장소입니다.")
        return

    if place_type[start] != "selectable" or place_type[target] != "selectable":
        print("해당 장소는 출발지/도착지로 선택할 수 없습니다.")
        return

    dist, prev = dijkstra(start)

    if dist[target] == float("inf"):
        print("경로가 없습니다.")
        return

    path = build_path(prev, target)
    print_route(path, dist[target])


if name == " main":
    navigation()