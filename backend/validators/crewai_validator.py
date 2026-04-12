import sys
import os
current_dir = os.path.dirname(__file__)
sys.path.append(current_dir)

from FlowValidator import FlowValidator

class CrewAIValidator(FlowValidator):
    def __init__(self):
        super().__init__()

    def rich_input_uses_variables(self, tokens):
        for token in tokens:
            if token[0] == self.RichInputTokenTypes["STATEVAR"] or token[0] == self.RichInputTokenTypes["INPUTVAR"]:
                return True
        return False
    
    def validate_agent(self, node, edges):
        warnings = super().validate_agent(node, edges)
        if self.rich_input_uses_variables(node['data']['role']) or self.rich_input_uses_variables(node['data']['goal']) or self.rich_input_uses_variables(node['data']['backstory']):
            warnings.append(f"Agent {node['data']['name']} uses variables in its role, goal or backstory. PydanticAI would be better suited for this purpose.")

        return warnings

def validate_flow(nodes, edges) -> list[str]:   
    validator = CrewAIValidator()
    return validator.validate_flow(nodes, edges)