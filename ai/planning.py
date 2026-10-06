def create_plan(path):

    actions = []

    for i in range(
        len(path) - 1
    ):

        source = path[i]

        destination = path[i + 1]

        actions.append({
            "action": "MOVE",
            "from": source,
            "to": destination
        })

    return actions