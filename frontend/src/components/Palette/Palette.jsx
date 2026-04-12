import { useState, useCallback, useRef } from 'react';
import { ReactFlow, useReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodeEditMenu } from '../NodeEditMenu/NodeEditMenu';
import { NodeSelectMenu } from '../NodeSelectMenu/NodeSelectMenu';
import { AgentNode } from '../AgentNode/AgentNode';
import { RouterNode } from '../RouterNode/RouterNode';
import { FunctionNode } from '../FunctionNode/FunctionNode';
import { StartNode } from '../StartNode/StartNode';
import { EndNode } from '../EndNode/EndNode';
import { DataTypes, TokenTypes, RichInputTokenTypes, StateVariableDefaultValueSources } from '../../logic';
import { ApiKeysMenu } from '../ApiKeysMenu/ApiKeysMenu';
import { APIKeysNeeded } from '../../models';
import axios from 'axios';
import { ExecutionTerminal } from '../ExecutionTerminal/ExecutionTerminal';
import { LoginMenu } from '../LoginMenu/LoginMenu';
import { SavedFlowsMenu } from '../SavedFlowsMenu/SavedFlowsMenu';

axios.defaults.baseURL = 'http://localhost:8000';
axios.interceptors.request.use( // automatically add auth token header to requests
  (config) => {
    const token = localStorage.getItem('token');
    
    // If token exists, inject it into the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const initialNodes = [
  { id: 'start', type: 'start', position: { x: 0, y: 100 }, deletable: false, data: {name: 'Start', state: {mynum: [DataTypes.NUM, StateVariableDefaultValueSources.HARDCODED, 0], mystr: [DataTypes.STR, StateVariableDefaultValueSources.HARDCODED, 'hello world']}, knowledge_sources: []} },
];

const nodeTypes = {
  agent: AgentNode,
  router: RouterNode,
  function: FunctionNode,
  start: StartNode,
  end: EndNode
};
 
export function Palette() {
  const [nodes, setNodes] = useState(initialNodes); // list of nodes
  const [edges, setEdges] = useState([]); // list of edges
  const [editingNode, setEditingNode] = useState(null); // node in NodeEditMenu
  const [rfInstance, setRfInstance] = useState(null); // reference to the flow, used to export it
  const [apiKeys, setApiKeys] = useState(() => { // function runs only once during first render
    const emptyApiKeys = {}
    for (const key of APIKeysNeeded) {
      emptyApiKeys[key] = ""
    }
    return emptyApiKeys;
  });
  const [openExecutionTerminal, setOpenExecutionTerminal] = useState(false);
  const [openLoginMenu, setOpenLoginMenu] = useState(false);
  const [openApiKeysMenu, setOpenApiKeysMenu] = useState(false);
  const [openSavedFlowsMenu, setOpenSavedFlowsMenu] = useState(false);

  const [selectedFramework, setSelectedFramework] = useState("");

  const [currentUser, setCurrentUser] = useState("");

  const totalNodeCount = useRef(1);

  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => {
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot));
      onConnectUpdateNodeData(params);
      onConnectInputUpdate(params);
    },
    [onConnectInputUpdate],
  );

  function focusNode(focusedNode) {
    if (editingNode) {
      const nodeId = editingNode.id;
      updateNodeData(nodeId, {editing: false});
    }
    updateNodeData(focusedNode.id, {editing: true});
    setEditingNode(focusedNode);
  }

  function addAgentNode(position = {x: 0, y: 0}) {
    const newNode = { id: 'n' + totalNodeCount.current++, type: 'agent', position: position, data: {handlePositions: "left-right", name: 'Agent', logging: true, max_attempts: 5, prompt: [], role: [], goal: [], backstory: [], model_provider: -1, model_name: '', model_tools: [], has_memory: false, uses_custom_output_structure: false, output_structure: {agent_response: [DataTypes.STR, null]}, guardrails: [], knowledge_sources: [], handoffs: [], connected: false, enabled_handoffs: false, handoff_description: null, handoff_input_structure: {}, uses_custom_handoff_prompt: false, handoff_prompt: [], input_schema: {}}};
    console.log("New node: ", newNode);
    setNodes([...nodes, newNode]);
    focusNode(newNode);
  }

  function addRouterNode(position = {x: 0, y: 0}) {
    const newNode = { id: 'n' + totalNodeCount.current++, type: 'router', position: position, data: {handlePositions: "left-right", connected: false, name: 'Router', nconditions: 1, conditions: [[]], output_structure: {}, input_schema: {}} };
    console.log("New node: ", newNode);
    setNodes([...nodes, newNode]);
    focusNode(newNode);
  }
  
  function addFunctionNode(position = {x: 0, y: 0}) {
    const newNode = { id: 'n' + totalNodeCount.current++, type: 'function', position: position, data: {handlePositions: "left-right", connected: false, name: 'Action', nactions: 1, actions: [[undefined, []]], output_structure: {}, input_schema: {}} };
    console.log("New node: ", newNode);
    setNodes([...nodes, newNode]);
    focusNode(newNode);
  }

  function addEndNode(position = {x: 0, y: 0}) {
    const newNode = { id: 'n' + totalNodeCount.current++, type: 'end', position: position, data: {connected: false, name: 'End', output_structure: {}, input_schema: {}} };
    console.log("New node: ", newNode);
    setNodes([...nodes, newNode]);
    focusNode(newNode);
  }
  
  function updateNodeData(nodeId, update) {
    setNodes((nodes) => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data:{ ...node.data, ...update}};
        }
        return node;
      });
    });
  }

  function onNodesDelete(deletedNodes) {
    setEditingNode(null);
    for (const node of deletedNodes) {
      if (node.type === "agent" && node.data.enabled_handoffs) {
        removeAsHandoff(node.id);
      }
    }
  }

  /*Node drag and drop*/
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event) => {
    event.preventDefault();

    // Project the screen coordinates to the React Flow canvas coordinates
    // This ensures the node drops exactly where the mouse is, regardless of zoom or pan
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Get the node type we attached in the Sidebar
    const type = event.dataTransfer.getData('application/reactflow');

    switch (type) {
      case 'agent':
        addAgentNode(position);
        break;
      case 'router':
        addRouterNode(position);
        break;
      case 'function':
        addFunctionNode(position);
        break;
      case 'end':
        addEndNode(position);
        break;
    }
  };

  /**
   * 
   * @param {*} edgesToIgnore a list of the deleted edges, used when calling this function after deleting an edge
   * @param {*} newConnection a new connection, used when calling this function after creating an edge
   * @param {*} overrides {node_id: output_structure} dict for overriding the output structure stored in the component state. Used when calling this function after modifying a node's output structure
   * @returns 
   */
  function getNodeInputSchema(nodeId, edgesToIgnore = [], newConnection = null, overrides = {}) {
    // console.log("Getting input schema for node ", nodeId, "with overrides ", overrides);
    function computeSchemaIntersection(schemas) {
      const referenceSchema = schemas[0];
    
      const intersection = Object.keys(referenceSchema)
        .filter(key => {
          // check every schema has the field with the same datatype
          return schemas.every(s => (s[key]?.[0] ?? null) === referenceSchema[key][0]);
        })
        .reduce((intersection, key) => {
          intersection[key] = referenceSchema[key];
          return intersection;
        }, {});
      return intersection;
    }

    const edgeIdsToIgnore = edgesToIgnore.map(e => e.id);
    const incomingEdges = edges.filter(e => !edgeIdsToIgnore.includes(e.id) && e.target === nodeId); // node id of the predecessor

    if (newConnection) {
      incomingEdges.push(newConnection); // newConnection is not an edge, but has the source and target attributes
    }

    if (incomingEdges.length === 0) {
      return {};
    } 
      
    const incomingNodeIds = incomingEdges.map(e => e.source);
    const predecessorNodes = nodes.filter(n => incomingNodeIds.includes(n.id));
    const schemas = predecessorNodes.map(n => overrides[n.id] ?? (n.type == "start" ? {} : n.data.output_structure));
    if (schemas.length === 1) { // shortcut to avoid computing intersection
      return {...schemas[0]}; // Important: make a copy, don't assign the reference
    }

    return computeSchemaIntersection(schemas);
  }

  /**
   * Removes operands and tokens using deleted input fields. Propagates chnages to successor nodes
   */
  function changeNodeInputSchema(nodeId, newInputSchema) {
    /**
     * @returns True if the node's output structure was changed, so the successor nodes should also be updated 
     */
    function changeIndividualNodeInputSchema(nodeId, newInputSchema) {
      console.log("Changing input schema for node ", nodeId,  "to ", newInputSchema);

      const node = nodes.find(node => node.id === nodeId);
      console.log(node);
      const oldInputSchema = node.data.input_schema; // used to check if there have been type changes
      const keysToDelete = Object.keys(oldInputSchema).filter(key => !(key in newInputSchema) || oldInputSchema[key][0] !== newInputSchema[key][0]);
      console.log("Keys to delete: ", keysToDelete, " old input schema: ", oldInputSchema, " new input schema: ", newInputSchema);

      if (keysToDelete.length === 0) {
        node.data.input_schema = newInputSchema;
        return false;
      }

      function updateInputFieldsFromCondition(condition) {
        for (const token of condition) {
          if (token[0] == TokenTypes.INPUTVAR && keysToDelete.includes(token[1])) {
            token[0] = TokenTypes.UNKNOWN;
          }
        }  
      }

      function updateInputFieldsFromAction(action) {
        for (const token of action) {
          if (token[0] == TokenTypes.INPUTVAR && keysToDelete.includes(token[1])) {
            token[0] = TokenTypes.UNKNOWN;
          }
        }
      }

      function updateInputFieldsFromRichInput(richInput) {
        const keptTokens = richInput.filter(token => !(token[0] == RichInputTokenTypes.INPUTVAR && keysToDelete.includes(token[1])));

        // merge together adjacent string tokens
        let i = 0;
        while (i < keptTokens.length - 1) {
          if (keptTokens[i][0] == RichInputTokenTypes.STRING && keptTokens[i + 1][0] == RichInputTokenTypes.STRING) {
            keptTokens[i][1] += keptTokens[i + 1][1];
            keptTokens.splice(i + 1, 1); // remove i+1-th token
          } else {
            i++;
          }
        }

        richInput.splice(0, richInput.length, ...keptTokens);
      }

      if (node.type === "agent") {
        for (const guardrail of node.data.guardrails) {
          updateInputFieldsFromCondition(guardrail[0]);
        }      

        updateInputFieldsFromRichInput(node.data.role);
        updateInputFieldsFromRichInput(node.data.goal);
        updateInputFieldsFromRichInput(node.data.backstory);
        updateInputFieldsFromRichInput(node.data.prompt);
        updateInputFieldsFromRichInput(node.data.handoff_prompt);
        

        node.data.input_schema = newInputSchema;
        return false;

      } else {
        let outpuStructureModified = false;
        if (node.type === "router") {
          for (const condition of node.data.conditions) {
            updateInputFieldsFromCondition(condition);
          }
        }
        else if (node.type === "function") {
          for (const action of node.data.actions) {
            updateInputFieldsFromAction(action[1]);
          }
        }

        Object.keys(node.data.output_structure).forEach((key) => {
          if (keysToDelete.includes(key)) {
            outpuStructureModified = true;
            delete node.data.output_structure[key];
          }
        });
        
        console.log("Updated input structure for node ", nodeId, ": ", newInputSchema);
        node.data.input_schema = newInputSchema;
        return outpuStructureModified;
      }
    }

    const propagate = changeIndividualNodeInputSchema(nodeId, newInputSchema);
    if (!propagate) {
      return;
    }
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    const nodesToUpdate = outgoingEdges.map(e => e.target);
    const updatedNodes = [nodeId];

    while (nodesToUpdate.length > 0) {
      const nodeId = nodesToUpdate.shift();
      const newSchema = getNodeInputSchema(nodeId);
      const propagate = changeIndividualNodeInputSchema(nodeId, newSchema);
      console.log("Propagate from node ", nodeId, ": ", propagate);
      if (!propagate) {
        continue;
      }
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      const successors = outgoingEdges.map(e => e.target);
      for (const successor of successors) {
        if (!updatedNodes.includes(successor)) {
          nodesToUpdate.push(successor);
        }
      }
      updatedNodes.push(nodeId);
    }
  }

  /**
   * Called when connecting two nodes. Recomputes input schema of target node and updates its used input variables accordingly
   */
  function onConnectInputUpdate(connection) {
    const target = connection.target;
    const newSchema = getNodeInputSchema(target, undefined, connection);
    changeNodeInputSchema(target, newSchema);
  }

  
  /**
   * Called when disconnecting two nodes. Recomputes input schema of target node and updates its used input variables accordingly
   */
  function onEdgesDelete(edges) {
    onDeleteConnectionUpdateNodeData(edges);
    for (const edge of edges) {
      const target = edge.target;
      const newSchema = getNodeInputSchema(target, edges); // when getNodeInputSchema is called, the Flow's list of edges will not have been updated yet.
      changeNodeInputSchema(target, newSchema);
    }
  }

  /**
   * Called when connecting two nodes. Updates the involved nodes' connected status. 
   */
  function onConnectUpdateNodeData(connection) {
    const target = connection.target;
    const targetNode = nodes.find(n => n.id === target);
    if (targetNode.type === "agent") {
      if (!targetNode.data.connected && targetNode.data.enabled_handoffs) {
        console.log("Trick")
        targetNode.data.input_schema = targetNode.data.handoff_input_structure; // this will make the changeNodeInputSchema delete the handoff input variables that were being used
      }
    }
    updateNodeData(target, {connected: true});
    const source = connection.source;
    const sourceNode = nodes.find(n => n.id === source);
    if (sourceNode.type === "agent") {
      if (!sourceNode.data.connected && sourceNode.data.enabled_handoffs) {
        console.log("Trick")
        //sourceNode.data.input_schema = sourceNode.data.handoff_input_structure; // can't do the same trick because onConnectInputUpdate doesn't modify the source node's input schema
        changeNodeInputSchema(source, {}); // remove handoff input variables from the source agent
      }
    }
    updateNodeData(source, {connected: true});
  }

  /**
   * Called when deleting connections. Updates the connected status of nodes involved in the deleted connections
   */
  function onDeleteConnectionUpdateNodeData(deletedEdges) {
    const affectedAgents = new Set();
    for (const edge of deletedEdges) {
      const target = edge.target;
      const targetNode = nodes.find(n => n.id === target);
      if (targetNode.type === "agent") {
        affectedAgents.add(targetNode);
      }
      const source = edge.source;
      const sourceNode = nodes.find(n => n.id === source);
      if (sourceNode.type === "agent") {
        affectedAgents.add(sourceNode);
      }
    }

    for (const agent of affectedAgents) {
      const connectedEdges = edges.filter(e => (e.target === agent.id || e.source === agent.id) && !deletedEdges.some(deletedEdge => deletedEdge.id === e.id));
      if (connectedEdges.length === 0) {
        if (agent.data.connected) {
          agent.data.handoff_input_structure = {};
        }
        updateNodeData(agent.id, {connected: false});
      }
    }
  }

  function getAllHandoffAgents() {
    return nodes.filter(n => n.type === 'agent' && n.data.enabled_handoffs).map(n => [n.id, n.data.name]);
  }

  /**
   * Deletes all edges that have the given handle as source.
   * Used when removing a condition from a router node
   */
  function onHandleDelete(nodeId, handleId) {
    console.log("All edges: ", edges);
    console.log("Deleting edges from node ", nodeId, " with handle ", handleId);
    setEdges((edges) =>
      edges.filter((e) => !(e.source == nodeId && e.sourceHandle == handleId.toString()))
    );

    // decrease source handles for all edges sourcing from the router node with higher handle ids than the deleted one, to avoid leaving gaps in the handle numbering
    setEdges((edges) =>
      edges.map((e) => {
        if (e.source == nodeId && Number(e.sourceHandle) > handleId) {
          return { ...e, sourceHandle: (Number(e.sourceHandle) - 1).toString() };
        }
        return e;
      })
    );
    
  }

  /**
   * Recomputes input schema for the successor nodes(s) and updates their used input variables
   */
  function onModifyNodeOutput(nodeId, newOutputStructure) {
    const node = nodes.find(n => n.id === nodeId);
    // remove output variables from guardrails
    if (node.type === "agent") {
      const oldOutputStructure = node.data.output_structure;
      const keysToDelete = Object.keys(oldOutputStructure).filter(key => !(key in newOutputStructure) || oldOutputStructure[key][0] !== newOutputStructure[key][0]);
      for (const guardrail of node.data.guardrails) {
        const condition = guardrail[0];
        for (const token of condition) {
          if (token[0] == TokenTypes.OUTPUTVAR && keysToDelete.includes(token[1])) {
            token[0] = TokenTypes.UNKNOWN;
          }
        }  
        
      }
    }
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    const successors = outgoingEdges.map(e => e.target);
    for (const successor of successors) {
      const newSchema = getNodeInputSchema(successor, undefined, undefined, {[nodeId]: newOutputStructure});
      changeNodeInputSchema(successor, newSchema);
    }
  }
  /**
   * Resets operands form conditions / actions / guardrails that use the given state fields.
   */
  function removeStateFieldsFromNodes(stateFields) {
  
    function removeStateFieldsFromCondition(condition, stateFields) {
      for (const token of condition) {
        if (token[0] == TokenTypes.STATEVAR && stateFields.includes(token[1])) {
          token[0] = TokenTypes.UNKNOWN;
        }
      }  
    }

    function removeStateFieldsFromAction(action, stateFields) {
      for (const token of action) {
        if (token[0] == TokenTypes.STATEVAR && stateFields.includes(token[1])) {
          token[0] = TokenTypes.UNKNOWN;
        }
      }
    }

    function removeStateFieldsFromRichInput(richInput, stateFields) {
      const keptTokens =richInput.filter(token => !(token[0] == RichInputTokenTypes.STATEVAR && stateFields.includes(token[1])));

      // merge together adjacent string tokens
      let i = 0;
      while (i < keptTokens.length - 1) {
        if (keptTokens[i][0] == RichInputTokenTypes.STRING && keptTokens[i + 1][0] == RichInputTokenTypes.STRING) {
          keptTokens[i][1] += keptTokens[i + 1][1];
          keptTokens.splice(i + 1, 1); // remove i+1-th token
        } else {
          i++;
        }
      }

      richInput.splice(0, richInput.length, ...keptTokens);
    }

    for (const node of nodes) {
      if (node.type === "router") {
        for (const condition of node.data.conditions) {
          removeStateFieldsFromCondition(condition, stateFields);
        }

        return;
      }

      if (node.type === "agent") {
        for (const guardrail of node.data.guardrails) {
          removeStateFieldsFromCondition(guardrail[0], stateFields);
        }      

        removeStateFieldsFromRichInput(node.data.role, stateFields);
        removeStateFieldsFromRichInput(node.data.goal, stateFields);
        removeStateFieldsFromRichInput(node.data.backstory, stateFields);
        removeStateFieldsFromRichInput(node.data.prompt, stateFields);
        removeStateFieldsFromRichInput(node.data.handoff_prompt, stateFields);
        

        return;
      }

      if (node.type === "function") {
        for (const action of node.data.actions) {
          if (stateFields.includes(action[0])) {
            action[0] = undefined;
            action[1] = [];
          }

          else {
            removeStateFieldsFromAction(action[1], stateFields);
          }
        }

        return;
      }

      if (node.type === "end") {
        for (const field of stateFields) {
          delete node.data.output_structure[field];
        }
        
        return;
      }

    }
  }

  /**
   * Called when modifying an agent node's name. Updates handoffs in other nodes to reflect the new name   
   */
  function onRenameAgent(nodeId, newName) {
    const modifiedNode = nodes.find(n => n.id === nodeId);
    if (!modifiedNode.data.enabled_handoffs)
      return;
    for (const node of nodes) {
      if (node.type === "agent") {
        for (const handoff of node.data.handoffs) {
          if (handoff[0] === nodeId) {
            handoff[1] = newName;
          }
        }
      }
    }
  }

  /**
   * Updates all agent nodes to remove the handoff to the agent with the given id
   */
  function removeAsHandoff(nodeId) {
    for (const node of nodes) {
      if (node.type === "agent") {
        const newHandoffs = node.data.handoffs.filter(handoff => handoff[0] !== nodeId);
        node.data.handoffs = newHandoffs;
      }
    }
  }

  function saveToJSON() {
    const flow_data = rfInstance.toObject();
    const nodes = flow_data.nodes;
    const edges = flow_data.edges;

    const keysToRemove = ["position", "deletable", "measured", "selected", "dragging", "editing"];
    const jsonString = JSON.stringify({"nodes" : nodes, "edges" : edges, "api_keys" : apiKeys}, (key, value) => {
      if (keysToRemove.includes(key)) {
        return undefined;
      }

      return value;
    }, 2);
    
    navigator.clipboard.writeText(jsonString)
      .catch(err => {
        console.error("Error al copiar: ", err);
      });
    console.log(jsonString)

    return JSON.parse(jsonString);
  }

  function logOut() {
    localStorage.removeItem("token");
    setCurrentUser("");
  }
  
  function loadFlow(flowData) {
    console.log(flowData)
    setNodes(flowData.nodes || []);
    setEdges(flowData.edges || []);

    if (rfInstance && flowData.viewport) {
      const { x = 0, y = 0, zoom = 1 } = flowData.viewport;
      rfInstance.setViewport({ x, y, zoom });
    }

    let maxNodeId = 0;
    for (const node of flowData.nodes) {
      if (node.id.startsWith("n")) {
        maxNodeId = Math.max(maxNodeId, parseInt(node.id.slice(1)) + 1);
      }
    }
    totalNodeCount.current = maxNodeId;

    setEditingNode(null);
  }


  const defaultEdgeOptions = {
    style: { strokeWidth: 1.25, stroke: '#000000' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#000000',
    },
  };

  // prevent connecting a node to itself
  const isValidConnection = (connection) => connection.source !== connection.target;
  return (
    <>
    {openExecutionTerminal &&
    <ExecutionTerminal framework={selectedFramework} flowData={saveToJSON()} closeTerminal={() => setOpenExecutionTerminal(false)} currentUser={currentUser}/>
    }

    {openLoginMenu && <LoginMenu connection={axios} onLogin={(username) => {setCurrentUser(username); setOpenLoginMenu(false);}} closeMenu={() => setOpenLoginMenu(false)}/>}
    {openSavedFlowsMenu && <SavedFlowsMenu setActiveFlow={loadFlow} connection={axios} closeMenu={() => setOpenSavedFlowsMenu(false)} getCurrentFlow={() => rfInstance.toObject()}/>}
    {openApiKeysMenu && <ApiKeysMenu apiKeys={apiKeys} currentUser={currentUser} connection={axios} setApiKeys={setApiKeys} closeMenu={() => setOpenApiKeysMenu(false)}/>}
    <div className={"w-screen h-screen flex font-sans"}>
      <div className={"w-full h-full border-r-2 border-black relative"}>
        <ReactFlow
          style={{ backgroundColor: '#d8dee9' }}
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={defaultEdgeOptions}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          onNodeClick={(_, node) => focusNode(node)} 
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onDragOver={onDragOver}
          onDrop={onDrop}
          isValidConnection={isValidConnection}
          fitView>
          <Controls />
          <Background />
        </ReactFlow> {/* sometimes, node click is not detected */}
        <span className={"absolute top-4 right-4 flex gap-4 items-center justify-end max-w-[80%] flex-wrap"}> 
          <select className={"py-3 px-8 border border-black rounded cursor-pointer hover:bg-gray-300 transition-colors duration-200"}value={selectedFramework} onChange={(e) => setSelectedFramework(e.target.value)}>
            <option value={''} disabled>Select a framework</option>
            <option value="crewai">CrewAI</option>
            <option value="pydanticai">PydanticAI</option>
          </select>
          <button className={"py-3 px-8 bg-gray-500 hover:bg-gray-400 transition-color duration-200 text-white border border-black rounded cursor-pointer"} 
            onClick={() => setOpenExecutionTerminal(!openExecutionTerminal)}>Run Workflow</button>
          <button className={"py-3 px-8 bg-gray-500 hover:bg-gray-400 transition-color duration-200 text-white border border-black rounded cursor-pointer"} 
            onClick={() => setOpenApiKeysMenu(!openApiKeysMenu)}>Configure Api Keys</button>
          {currentUser && <button className={"py-3 px-8 bg-gray-500 hover:bg-gray-400 transition-color duration-200 text-white border border-black rounded cursor-pointer"} 
                            onClick={() => setOpenSavedFlowsMenu(!openSavedFlowsMenu)}>Save / Load Flows</button>}
          <button className={"py-3 px-8 bg-gray-500 hover:bg-gray-400 transition-color duration-200 text-white border border-black rounded cursor-pointer"}
            onClick={currentUser ? logOut : () => setOpenLoginMenu(!openLoginMenu)}>{currentUser ? "Log Out" : "Log In / Sign Up"}</button>
        </span>
        <NodeSelectMenu/>
      </div>
      <NodeEditMenu node={editingNode ? nodes.find((n) => n.id === editingNode.id) ?? null : null} updateNodeData={updateNodeData} onDeleteStateField={removeStateFieldsFromNodes} onHandleDelete={onHandleDelete} onModifyNodeOutput={onModifyNodeOutput} onRenameAgent={onRenameAgent} removeAsHandoff={removeAsHandoff} getInputSchema={getNodeInputSchema} getFlowState={() => rfInstance.getNode("start").data.state} getAllHandoffAgents={getAllHandoffAgents} /> 
    </div>
    
    </>
  );
}