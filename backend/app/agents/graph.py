"""
LangGraph StateGraph wiring.

Nodes: fraud_check → inventory_check → negotiate | fulfill | audit | refund
Conditional edges implement BRD business rules and cyclic wait-for-response loops.
"""


def build_order_triage_graph():
    """Construct and compile the order triage StateGraph. Implement in Phase 2."""
    raise NotImplementedError("Wire LangGraph StateGraph here")
