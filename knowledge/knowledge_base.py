class KnowledgeBase:

    def __init__(self):

        self.facts = set()

    def add_fact(
        self,
        fact
    ):

        self.facts.add(fact)

    def remove_fact(
        self,
        fact
    ):

        self.facts.discard(fact)

    def contains(
        self,
        fact
    ):

        return fact in self.facts

    def get_all_facts(self):

        return list(
            self.facts
        )