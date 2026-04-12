
# temporary fix: add parent directory to python path
import sys
import os
current_dir = os.path.dirname(__file__)
sys.path.append(os.path.abspath(os.path.join(current_dir, '..')))

import test_flows
from CodeGenerator import CodeGenerator

class CrewAIGenerator(CodeGenerator):
    # maps the tool name used in the frontend to the tool's class name
    tool_function_names = {
        "Internet Search" : "InternetSearchTool",
        "Calculator" : "CalculatorTool",
        "Translator" : "TranslatorTool",
    }

    # the llm is a string of the form "provider_suffix/model_name"
    model_provider_prefixes = {
        "OpenAI" : "openai", 
        "Google" : "gemini", 
        "Groq" : "groq", 
    }

    embedding_model_provider_prefixes = {
        "OpenAI" : "openai", 
        "Google" : "google", 
        "Groq" : "groq", 
        "Meta" : "meta"
    }
    
    def __init__(self, templates_dir):
        render_state_var = staticmethod(lambda field: f"self.state.{field}")
        render_external_state_var = staticmethod(lambda field: f"flow.state.{field}")
        render_input_var = staticmethod(lambda field: f"self.input[\'{field}\']")
        render_external_input_var = staticmethod(lambda field: f"input[\'{field}\']")
        render_output_var = staticmethod(lambda field: f"output[\'{field}\']")

        super().__init__(templates_dir, render_state_var, render_external_state_var, render_input_var, render_external_input_var, render_output_var)

    def rich_input_uses_variables(self, tokens):
        for token in tokens:
            if token[0] == self.RichInputTokenTypes["STATEVAR"] or token[0] == self.RichInputTokenTypes["INPUTVAR"]:
                return True
        return False
    
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
                    if predecessor["type"] == "start" and predecessor["successors"] == node["id"]:
                        node["predecessors"].append("\"start" + "\"")
                    elif predecessor["type"] == "function" and predecessor["successors"] == node["id"]:
                        node["predecessors"].append("\"function_" + predecessor["id"] + "\"")
                    elif predecessor["type"] == "agent" and predecessor["successors"] == node["id"]:
                        node["predecessors"].append("\"agent_" + predecessor["id"] + "\"")
                    elif predecessor["type"] == "router" and node["id"] in predecessor["successors"]:
                        node["predecessors"].append("\"evt_" + node["id"] + "\"") # we need the template to display the "

            # process rich input in agent prompts, and refactor custom_output for easier parsing
            if node["type"] == "agent":
                # detect variables in goal, role and backstory
                requires_reset = False
                if self.rich_input_uses_variables(node["data"]["goal"]):
                    requires_reset = True
                elif self.rich_input_uses_variables(node["data"]["role"]):
                    requires_reset = True
                elif self.rich_input_uses_variables(node["data"]["backstory"]):
                    requires_reset = True
                node["requires_reset"] = requires_reset # if True, agent must be re-created every run to update the variables' values

                # process rich input
                node["data"]["prompt"] = self.process_rich_input(node["data"]["prompt"])
                node["data"]["role"] = self.process_rich_input(node["data"]["role"], external_state=True, external_input=True)
                node["data"]["goal"] = self.process_rich_input(node["data"]["goal"], external_state=True, external_input=True)
                node["data"]["backstory"] = self.process_rich_input(node["data"]["backstory"], external_state=True, external_input=True)

                for i in range(len(node["data"]["knowledge_sources"])):
                    node["data"]["knowledge_sources"][i][0] = self.curate_string(node["data"]["knowledge_sources"][i][0])
                    node["data"]["knowledge_sources"][i][1] = self.curate_string(node["data"]["knowledge_sources"][i][1])

                # refactor model info
                node["data"]["model_name"] = self.ModelNames[node["data"]["model_provider"]][node["data"]["model_name"]]
                node["data"]["model_provider"] = self.model_provider_prefixes[self.ModelProviders[node["data"]["model_provider"]]]
                node["data"]["model_tools"] = [self.Tools[tool]["function_name"].replace(' ', '_').replace('\n', '\\n') for tool in node["data"]["model_tools"]]

                # refactor custom output for easier parsing
                datatype_strings = ["float | int", "str", "bool"]
                
                for key, value in node["data"]["output_structure"].items():
                    node["data"]["output_structure"][key][0] = datatype_strings[value[0]]
                    if value[1] != None:
                        node["data"]["output_structure"][key][1] = self.curate_string(value[1])

                for guardrail in node["data"]["guardrails"]:
                    guardrail[0] = self.render_condition(guardrail[0], external_state=True, external_input = True) # replace the condition list with a pair [condition_string, user_input_variables]
                    if len(guardrail) == 3: # third element corresponds to the feedback
                        guardrail[2] = self.process_rich_input(guardrail[2], external_input = True)

                if node["data"]["enabled_handoffs"]:
                    node["data"]["handoff_prompt"] = self.process_rich_input(node["data"]["handoff_prompt"], external_state=True, external_input=True)
                    node["data"]["handoff_description"] = self.curate_string(node["data"]["handoff_description"]) if node["data"]["handoff_description"] else ""

                    # refactor custom output and input for easier parsing
                    datatype_strings = ["float | int", "str", "bool"]

                    for key, value in node["data"]["handoff_input_structure"].items():
                        node["data"]["handoff_input_structure"][key][0] = datatype_strings[value[0]]
                        if (value[1] != None):
                            node["data"]["handoff_input_structure"][key][1] = self.curate_string(value[1]) 
                
            if node["type"] == "function":
                for action in node["data"]["actions"]:
                    action[1] = self.render_action(action[1], state[action[0]][0]) # replace the action list with a pair [action_string, user_input_variables]
            if node["type"] == "router":
                for i, condition in enumerate(node["data"]["conditions"]):
                    node["data"]["conditions"][i] = self.render_condition(condition) # replace the condition list with a pair [condition_string, user_input_variables]

        # refactor the state for ease of use in the template
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
    print("Generating code for CrewAI... in directory: ", target_dir, " and script: ", target_script)
    generator = CrewAIGenerator(os.path.join(current_dir, 'templates/'))
    generator.generate_code("global.txt", nodes, target_dir, target_script)
    generator.generate_env(api_keys, target_dir)

if __name__ == "__main__":
    nodes = test_flows.chatbot["nodes"]
    api_keys = test_flows.manager["api_keys"]
    generate_code(nodes, api_keys, current_dir, 'test_script.py')