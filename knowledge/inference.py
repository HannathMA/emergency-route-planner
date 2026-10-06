def forward_chaining(
    facts,
    rules
):

    facts = set(facts)

    changed = True

    while changed:

        changed = False

        for rule in rules:

            condition = (
                rule["condition"]
            )

            conclusion = (
                rule["conclusion"]
            )

            if (
                condition in facts
                and conclusion not in facts
            ):

                facts.add(
                    conclusion
                )

                changed = True

    return list(facts)