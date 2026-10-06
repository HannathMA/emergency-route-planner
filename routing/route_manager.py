from ai.bfs import bfs
from ai.dfs import dfs
from ai.dls import dls
from ai.iddfs import iddfs
from ai.greedy import greedy
from ai.astar import astar


class RouteManager:

    def __init__(
        self,
        graph
    ):

        self.graph = graph

        self.blocked = set()

    def block_road(
        self,
        source,
        destination
    ):

        road = tuple(
            sorted(
                (source, destination)
            )
        )

        self.blocked.add(road)

    def unblock_road(
        self,
        source,
        destination
    ):

        road = tuple(
            sorted(
                (source, destination)
            )
        )

        self.blocked.discard(road)

    def get_blocked_roads(self):
        return [list(road) for road in self.blocked]

    def clear_blocked_roads(self):
        self.blocked.clear()

    def solve(
        self,
        start,
        goal,
        algorithm
    ):

        if algorithm == "bfs":

            return bfs(
                self.graph,
                start,
                goal,
                self.blocked
            )

        if algorithm == "dfs":

            return dfs(
                self.graph,
                start,
                goal,
                self.blocked
            )

        if algorithm == "dls":

            return dls(
                self.graph,
                start,
                goal,
                self.blocked
            )

        if algorithm == "iddfs":

            return iddfs(
                self.graph,
                start,
                goal,
                self.blocked
            )

        if algorithm == "greedy":

            return greedy(
                self.graph,
                start,
                goal,
                self.blocked
            )

        if algorithm == "astar":

            return astar(
                self.graph,
                start,
                goal,
                self.blocked
            )

        return {
            "success": False,
            "message":
            "Unknown algorithm."
        }