import requests
import ast
import operator

def wikipedia_tool_core(topic: str) -> str:
    endpoint = 'search/page'
    base_url = 'https://en.wikipedia.org/w/rest.php/v1/'

    # See https://www.mediawiki.org/wiki/API:REST_API#Client_identification
    headers = {'User-Agent': 'Agent Builder app'}

    url = base_url + endpoint
    response = requests.get(url, headers=headers, params={'q': topic, 'limit': 1})
    data = response.json()

    page = data['pages'][0]
    url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + page['key']
    response = requests.get(url, headers=headers)
    data = response.json()
    return data['extract']


def math_tool_core(operation: str) -> str:
    # 1. Map AST nodes to actual Python math operations
    allowed_operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.BitXor: operator.pow, # Sometimes LLMs use ^ for exponents
        ast.USub: operator.neg    # For negative numbers like -5
    }

    # 2. Recursive function to evaluate the tree nodes
    def evaluate_node(node):
        if isinstance(node, ast.Constant): # It's a number
            if not isinstance(node.value, (int, float)):
                raise TypeError("Only numbers are allowed.")
            return node.value
            
        elif isinstance(node, ast.BinOp):  # It's an operation like 5 + 5
            left_val = evaluate_node(node.left)
            right_val = evaluate_node(node.right)
            op_type = type(node.op)
            
            if op_type not in allowed_operators:
                raise TypeError(f"Unsupported operator: {op_type.__name__}")
                
            return allowed_operators[op_type](left_val, right_val)
            
        elif isinstance(node, ast.UnaryOp): # It's a unary operation like -5
            operand_val = evaluate_node(node.operand)
            op_type = type(node.op)
            
            if op_type not in allowed_operators:
                raise TypeError(f"Unsupported unary operator: {op_type.__name__}")
                
            return allowed_operators[op_type](operand_val)
            
        else:
            raise TypeError(f"Unsupported syntax: {type(node).__name__}")

    # 3. Parse and execute
    try:
        # ast.parse with mode='eval' ensures it's a single expression, not arbitrary code
        tree = ast.parse(operation, mode='eval')
        result = evaluate_node(tree.body)
        return {"status": "success", "result": result}
        
    except SyntaxError:
        return {"status": "error", "message": "Invalid mathematical syntax."}
    except ZeroDivisionError:
        return {"status": "error", "message": "Cannot divide by zero."}
    except Exception as e:
        return {"status": "error", "message": str(e)}