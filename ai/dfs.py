def dfs(graph, start, goal, blocked):

    stack = [
        (start, [start], 0)
    ]

    visited = set()

    expanded = 0

    while stack:

        current, path, cost = stack.pop()

        if current in visited:
            continue

        visited.add(current)

        expanded += 1

        if current == goal:

            return {
                "success": True,
                "algorithm": "DFS",
                "path": path,
                "cost": cost,
                "expanded": expanded
            }

        for neighbor, weight in reversed(
            graph[current]
        ):

            road = tuple(
                sorted(
                    (current, neighbor)
                )
            )

            if road in blocked:
                continue

            if neighbor not in visited:

                stack.append(
                    (
                        neighbor,
                        path + [neighbor],
                        cost + weight
                    )
                )

    return {
        "success": False,
        "algorithm": "DFS",
        "message": "No route found."
    }