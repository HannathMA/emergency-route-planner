from flask import (
    Flask,
    render_template,
    request,
    jsonify
)

from data.loader import (
    load_roads,
    load_vehicles,
    load_emergencies,
    load_hospitals
)

from routing.graph import build_graph
from routing.heuristic import COORDINATES
from routing.route_manager import RouteManager
from ai.agent import EmergencyVehicleAgent

app = Flask(
    __name__,
    template_folder="frontend",
    static_folder="frontend/static"
)

# -----------------------------
# Load Data & Initialize Agent
# -----------------------------
roads = load_roads()
vehicles = load_vehicles()
emergencies = load_emergencies()
hospitals = load_hospitals()

graph = build_graph(roads)
route_manager = RouteManager(graph)
agent = EmergencyVehicleAgent(route_manager)


# -----------------------------
# Home Route
# -----------------------------
@app.route("/")
def home():
    locations = sorted(list(graph.keys()))
    return render_template(
        "index.html",
        locations=locations,
        vehicles=vehicles,
        emergencies=emergencies,
        hospitals=hospitals,
        roads=roads,
        coordinates=COORDINATES
    )


# -----------------------------
# Network Data API
# -----------------------------
@app.route("/api/network", methods=["GET"])
def get_network():
    return jsonify({
        "roads": roads,
        "vehicles": vehicles,
        "emergencies": emergencies,
        "hospitals": hospitals,
        "coordinates": COORDINATES,
        "blocked": route_manager.get_blocked_roads()
    })


# -----------------------------
# Emergency Dispatch API (CSP + KB + Planning)
# -----------------------------
@app.route("/api/emergency/dispatch", methods=["POST"])
def dispatch_emergency():
    data = request.json or {}
    emergency_id = data.get("emergency_id")
    algorithm = data.get("algorithm", "astar")

    selected_emergency = None
    if emergency_id:
        for em in emergencies:
            if em.get("id") == emergency_id:
                selected_emergency = em
                break

    if not selected_emergency:
        selected_emergency = data.get("emergency")

    if not selected_emergency:
        return jsonify({
            "success": False,
            "status": "Failed: No emergency specified.",
            "message": "Emergency details not found."
        }), 400

    result = agent.process_emergency(
        selected_emergency,
        vehicles,
        hospitals,
        algorithm=algorithm
    )
    result["blocked"] = route_manager.get_blocked_roads()
    return jsonify(result)


# -----------------------------
# Route Planning API
# -----------------------------
@app.route("/api/route", methods=["POST"])
def find_route():
    data = request.json or {}
    start = data.get("start")
    goal = data.get("goal")
    algorithm = data.get("algorithm", "astar")

    result = agent.plan(start, goal, algorithm)
    return jsonify(result)


# -----------------------------
# Algorithm Comparison API
# -----------------------------
@app.route("/api/compare", methods=["POST"])
def compare():
    data = request.json or {}
    start = data.get("start")
    goal = data.get("goal")

    result = agent.compare(start, goal)
    return jsonify(result)


# -----------------------------
# Road Obstacle Controls
# -----------------------------
@app.route("/api/block", methods=["POST"])
def block():
    data = request.json or {}
    source = data.get("source")
    destination = data.get("destination")

    route_manager.block_road(source, destination)
    return jsonify({
        "success": True,
        "message": f"Road between {source} and {destination} blocked.",
        "blocked": route_manager.get_blocked_roads()
    })


@app.route("/api/unblock", methods=["POST"])
def unblock():
    data = request.json or {}
    source = data.get("source")
    destination = data.get("destination")

    route_manager.unblock_road(source, destination)
    return jsonify({
        "success": True,
        "message": f"Road between {source} and {destination} opened.",
        "blocked": route_manager.get_blocked_roads()
    })


@app.route("/api/clear_blocks", methods=["POST"])
def clear_blocks():
    route_manager.clear_blocked_roads()
    return jsonify({
        "success": True,
        "message": "All road blocks cleared.",
        "blocked": route_manager.get_blocked_roads()
    })


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)