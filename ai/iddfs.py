def iddfs(
    graph,
    start,
    goal,
    blocked,
    max_depth=20
):
    expanded = 0

    def search(
        current,
        path,
        cost,
        depth,
        limit
    ):
        nonlocal expanded
        expanded += 1

        if current == goal:

            return path, cost

        if depth >= limit:

            return None

        for neighbor, weight in graph[current]:

            road = tuple(
                sorted(
                    (current, neighbor)
                )
            )

            if road in blocked:
                continue

            if neighbor in path:
                continue

            result = search(
                neighbor,
                path + [neighbor],
                cost + weight,
                depth + 1,
                limit
            )

            if result:

                return result

        return None

    for depth in range(
        max_depth + 1
    ):

        result = search(
            start,
            [start],
            0,
            0,
            depth
        )

        if result:

            return {
                "success": True,
                "algorithm": "IDDFS",
                "path": result[0],
                "cost": result[1],
                "depth": depth,
                "expanded": expanded
            }

    return {
        "success": False,
        "algorithm": "IDDFS",
        "message": "Goal not found.",
        "expanded": expanded
    }