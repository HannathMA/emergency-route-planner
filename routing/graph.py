def build_graph(roads):

    graph = {}

    for road in roads:

        source = road["source"]
        destination = road["destination"]
        cost = road["cost"]

        if source not in graph:
            graph[source] = []

        if destination not in graph:
            graph[destination] = []

        graph[source].append(
            (destination, cost)
        )

        graph[destination].append(
            (source, cost)
        )

    return graph