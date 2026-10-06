import math


COORDINATES = {

    "Hospital": (0, 0),

    "Junction_A": (2, 2),

    "Junction_B": (5, 4),

    "Junction_C": (3, -2),

    "Junction_D": (5, 0),

    "Junction_E": (8, 2),

    "Junction_F": (7, -2),

    "Emergency": (10, 0)
}


def heuristic(node, goal):

    x1, y1 = COORDINATES[node]

    x2, y2 = COORDINATES[goal]

    return math.sqrt(
        (x1 - x2) ** 2 +
        (y1 - y2) ** 2
    )