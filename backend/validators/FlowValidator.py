import os
import json
current_dir = os.path.dirname(__file__)



class FlowValidator: 
    def __init__(self):
        self.load_global_data()

    def load_global_data(self):
        """
        Loads global data into the generator. This data should be the same for all frameworks.
        """
        file_path = os.path.join(current_dir, '../../logic_enums.json')
        with open(file_path, 'r') as f:
            logic_data = json.load(f)

        self.DataTypes = logic_data['DataTypes']
        self.StateVariableDefaultValueSources = logic_data['StateVariableDefaultValueSources']
        self.RichInputTokenTypes = logic_data['RichInputTokenTypes']
        self.TokenTypes = logic_data['TokenTypes']

        self.GuardrailCorrectionsRequiringInput = logic_data['GuardrailCorrectionsRequiringInput']

    def check_incomplete_condition(self, condition):
        """
        Returns True if condition is incomplete (missing tokens or unspecified hardcoded values)
        """
        if (len(condition) == 0):
            return True
        
        for token in condition:
            if (token[0] == self.TokenTypes['UNKNOWN'] or (token[0] == self.TokenTypes['HARDCODED'] and token[1] == None)):
                return True
            
        return False
    

    def check_incomplete_action(self, action):
        if len(action) == 0:
            return True
        

        for token in action:
            if (token[0] == self.TokenTypes['UNKNOWN'] or (token[0] == self.TokenTypes['HARDCODED'] and token[1] == None)):
                return True
        return False
        

    def validate_agent(self, node, edges) -> list[str]:
        data = node['data']
        name = data['name']

        if (not data["connected"]) and (not data["enabled_handoffs"]): # agent isn't used, don't check it
            return []

        # add successor ids
        outgoing_edges = [edge for edge in edges if edge['source'] == node['id']] # edges sourcing from the node
        if (data["connected"]): # if agent is only used for handoffs, it doesn't need to have successors
            if len(outgoing_edges) != 1:
                raise ValueError(f"Agent node {name} must have exactly 1 successor.")
            node['successors'] = outgoing_edges[0]['target']


        # model provider not specified
        if data['model_provider'] == -1:
            raise ValueError(f"Agent node {name} is missing a model provider.")

        # empty output structure
        if data['uses_custom_output_structure'] and not data['output_structure']:
            raise ValueError(f"Agent node {name} uses a custom output structure but it is empty.")

        # guardrails with no specified correction
        if any(guardrail[1] == '' for guardrail in data['guardrails']):
            raise ValueError(f"Agent node {name} has guardrails with no correction selected.")

        # guardrails with incomplete condition
        if any(self.check_incomplete_condition(guardrail[0]) for guardrail in data['guardrails']):
            raise ValueError(f"Agent node {name} has guardrails with incomplete conditions.")

        # guardrails with corrections that require input but no input provided
        if any(
            guardrail[1] in self.GuardrailCorrectionsRequiringInput and (guardrail[2] == None or guardrail[2] == "") 
            for guardrail in data['guardrails']
        ):
            raise ValueError(f"Agent node {name} missing input for guardrail correction.")

        # empty prompt
        if data["connected"] and data['prompt'] == []: 
            raise ValueError(f"Agent node {name} requires a prompt.")

        if data["enabled_handoffs"] and data["uses_custom_handoff_prompt"] and data['handoff_prompt'] == []:
            raise ValueError(f"Agent node {name} can't have an empty handoff prompt.")

        return []

    def validate_router(self, node, edges) -> list[str]:
        data = node['data']
        name = data['name']

        if not data["connected"]: # don't check disconnected nodes
            return []
        
        # router nodes have one successor per handle. Store them in a list, following the same order as the handles
        outgoing_edges = [edge for edge in edges if edge['source'] == node['id']] # edges sourcing from the node
        successors = []
        num_outgoing_edges = 0
        for edge in outgoing_edges:
            handle_idx = int(edge['sourceHandle'])
            
            # Dynamically expand the list with None to handle sparse array behavior like JS
            if handle_idx >= len(successors):
                successors.extend([None] * (handle_idx - len(successors) + 1))
                
            if successors[handle_idx] is not None:
                raise ValueError(f"Router node {name} cannot have multiple outgoing edges from the same handle.")
            
            successors[handle_idx] = edge['target']
            num_outgoing_edges += 1

        if (num_outgoing_edges != data['nconditions'] + 1):
            raise ValueError(f"Router node {name} must have {data['nconditions'] + 1} outgoing edges.")
        node['successors'] = successors

        # check for incomplete conditions
        if len(data['conditions']) == 0:
            raise ValueError(f"Router node {name} must have at least one condition.")

        if any(self.check_incomplete_condition(condition) for condition in data['conditions']):
            raise ValueError(f"Router node {name} has incomplete conditions.")
        
        return []
    
    def validate_function(self, node, edges) -> list[str]:
        data = node['data']
        name = data['name']
        if not data["connected"]: # don't check disconnected nodes
            return []
        # add successor ids
        outgoing_edges = [edge for edge in edges if edge['source'] == node['id']] # edges sourcing from the node
        if len(outgoing_edges) != 1:
            raise ValueError(f"Function node {name} must have exactly 1 successor.")
            
        node['successors'] = outgoing_edges[0]['target']

        # check for incomplete actions
        if len(data['actions']) == 0:
            raise ValueError(f"Function node {name} must have at least one action.")

        if any(action[0] == None or self.check_incomplete_action(action[1]) for action in data['actions']):
            raise ValueError(f"Function node {name} has incomplete actions.")
        
        return []

    def validate_start(self, node, edges) -> list[str]:
        # add successor ids
        outgoing_edges = [edge for edge in edges if edge['source'] == node['id']] # edges sourcing from the node
        if len(outgoing_edges) != 1:
            raise ValueError("Start node must have exactly 1 successor.")
        
        node['successors'] = outgoing_edges[0]['target']

        return []

    def validate_end(self, node, edges) -> list[str]: 
        return []


    def check_incomplete_graph(self, nodes):
        """
        Raises ValueError if the graph is incomplete. This means there are nodes from which no end node is reachable. 
        Function assumes all connected nodes have a successors field.
        """
        # Find the start node. next() with a default of None replicates JS Array.find()
        start_node = next((node for node in nodes if node['type'] == "start"), None)
        reachable_node_ids = set()
        reachable_nodes = []
        queue = [start_node] # holds entire nodes, not ids
        
        while len(queue) > 0:
            node = queue.pop(0)
            reachable_node_ids.add(node['id'])
            reachable_nodes.append(node)
            
            if node['type'] in ["agent", "function", "start"]:
                successor = node['successors'] # agent, function and start nodes have a single successor
                if successor not in reachable_node_ids:
                    successor_node = next((n for n in nodes if n['id'] == successor), None)
                    queue.append(successor_node)
                        
            elif node['type'] == "router":
                for successor in node['successors']:
                    if successor not in reachable_node_ids:
                        successor_node = next((n for n in nodes if n['id'] == successor), None)
                        queue.append(successor_node)
                            
        predecessor_ids = {node['id'] : [] for node in reachable_nodes}
        for node in reachable_nodes:
            if node['type'] in ["agent", "function", "start"]:
                successor = node['successors']
                predecessor_ids[successor].append(node['id'])
            elif node['type'] == "router":
                for successor in node['successors']:
                    predecessor_ids[successor].append(node['id'])

        reachable_end_nodes = [node for node in reachable_nodes if node['type'] == "end"]
        reachable_from_end_nodes_ids = set()
        queue = reachable_end_nodes[:] # copy the list
        while len(queue) > 0:
            node = queue.pop(0)
            reachable_from_end_nodes_ids.add(node['id'])

            for predecessor_id in predecessor_ids[node['id']]:
                if predecessor_id not in reachable_from_end_nodes_ids:
                    predecessor_node = next((n for n in nodes if n['id'] == predecessor_id), None)
                    queue.append(predecessor_node)

        problematic_nodes = [node_id for node_id in reachable_node_ids if node_id not in reachable_from_end_nodes_ids]
        if len(problematic_nodes) > 0:
            raise ValueError(f"All connected nodes must lead to an end node.")
        
    def validate_flow(self, nodes, edges) -> list[str]:
        """
        Validates a flow. Raises ValueError if the flow is invalid.
        Returns list of warning messages.
        Modifies the nodes in place to add successors.
        """
        warnings = []
        for node in nodes:
            if node['type'] == "start":
                new_warnings = self.validate_start(node, edges)
                warnings.extend(new_warnings)
            elif node['type'] == "agent":
                new_warnings = self.validate_agent(node, edges)
                warnings.extend(new_warnings)
            elif node['type'] == "router":
                new_warnings = self.validate_router(node, edges)
                warnings.extend(new_warnings)
            elif node['type'] == "function":
                new_warnings = self.validate_function(node, edges)
                warnings.extend(new_warnings)
            elif node['type'] == "end":
                new_warnings = self.validate_end(node, edges)
                warnings.extend(new_warnings)
        
        self.check_incomplete_graph(nodes)

        return warnings
