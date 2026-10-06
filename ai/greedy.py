import heapq

from routing.heuristic import heuristic


def greedy(
    graph,
    start,
    goal,
    blocked
):

    queue = []

    heapq.heappush(
        queue,
        (
            heuristic(start, goal),
            start,
            [start],
            0
        )
    )

    visited = set()

    expanded = 0

    while queue:

        h, current, path, cost = heapq.heappop(
            queue
        )

        if current in visited:
            continue

        visited.add(current)

        expanded += 1

        if current == goal:

            return {
                "success": True,
                "algorithm": "Greedy",
                "path": path,
                "cost": cost,
                "expanded": expanded
            }

        for neighbor, weight in graph[current]:

            road = tuple(
                sorted(
                    (current, neighbor)
                )
            )

            if road in blocked:
                continue

            if neighbor not in visited:

                heapq.heappush(
                    queue,
                    (
                        heuristic(
                            neighbor,
                            goal
                        ),
                        neighbor,
                        path + [neighbor],
                        cost + weight
                    )
                )

    return {
        "success": False,
        "algorithm": "Greedy",
        "message": "No route found."
    }