"""A-Pay Agent Framework Integrations.

Provides integrations with LangChain, CrewAI, AutoGen, LlamaIndex, and other autonomous agent ecosystems.
"""

from .autogen import APayAutoGenToolkit, create_autogen_payment_tool
from .crewai import APayCrewTool, create_apay_crew_tool, create_crew_economy_toolkit, create_crew_tool
from .langchain import APayRequestsWrapper, APayTool, create_apay_tool
from .llamaindex import APayLlamaIndexTool, create_llamaindex_tool
from .openai import APayOpenAITool, create_openai_tool, create_swarm_tool, handle_openai_tool_call

__all__ = [
    "APayAutoGenToolkit",
    "APayCrewTool",
    "APayLlamaIndexTool",
    "APayOpenAITool",
    "APayRequestsWrapper",
    "APayTool",
    "create_apay_crew_tool",
    "create_apay_tool",
    "create_autogen_payment_tool",
    "create_crew_economy_toolkit",
    "create_crew_tool",
    "create_llamaindex_tool",
    "create_openai_tool",
    "create_swarm_tool",
    "handle_openai_tool_call",
]
