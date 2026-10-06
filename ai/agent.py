from ai.bfs import bfs
from ai.dfs import dfs
from ai.dls import dls
from ai.iddfs import iddfs
from ai.greedy import greedy
from ai.astar import astar
from ai.csp import assign_vehicle
from ai.planning import create_plan

from knowledge.knowledge_base import KnowledgeBase
from knowledge.rules import RULES
from knowledge.inference import forward_chaining


class EmergencyVehicleAgent:

    def __init__(
        self,
        route_manager
    ):

        self.route_manager = (
            route_manager
        )

    def plan(
        self,
        start,
        goal,
        algorithm
    ):

        result = (
            self.route_manager.solve(
                start,
                goal,
                algorithm
            )
        )

        if result["success"]:

            result["actions"] = (
                create_plan(
                    result["path"]
                )
            )

        return result

    def compare(
        self,
        start,
        goal
    ):

        algorithms = [
            "bfs",
            "dfs",
            "dls",
            "iddfs",
            "greedy",
            "astar"
        ]

        results = []

        for algorithm in algorithms:

            result = (
                self.route_manager.solve(
                    start,
                    goal,
                    algorithm
                )
            )

            results.append(result)

        return results

    def process_emergency(
        self,
        emergency,
        vehicles,
        hospitals,
        algorithm="astar"
    ):
        """
        Executes the full emergency dispatch and route planning workflow:
        1. Receives emergency details.
        2. Assigns vehicle via Constraint Satisfaction (CSP).
        3. Updates Knowledge Base and derives facts via rule inference.
        4. Calculates route using search algorithm (default A*).
        5. Generates action plan (MOVE sequence).
        6. Runs comparative analysis across search algorithms.
        """
        # Constraint Satisfaction for vehicle assignment
        csp_result = assign_vehicle(emergency, vehicles)
        if not csp_result["success"]:
            return {
                "success": False,
                "status": "Failed: No suitable vehicle found.",
                "message": csp_result.get("message", "No suitable vehicle available."),
                "emergency": emergency
            }

        assigned_vehicle = csp_result["vehicle"]

        # Knowledge Base & Rule Inference
        kb = KnowledgeBase()
        priority = str(emergency.get("priority", "")).upper()
        if priority == "CRITICAL":
            kb.add_fact("CRITICAL_EMERGENCY")

        if self.route_manager.blocked:
            kb.add_fact("ROAD_BLOCKED")
        else:
            kb.add_fact("ROAD_OPEN")

        inferred = forward_chaining(kb.get_all_facts(), RULES)
        for fact in inferred:
            kb.add_fact(fact)

        # Route planning to destination hospital
        start_location = emergency.get("location", "Emergency")
        if isinstance(hospitals, list) and len(hospitals) > 0:
            goal_hospital = hospitals[0].get("location", "Hospital")
        elif isinstance(hospitals, str):
            goal_hospital = hospitals
        else:
            goal_hospital = "Hospital"

        route_result = self.plan(start_location, goal_hospital, algorithm)

        # Comparative search algorithm analysis
        comparisons = self.compare(start_location, goal_hospital)

        if not route_result["success"]:
            return {
                "success": False,
                "status": "No route found.",
                "message": route_result.get("message", "No route found."),
                "emergency": emergency,
                "vehicle": assigned_vehicle,
                "facts": kb.get_all_facts(),
                "algorithm": route_result.get("algorithm", algorithm.upper()),
                "comparisons": comparisons
            }

        return {
            "success": True,
            "status": "Route successfully generated",
            "emergency": emergency,
            "vehicle": assigned_vehicle,
            "facts": kb.get_all_facts(),
            "algorithm": route_result.get("algorithm", algorithm.upper()),
            "path": route_result["path"],
            "cost": route_result["cost"],
            "expanded": route_result.get("expanded", 0),
            "actions": route_result.get("actions", []),
            "comparisons": comparisons
        }