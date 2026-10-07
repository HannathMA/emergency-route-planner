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


ALGORITHM_METADATA = {
    "astar": {
        "name": "A* Heuristic Search",
        "badge": "A*",
        "category": "Informed (Heuristic) Search",
        "evaluation_fn": "f(n) = g(n) + h(n)",
        "optimality": "Guaranteed Optimal (Lowest Total Distance Cost)",
        "completeness": "Complete",
        "time_complexity": "O(b^d)",
        "space_complexity": "O(b^d)",
        "criteria": "Evaluates both cumulative road distance traveled g(n) and admissible straight-line Euclidean distance h(n) to the hospital. Guarantees the absolute lowest travel cost.",
        "operational_focus": "Primary emergency dispatch algorithm. Mathematically guarantees the fastest arrival to Aster Medcity."
    },
    "greedy": {
        "name": "Greedy Best-First Search",
        "badge": "Greedy",
        "category": "Informed (Heuristic) Search",
        "evaluation_fn": "f(n) = h(n)",
        "optimality": "Not Guaranteed (Vulnerable to local detours)",
        "completeness": "Complete in finite spaces",
        "time_complexity": "O(b^m)",
        "space_complexity": "O(b^m)",
        "criteria": "Picks junctions solely based on which junction looks geographically closest to the hospital (straight-line distance), ignoring previous road cost.",
        "operational_focus": "Fastest computation time, but may choose longer roads if they head directly toward the hospital."
    },
    "bfs": {
        "name": "Breadth-First Search (BFS)",
        "badge": "BFS",
        "category": "Uninformed (Blind) Search",
        "evaluation_fn": "Queue / FIFO (Level-by-Level Expansion)",
        "optimality": "Optimal for Step Count (Fewest Junction Hops)",
        "completeness": "Complete",
        "time_complexity": "O(b^d)",
        "space_complexity": "O(b^d)",
        "criteria": "Expands all neighboring junctions before going deeper. Guarantees the path with the minimum number of traffic junctions crossed.",
        "operational_focus": "Ideal when minimizing junction traffic lights and complex turns rather than road distance."
    },
    "dfs": {
        "name": "Depth-First Search (DFS)",
        "badge": "DFS",
        "category": "Uninformed (Blind) Search",
        "evaluation_fn": "Stack / LIFO (Deepest Branch First)",
        "optimality": "Not Guaranteed (Often Suboptimal)",
        "completeness": "Complete in finite networks",
        "time_complexity": "O(b^m)",
        "space_complexity": "O(b * m)",
        "criteria": "Follows a single road branch until it hits a dead end or reaches the hospital, only backtracking when blocked.",
        "operational_focus": "Extremely memory efficient, but often results in major detours through peripheral highways."
    },
    "dls": {
        "name": "Depth-Limited Search (DLS)",
        "badge": "DLS",
        "category": "Uninformed (Blind) Search",
        "evaluation_fn": "Recursive Bound (Limit = 5 junctions)",
        "optimality": "Not Guaranteed",
        "completeness": "Complete only if Hospital is within 5 hops",
        "time_complexity": "O(b^l)",
        "space_complexity": "O(b * l)",
        "criteria": "Performs DFS limited strictly to 5 junction hops. Prevents wandering into infinite outer loops.",
        "operational_focus": "Restricts navigation to a localized emergency corridor."
    },
    "iddfs": {
        "name": "Iterative Deepening DFS (IDDFS)",
        "badge": "IDDFS",
        "category": "Uninformed (Blind) Search",
        "evaluation_fn": "Iterative Depth Increments (0, 1, 2...)",
        "optimality": "Optimal in Junction Hops",
        "completeness": "Complete",
        "time_complexity": "O(b^d)",
        "space_complexity": "O(b * d)",
        "criteria": "Repeats DLS with incrementally increasing depth limits. Combines BFS's fewest-hop optimality with DFS's linear memory footprint.",
        "operational_focus": "Combines shallowest-hop optimality with minimal memory consumption."
    }
}


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

        algo_key = algorithm.lower()
        result = (
            self.route_manager.solve(
                start,
                goal,
                algo_key
            )
        )

        if result["success"]:

            result["actions"] = (
                create_plan(
                    result["path"]
                )
            )

        result["metadata"] = ALGORITHM_METADATA.get(
            algo_key,
            {
                "name": algorithm.upper(),
                "category": "Search Algorithm",
                "evaluation_fn": "Standard",
                "criteria": "Pathfinding algorithm"
            }
        )

        return result

    def compare(
        self,
        start,
        goal
    ):

        algorithms = [
            "astar",
            "greedy",
            "bfs",
            "iddfs",
            "dls",
            "dfs"
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

            result["metadata"] = ALGORITHM_METADATA.get(algorithm, {})
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
        1. Receives real emergency details (e.g. Kakkanad Infopark, Kochi).
        2. Assigns suitable Kerala fleet vehicle via Constraint Satisfaction (CSP).
        3. Updates Knowledge Base and derives facts via rule inference.
        4. Calculates focused route using chosen algorithm (default A*).
        5. Generates action plan (MOVE sequence).
        6. Prepares comparative analysis for dedicated benchmark section.
        """
        algo_key = algorithm.lower()

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
        start_location = emergency.get("location", "Kakkanad_Infopark")
        goal_hospital = emergency.get("target_hospital")
        if not goal_hospital:
            if isinstance(hospitals, list) and len(hospitals) > 0:
                goal_hospital = hospitals[0].get("location", "Aster_Medcity")
            else:
                goal_hospital = "Aster_Medcity"

        route_result = self.plan(start_location, goal_hospital, algo_key)

        # Comparative search algorithm analysis for dedicated benchmark section
        comparisons = self.compare(start_location, goal_hospital)

        if not route_result["success"]:
            # Aerial Override: If roads are completely blocked, deploy Helicopter!
            helicopter = next((v for v in vehicles if "AIR" in v.get("id", "") or "Helicopter" in v.get("name", "")), None)
            
            if helicopter:
                assigned_vehicle = helicopter
                kb.add_fact("DEPLOY_AIR_AMBULANCE_NO_ROUTE")
                kb.add_fact("TERRESTRIAL_BLOCKADE_DETECTED")
                
                route_result = {
                    "success": True,
                    "algorithm": "AERIAL",
                    "path": [start_location, goal_hospital],
                    "cost": 15, # Flat aerial distance
                    "expanded": 0,
                    "actions": [
                        {"from": start_location, "to": goal_hospital, "action": "FLY"}
                    ],
                    "metadata": {
                        "name": "Aerial Override (Direct Flight)",
                        "badge": "AERIAL",
                        "category": "Emergency Airspace Navigation",
                        "evaluation_fn": "Direct Line-of-Sight",
                        "optimality": "Guaranteed Optimal (No Traffic)",
                        "time_complexity": "O(1)",
                        "space_complexity": "O(1)",
                        "criteria": "Triggered automatically when all surface corridors are completely obstructed.",
                        "operational_focus": "Bypasses all roadblocks using an emergency helicopter."
                    }
                }
            else:
                return {
                    "success": False,
                    "status": "No route found.",
                    "message": route_result.get("message", "No route found to hospital."),
                    "emergency": emergency,
                    "vehicle": assigned_vehicle,
                    "facts": kb.get_all_facts(),
                    "algorithm": route_result.get("algorithm", algo_key.upper()),
                    "algo_metadata": route_result.get("metadata", {}),
                    "comparisons": comparisons
                }

        return {
            "success": True,
            "status": "Route successfully generated",
            "emergency": emergency,
            "vehicle": assigned_vehicle,
            "facts": kb.get_all_facts(),
            "algorithm": route_result.get("algorithm", algo_key.upper()),
            "algo_metadata": route_result.get("metadata", {}),
            "path": route_result["path"],
            "cost": route_result["cost"],
            "expanded": route_result.get("expanded", 0),
            "actions": route_result.get("actions", []),
            "comparisons": comparisons
        }