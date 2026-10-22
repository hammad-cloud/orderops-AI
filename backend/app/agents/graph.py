"""
LangGraph StateGraph wiring.

fraud_check ─high risk─▶ audit   (a reviewer approves via /audit/{order_id}/decision, re-entering at inventory_check)
     │
inventory_check ─in stock─▶ fulfill
     ├─ OOS, alternative found ─▶ negotiate   (customer replies via /negotiations/{id}/respond)
     └─ OOS, no alternative ───▶ refund
"""

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, StateGraph

from app.agents.state.order_state import OrderTriageState
from app.services.fraud.scorer import HIGH_RISK, score_order
from app.services.inventory.validator import first_shortage, load_stock, reserve, suggest_alternative
from app.services.negotiation.offer_engine import create_offer
from app.services.refunds.refunder import refund as refund_order


async def fraud_check(state: OrderTriageState, config: RunnableConfig) -> OrderTriageState:
    order = state["order"]
    order.status = "fraud_check"
    order.risk_score, reasons = await score_order(config["configurable"]["db"], order.customer_id, order.total, order.items)
    order.notes = "; ".join(reasons) or None
    return {"outcome": "audit"} if order.risk_score >= HIGH_RISK else {}


async def inventory_check(state: OrderTriageState, config: RunnableConfig) -> OrderTriageState:
    order, db = state["order"], config["configurable"]["db"]
    order.status = "inventory_check"
    stock = await load_stock(db, [i["sku"] for i in order.items])
    shortage = first_shortage(order.items, stock)
    if shortage is None:
        return {"stock": stock, "outcome": "fulfill"}
    alternative = await suggest_alternative(db, stock[shortage["sku"]], shortage["quantity"])
    return {"stock": stock, "shortage": shortage, "alternative": alternative,
            "outcome": "negotiate" if alternative else "refund"}


async def fulfill(state: OrderTriageState) -> OrderTriageState:
    reserve(state["order"].items, state["stock"])
    state["order"].status = "fulfillment"
    return {}


async def negotiate(state: OrderTriageState, config: RunnableConfig) -> OrderTriageState:
    order = state["order"]
    await create_offer(config["configurable"]["db"], order, state["stock"][state["shortage"]["sku"]], state["alternative"])
    order.status = "negotiating"
    return {}


async def audit(state: OrderTriageState) -> OrderTriageState:
    state["order"].status = "audit"
    return {}


async def refund(state: OrderTriageState) -> OrderTriageState:
    refund_order(state["order"], f"{state['shortage']['sku']} out of stock with no alternative")
    return {}


def build_order_triage_graph():
    graph = StateGraph(OrderTriageState)
    for node in (fraud_check, inventory_check, fulfill, negotiate, audit, refund):
        graph.add_node(node.__name__, node)
    graph.set_conditional_entry_point(lambda s: "inventory_check" if s.get("approved") else "fraud_check",
                                      ["fraud_check", "inventory_check"])
    graph.add_conditional_edges("fraud_check", lambda s: s.get("outcome") or "inventory_check",
                                ["audit", "inventory_check"])
    graph.add_conditional_edges("inventory_check", lambda s: s["outcome"], ["fulfill", "negotiate", "refund"])
    for node in ("fulfill", "negotiate", "audit", "refund"):
        graph.add_edge(node, END)
    return graph.compile()


triage_graph = build_order_triage_graph()
