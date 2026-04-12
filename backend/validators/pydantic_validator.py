import sys
import os
current_dir = os.path.dirname(__file__)
sys.path.append(current_dir)

from FlowValidator import FlowValidator 

class PydanticAIValidator(FlowValidator):
    def __init__(self):
        super().__init__()



def validate_flow(nodes, edges) -> list[str]:   
    validator = PydanticAIValidator()
    return validator.validate_flow(nodes, edges)