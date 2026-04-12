from abc import ABC, abstractmethod
from jinja2 import Environment, FileSystemLoader, StrictUndefined, Template
import json

import sys
import os
current_dir = os.path.dirname(__file__)


class CodeGenerator(ABC):
    # functions to render variables, used when rendering conditions and actions
    render_state_var = None
    render_external_state_var = None
    render_input_var = None
    render_external_input_var = None
    render_output_var = None


    def load_global_data(self):
        """
        Loads global data into the generator. This data should be the same for all frameworks.
        """
        file_path = os.path.join(current_dir, '../../logic_enums.json')
        with open(file_path, 'r') as f:
            logic_data = json.load(f)
        file_path = os.path.join(current_dir, '../../model_data.json')
        with open(file_path, 'r') as f:
            model_data = json.load(f)
        file_path = os.path.join(current_dir, '../../tool_data.json')
        with open(file_path, 'r') as f:
            tool_data = json.load(f)

        self.DataTypes = logic_data['DataTypes']
        self.StateVariableDefaultValueSources = logic_data['StateVariableDefaultValueSources']
        self.RichInputTokenTypes = logic_data['RichInputTokenTypes']
        self.TokenTypes = logic_data['TokenTypes']
        self.Operators = logic_data['Operators']
        self.TruthyStrings = logic_data['TruthyStrings']
        self.FalsyStrings = logic_data['FalsyStrings']

        self.ModelProviders = model_data['ModelProviders']
        self.ModelNames = model_data['ModelNames']
        #self.EmbeddingProviders = model_data['EmbeddingProviders']
        #self.EmbeddingModelNames = model_data['EmbeddingModelNames']
        self.KnowledgeSourceTypes = model_data['KnowledgeSourceTypes']
        self.APIKeysNeeded = model_data['APIKeysNeeded']
        # names for the api keys used in the .env file
        self.APIKeyCodes = model_data['APIKeyCodes']

        self.Tools = tool_data['Tools']

        self.operator_templates = {
        'ADD' : "{{operand1}} + {{operand2}}",
        'SUB' : "{{operand1}} - {{operand2}}",
        'MULT' : "{{operand1}} * {{operand2}}",
        'DIV' : "{{operand1}} / {{operand2}}",
        'MOD' : "{{operand1}} % {{operand2}}",
        'LEN_CHAR' : "len({{operand1}})",
        'LEN_WORD' : "len({{operand1}}.split())",
        'GT' : "{{operand1}} > {{operand2}}",
        'LT' : "{{operand1}} < {{operand2}}",
        'GEQ' : "{{operand1}} >= {{operand2}}",
        'LEQ' : "{{operand1}} <= {{operand2}}",
        'EQ' : "{{operand1}} == {{operand2}}",
        'NEQ' : "{{operand1}} != {{operand2}}",
        'EMPTY' : "len({{operand1}}) == 0",
        'OR' : "{{operand1}} or {{operand2}}",
        'AND' : "{{operand1}} and {{operand2}}"
        }
        
    def render_condition(self, condition, external_state = False, external_input = False):
        """
        Returns the string corresponding to the condition. The logic is too complex to be done directly in jinja. 
        The returned string contains only the condition evaluation line. Not "if" or ":".
        Returns a dict of {variable_name: [type, prompt]} for user input variables used
        """
        # print(condition)
        user_input_variables = {}
        def renderOperand(index, expected_op_type):
            """
            Returns the string corresponding to the operand at position index in the condition. 
            op_type is the type of the operand. Returns the string and the index of the next operand.
            """
            # print(condition[index])
            op_type = condition[index][0]
            op_value = condition[index][1]

            if (op_type == self.TokenTypes["HARDCODED"]): 
                if (expected_op_type == self.DataTypes["STR"]):
                    return [f"\'{op_value}\'", index + 1]
                return [op_value, index + 1]
        
            if (op_type == self.TokenTypes["STATEVAR"]):  
                if (external_state):
                    return [self.render_external_state_var(op_value), index + 1]
                return [self.render_state_var(op_value), index + 1] 

            if (op_type == self.TokenTypes["INPUTVAR"]):   
                if (external_input):
                    return [self.render_external_input_var(op_value), index + 1]
                return [self.render_input_var(op_value), index + 1] 
            
            if (op_type == self.TokenTypes["OUTPUTVAR"]):   
                return [self.render_output_var(op_value), index + 1] 
            
            if (op_type == self.TokenTypes["USERINPUT"]):  
                variable_name = f"input_{len(user_input_variables)}"
                prompt_string = self.process_rich_input(op_value)
                user_input_variables[variable_name] = [expected_op_type, prompt_string]
                return [variable_name, index + 1]
            
        
            # the operand is an operator
            next_index = index + 1 # index where the next operand subtree starts in the condition list
            operator_template = Template(self.operator_templates[op_value])

            operand_strs = {}
            operand_n = 1 # index of the next operand to be read (1-indexed). Used for template variable names

            for element in self.Operators[op_value]["structure"]:
                if (isinstance(element, str)):
                    continue

                else:
                    [operand_str, next_index] = renderOperand(next_index, element) 
                    operand_strs["operand" + str(operand_n)] = operand_str
                    operand_n += 1

            operator_str = f"({operator_template.render(operand_strs)})"
            return [operator_str, next_index]
        

        return renderOperand(0, self.DataTypes["BOOL"])[0], user_input_variables

    def render_action(self, action, expected_result_type):
        """
        Returns the string corresponding to the action. The logic is too complex to be done directly in jinja. 
        Returns a dict of {variable_name: [type, prompt]} for user input variables used
        """
        # print("Action: ", action)
        user_input_variables = {}
        def renderOperand(index, expected_op_type):
            """
            Returns the string corresponding to the operand at position index in the condition. 
            op_type is the type of the operand. Returns the string and the index of the next operand.
            """
            # print("Operand: ", action[index])

            op_type = action[index][0]
            op_value = action[index][1]

            if (op_type == self.TokenTypes["HARDCODED"]): 
                if (expected_op_type == self.DataTypes["STR"]):
                    return [f"\'{op_value}\'", index + 1]
                return [op_value, index + 1]

            if (op_type == self.TokenTypes["STATEVAR"]):   
                return [self.render_state_var(op_value), index + 1] 

            if (op_type == self.TokenTypes["INPUTVAR"]):   
                return [self.render_input_var(op_value), index + 1] 

            if (op_type == self.TokenTypes["USERINPUT"]):  
                variable_name = f"input_{len(user_input_variables)}"
                prompt_string = self.process_rich_input(op_value)
                user_input_variables[variable_name] = [expected_op_type, prompt_string]
                return [variable_name, index + 1]
            
            # the operand is an operator
            next_index = index + 1 # index where the next operand subtree starts in the condition list
            operator_template = Template(self.operator_templates[op_value])

            operand_strs = {}
            operand_n = 1 # index of the next operand to be read (1-indexed). Used for template variable names

            for element in self.Operators[op_value]["structure"]:
                if (isinstance(element, str)):
                    continue

                else:
                    [operand_str, next_index] = renderOperand(next_index, element) 
                    operand_strs["operand" + str(operand_n)] = operand_str
                    operand_n += 1

            operator_str = f"({operator_template.render(operand_strs)})"
            return [operator_str, next_index]
        
        return renderOperand(0, expected_result_type)[0], user_input_variables
    
    def get_and_parse_user_input(self, data_type, var_name, prompt):
        """Prompt should be a string containing a correctly formatted python string"""
        print("Data type: ", data_type, "Var name: ", var_name, "Prompt: ", prompt)
        if data_type == self.DataTypes["STR"]:
            template = self.environment.get_template("get_string_input.txt")
        elif data_type == self.DataTypes["NUM"]:
            template = self.environment.get_template("get_number_input.txt")
        elif data_type == self.DataTypes["BOOL"]:
            template = self.environment.get_template("get_bool_input.txt") 

        return template.render({"var_name": var_name, "prompt": prompt})
    
    def curate_string(self, string):
        """
        Escapes dangerous characters that could cause syntax errors or code injections.
        The returned string includes quotes.
        """
        return json.dumps(string)
    
    def process_rich_input(self, tokens, external_state = False, external_input = False) -> str:
        """
        Returns the python code that renders the rich input with its tokens.
        external_state flag determines whether to use render_state_var or render_external_state_var 
        """
        curated_list = []

        for token in tokens:
            if (token[0] == self.RichInputTokenTypes["STRING"]):
                curated_list.append(self.curate_string(token[1]))

            elif (token[0] == self.RichInputTokenTypes["STATEVAR"]):
                if (external_state):
                    curated_list.append(f"str({self.render_external_state_var(token[1])})")
                else:
                    curated_list.append(f"str({self.render_state_var(token[1])})")

            elif (token[0] == self.RichInputTokenTypes["INPUTVAR"]):
                if (external_input):
                    curated_list.append(f"str({self.render_external_input_var(token[1])})")
                else:
                    curated_list.append(f"str({self.render_input_var(token[1])})")

            elif (token[0] == self.RichInputTokenTypes["OUTPUTVAR"]):
                curated_list.append(f"str({self.render_output_var(token[1])})")

        string = "\"\""
        for token in curated_list:
            string += " + " + token
        return string

    """
    For strings containing numbers or booleans, parse the string to the corresponding type.
    Function assumes that the string contains a value that can be parsed into the corresponding type
    """
    def parse_typed_string(self, string, type):
        if (type == self.DataTypes["NUM"]):
            return float(string)
        elif (type == self.DataTypes["BOOL"]):
            if string in self.TruthyStrings:
                return True
            else:
                return False
        else:
            return string
        
    def refactor_flow_data(self, data):
        pass

    def __init__(self, templates_dir, render_state_var, render_external_state_var, render_input_var, render_external_input_var, render_output_var):
        self.environment = Environment(
            loader=FileSystemLoader([templates_dir, os.path.join(current_dir, "shared_templates/")]),
            undefined=StrictUndefined,
            trim_blocks=True,   
            lstrip_blocks=True
            )
        # the render_condition and render_action functions are added to the environment and can be called from within the templates
        self.environment.globals['render_condition'] = self.render_condition
        self.environment.globals['render_action'] = self.render_action
        self.environment.globals['get_and_parse_user_input'] = self.get_and_parse_user_input

        self.render_state_var = render_state_var
        self.render_external_state_var = render_external_state_var
        self.render_input_var = render_input_var
        self.render_external_input_var = render_external_input_var
        self.render_output_var = render_output_var

        self.load_global_data()
        
    
    def add_function_to_env(self, function_name, function):
        """
        Adds function to the environment so it can be called from within the templates
        """
        self.environment.globals[function_name] = function

    def generate_code(self, main_template_file, data, dir_name, script_name):
        """
        Renders the main template with the data, and writes it to a script.
        """
        global_template = self.environment.get_template(main_template_file)
        data = self.refactor_flow_data(data)
        print(data)
        with open(f"{dir_name}/{script_name}", mode="w", encoding="utf-8") as f:
            content = global_template.render(data)
            f.write(content)

    def generate_env(self, api_keys, dir_name):
        """
        Generates .env file with api keys
        """
        with open(f"{dir_name}/.env", mode="w", encoding="utf-8") as f:
            template = "" \
            "{% for key in APIKeysNeeded %}" \
            "{{api_key_codes[key]}}=\"{{api_keys[key]}}\"\n" \
            "{% endfor %}"
            template = Template(template)
            content = template.render({"APIKeysNeeded": self.APIKeysNeeded, "api_key_codes": self.APIKeyCodes, "api_keys": api_keys})
            f.write(content)

"""
To generate code for a different framework:
1. Create a subclass of CodeGenerator that:
    1.1. Provides render_state_var, render_external_state_var, render_input_var, render_output_var functions when calling CodeGenerator.__init__
    1.2. Optionally, overrides the refactor_flow_data function to make the necessary adjustments to the data that allow for simpler templates
2. Put all templates in a directory
3. Optionally, call add_function_to_env to provide new environment functions that can be called from within the templates. render_action and render_condition are supported by default
4. Call generate_code
5. Optionally, call generate_env
"""
