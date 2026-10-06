import heapq

from routing.heuristic import heuristic


def astar(
    graph,
    start,
    goal,
    blocked
):

    queue = []

    h = heuristic(
        start,
        goal
    )

    heapq.heappush(
        queue,
        (
            h,
            0,
            start,
            [start]
        )
    )

    best_cost = {
        start: 0
    }

    expanded = 0

    while queue:

        f, g, current, path = heapq.heappop(
            queue
        )

        expanded += 1

        if current == goal:

            return {
                "success": True,
                "algorithm": "A*",
                "path": path,
                "cost": g,
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

            new_g = g + weight

            if new_g < best_cost.get(
                neighbor,
                float("inf")
            ):

                best_cost[neighbor] = new_g

                h = heuristic(
                    neighbor,
                    goal
                )

                f = new_g + h

                heapq.heappush(
                    queue,
                    (
                        f,
                        new_g,
                        neighbor,
                        path + [neighbor]
                    )
                )

    return {
        "success": False,
        "algorithm": "A*",
        "message": "No route found."
    }