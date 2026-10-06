def dls(
    graph,
    start,
    goal,
    blocked,
    limit=5
):

    expanded = 0

    def search(
        current,
        path,
        cost,
        depth
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
                depth + 1
            )

            if result:

                return result

        return None

    result = search(
        start,
        [start],
        0,
        0
    )

    if result:

        return {
            "success": True,
            "algorithm": "DLS",
            "path": result[0],
            "cost": result[1],
            "expanded": expanded
        }

    return {
        "success": False,
        "algorithm": "DLS",
        "message": "Goal not found within depth limit.",
        "expanded": expanded
    }