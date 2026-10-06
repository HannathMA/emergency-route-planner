RULES = [

    {
        "condition": "ROAD_BLOCKED",
        "conclusion": "AVOID_ROAD"
    },

    {
        "condition": "CRITICAL_EMERGENCY",
        "conclusion": "USE_FASTEST_ROUTE"
    },

    {
        "condition": "ROAD_OPEN",
        "conclusion": "ROAD_CAN_BE_USED"
    }

]