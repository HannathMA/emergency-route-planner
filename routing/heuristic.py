import math

COORDINATES = {
    "Aster_Medcity": (0, 0),
    "Cheranallur": (2, 1),
    "Edappally": (3, -1),
    "Kalamassery": (5, 3),
    "Palarivattom": (5, -1),
    "Kaloor": (3, -3),
    "Vyttila_Hub": (7, -3),
    "Kakkanad_Infopark": (9, -1)
}

def heuristic(node, goal):
    x1, y1 = COORDINATES[node]
    x2, y2 = COORDINATES[goal]
    return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)