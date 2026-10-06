def assign_vehicle(
    emergency,
    vehicles
):

    required = set(
        emergency.get(
            "required_equipment",
            []
        )
    )

    candidates = []

    for vehicle in vehicles:

        equipment = set(
            vehicle.get(
                "equipment",
                []
            )
        )

        if (
            vehicle["available"]
            and required.issubset(equipment)
        ):

            candidates.append(
                vehicle
            )

    if not candidates:

        return {
            "success": False,
            "message":
            "No suitable vehicle found."
        }

    return {
        "success": True,
        "vehicle": candidates[0]
    }