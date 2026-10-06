from collections import deque


def bfs(graph, start, goal, blocked):

    queue = deque()

    queue.append(
        (start, [start], 0)
    )

    visited = {start}

    expanded = 0

    while queue:

        current, path, cost = queue.popleft()

        expanded += 1

        if current == goal:

            return {
                "success": True,
                "algorithm": "BFS",
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

                visited.add(neighbor)

                queue.append(
                    (
                        neighbor,
                        path + [neighbor],
                        cost + weight
                    )
                )

    return {
        "success": False,
        "algorithm": "BFS",
        "message": "No route found."
    }