
# temporary fix: add parent directory to python path
import sys
import os
current_dir = os.path.dirname(__file__)
sys.path.append(os.path.abspath(os.path.join(current_dir, '..')))

import test_flows
from CodeGenerator import CodeGenerator

class PydanticAIGenerator(CodeGenerator):
    # the llm is a string of the form "provider_suffix/model_name"
    model_provider_prefixes = {
        "OpenAI" : "openai", 
        "Google" : "google-gla", 
        "Groq" : "groq", 
    }
    
    def __init__(self, templates_dir):
        render_state_var = staticmethod(lambda field: f"state.{field}")
        render_external_state_var = staticmethod(lambda field: f"flowState.{field}")
        render_input_var = staticmethod(lambda field: f"input[\'{field}\']")
        render_external_input_var = staticmethod(lambda field: f"ctx.deps.{field}")
        render_output_var = staticmethod(lambda field: f"output_dict[\'{field}\']")

        super().__init__(templates_dir, render_state_var, render_external_state_var, render_input_var, render_external_input_var, render_output_var)

    def extract_input(self, flow_data, agent):
        """
        Returns a list with all the input variables received by the agent. The variables are not necessary all used by the agent
        """
        predecessor_ids = agent["predecessors"]
        predecessor_outputs = []

        for node in flow_data["nodes"]:
            if node["id"] in predecessor_ids:
                if node["type"] == "start":
                    continue # start nodes have no output_structure
                predecessor_outputs.append(node["data"]["output_structure"])
        
        if len(predecessor_outputs) == 0:
            return {}
        
        # intersection of all the predecessor outputs
        common_items = predecessor_outputs[0].items()

        for d in predecessor_outputs[1:]:
            common_items &= d.items()

        return dict(common_items)

    def refactor_flow_data(self, nodes):
        data = {"nodes": nodes}

        startNode = list(filter(lambda node: node["type"] == "start", data["nodes"]))[0]
        state = startNode["data"]["state"] # used for function node refactoring
        
        # add node predecessors
        # the predecessors are the events that trigger the node
        # we always use strings and never function names so we can use the events before declaring functions
        for node in data["nodes"]:
            if (node["type"] != "agent" or node["data"]["enabled_handoffs"] == False) and node["data"]["connected"] == False:
                continue
            if node["data"]["connected"] == True:
                node["predecessors"] = []
                for predecessor in data["nodes"]:
                    if predecessor["data"]["connected"] == False:
                        continue
                    if predecessor["type"] == "end":
                        continue # end nodes have no successors
                    elif predecessor["type"] == "router" and node["id"] in predecessor["successors"]:
                        node["predecessors"].append(predecessor["id"])
                    elif node["id"] in predecessor["successors"]:
                        node["predecessors"].append(predecessor["id"])
                    
            # add node function names
            if node["type"] == "start":
                node["function_name"] = "start"
                continue
            node["function_name"] = node["type"] + "_" + node["id"]

            # process rich input in agent prompts, and refactor custom_output for easier parsing
            if node["type"] == "agent":
                # process rich input
                node["data"]["prompt"] = self.process_rich_input(node["data"]["prompt"])
                node["data"]["role"] = self.process_rich_input(node["data"]["role"], external_input = True)
                node["data"]["goal"] = self.process_rich_input(node["data"]["goal"], external_input = True)
                node["data"]["backstory"] = self.process_rich_input(node["data"]["backstory"], external_input = True)

                for i in range(len(node["data"]["knowledge_sources"])):
                    node["data"]["knowledge_sources"][i][0] = self.curate_string(node["data"]["knowledge_sources"][i][0])
                    node["data"]["knowledge_sources"][i][1] = self.curate_string(node["data"]["knowledge_sources"][i][1])

                # refactor model info
                node["data"]["model_name"] = self.ModelNames[node["data"]["model_provider"]][node["data"]["model_name"]]
                node["data"]["model_provider"] = self.model_provider_prefixes[self.ModelProviders[node["data"]["model_provider"]]]
                node["data"]["model_tools"] = [[self.Tools[tool]["function_name"], self.Tools[tool]["tool_name"].replace(' ', '_').replace('\n', '\\n')] for tool in node["data"]["model_tools"]]

                # refactor custom output for easier parsing
                datatype_strings = ["float | int", "str", "bool"]
                
                for key, value in node["data"]["output_structure"].items():
                    node["data"]["output_structure"][key][0] = datatype_strings[value[0]]
                    if value[1] != None:
                        node["data"]["output_structure"][key][1] = self.curate_string(value[1])

                for guardrail in node["data"]["guardrails"]:
                    guardrail[0] = self.render_condition(guardrail[0], external_input = True) # replace the condition list with a pair [condition_string, user_input_variables]
                    if len(guardrail) == 3: # third element corresponds to the feedback
                        guardrail[2] = self.process_rich_input(guardrail[2], external_input = True)

                if node["data"]["enabled_handoffs"]:
                    node["data"]["handoff_prompt"] = self.process_rich_input(node["data"]["handoff_prompt"])
                    node["data"]["handoff_description"] = self.curate_string(node["data"]["handoff_description"]) if node["data"]["handoff_description"] else ""

                    # refactor custom output and input for easier parsing
                    datatype_strings = ["float | int", "str", "bool"]

                    for key, value in node["data"]["handoff_input_structure"].items():
                        node["data"]["handoff_input_structure"][key][0] = datatype_strings[value[0]]
                        if (value[1] != None):
                            node["data"]["handoff_input_structure"][key][1] = self.curate_string(value[1])
                # add a list with all the input variables received by the agent. The variables are not necessary all used by the agent
                node["data"]["input"] = self.extract_input(data, node) if node["data"]["enabled_handoffs"] == False else node["data"]["handoff_input_structure"]
        

            if node["type"] == "function":
                for action in node["data"]["actions"]:
                    action[1] = self.render_action(action[1], state[action[0]][0]) # replace the action list with a pair [action_string, user_input_variables]
            if node["type"] == "router":
                for i, condition in enumerate(node["data"]["conditions"]):
                    node["data"]["conditions"][i] = self.render_condition(condition) # replace the condition list with a pair [condition_string, user_input_variables]

        # refactor state
        datatype_strings = ["float | int", "str", "bool"]
        fields_needing_input = {}
        for key, value in state.items():
            if value[1] == self.StateVariableDefaultValueSources["USERINPUT"]:
                fields_needing_input[key] = value[0] # save field name and datatype
            if value[0] == self.DataTypes["STR"] and value[1] == self.StateVariableDefaultValueSources["HARDCODED"] and value[2] != None: # add quotes to hardcoded strings
                value[2] = "\"" + value[2] + "\""
            value[0] = datatype_strings[value[0]] # replace the datatype int identifier with a string
        data["state"] = state
        startNode["data"]["fields_needing_input"] = fields_needing_input

        # add agents
        # agents must be instantiated separately from the agent node functions to mantain persistance and allow for callbacks
        data["agents"] = []
        for node in data["nodes"]:
            if node["type"] == "agent":
                data["agents"].append(node)
            
        data["tools"] = self.Tools

        return data
    
def generate_code(nodes, api_keys, target_dir, target_script):   
    generator = PydanticAIGenerator(os.path.join(current_dir, 'templates/'))
    generator.generate_code("global.txt", nodes, target_dir, target_script)
    generator.generate_env(api_keys, target_dir)

if __name__ == "__main__":
    nodes = test_flows.manager["nodes"]
    api_keys = test_flows.manager["api_keys"]
    generate_code(nodes, api_keys, current_dir, 'test_script.py')