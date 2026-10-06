import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_json(filename):
    path = os.path.join(BASE_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_roads():
    return load_json("roads.json")

def load_vehicles():
    return load_json("vehicles.json")

def load_emergencies():
    return load_json("emergencies.json")

def load_hospitals():
    return load_json("hospitals.json")
