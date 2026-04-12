import { useState, useEffect } from 'react'
import { DataTypeNames, DataTypes, DataTypeColors, TokenTypes, RichInputTokenTypes, checkStringDataType, parseStringToDataType } from '../../logic'
import { ModelProviders, ModelNames, Tools } from '../../models'
import { RichInput } from '../RichInput/RichInput'
import { GuardrailEditMenu } from '../GuardrailEditMenu/GuardrailEditMenu'
import { KnowledgeSourceEditMenu } from '../KnowledgeSourceSelectorMenu/KnowledgeSourceEditMenu'
import { ToolTip } from '../ToolTip/ToolTip'
import { Button } from '../Button/Button'
import { TextInput } from '../TextInput/TextInput'
import { CustomSelect } from '../CustomSelect/CustomSelect'



export function AgentNodeEditMenu({ node, getFlowState, getInputSchema, updateNodeData, getAllHandoffAgents, onModifyNodeOutput, onRenameAgent, removeAsHandoff }) {
    const [nodeName, setNodeName] = useState(node.data.name)
    const [customOutputStructure, setCustomOutputStructure] = useState(node.data.uses_custom_output_structure)
    const [localOutputStructure, setLocalOutputStructure] = useState(node.data.output_structure)
    const [prompt, setPrompt] = useState(node.data.prompt)
    const [role, setRole] = useState(node.data.role)
    const [goal, setGoal] = useState(node.data.goal)
    const [backStory, setBackStory] = useState(node.data.backstory)
    const [modelProvider, setModelProvider] = useState(node.data.model_provider)
    const [modelName, setModelName] = useState(node.data.model_name)
    //const [embeddingProvider, setEmbeddingProvider] = useState(node.data.embedding_provider)
    //const [embeddingModelName, setEmbeddingModelName] = useState(node.data.embedding_model_name)
    const [modelTools, setModelTools] = useState(node.data.model_tools)
    const [hasMemory, setHasMemory] = useState(node.data.has_memory)
    const [guardrails, setGuardrails] = useState(node.data.guardrails)
    const [knowledgeSources, setKnowledgeSources] = useState(node.data.knowledge_sources);
    const [handoffs, setHandoffs] = useState(node.data.handoffs);
    const [logging, setLogging] = useState(node.data.logging);
    const [maxAttempts, setMaxAttempts] = useState(node.data.max_attempts);

    const [enabledHandoffs, setEnabledHandoffs] = useState(node.data.enabled_handoffs);
    const [handoffDescription, setHandoffDescription] = useState(node.data.handoff_description);
    const [localHandoffInputStructure, setLocalHandoffInputStructure] = useState(node.data.handoff_input_structure);
    const [usesCustomHandoffPrompt, setUsesCustomHandoffPrompt] = useState(node.data.uses_custom_handoff_prompt);
    const [handoffPrompt, setHandoffPrompt] = useState(node.data.handoff_prompt);

    const flowState = getFlowState(); // ran every render
    const isConnected = node.data.connected; 
    let input = (!isConnected && enabledHandoffs) ? localHandoffInputStructure : getInputSchema(node.id);
    
    const allHandoffAgents = getAllHandoffAgents().filter(([id, name]) => id !== node.id);


    useEffect(() => { // state isn't automatically updated when props change
        setNodeName(node.data.name)
        setLocalOutputStructure(node.data.output_structure)
        setPrompt(node.data.prompt)
        setCustomOutputStructure(node.data.uses_custom_output_structure)
        setRole(node.data.role)
        setGoal(node.data.goal)
        setBackStory(node.data.backstory)
        setModelProvider(node.data.model_provider)
        setModelName(node.data.model_name)
        //setEmbeddingProvider(node.data.embedding_provider)
        //setEmbeddingModelName(node.data.embedding_model_name)
        setModelTools(node.data.model_tools)
        setHasMemory(node.data.has_memory)
        setGuardrails(node.data.guardrails)
        setKnowledgeSources(node.data.knowledge_sources);
        setHandoffs(node.data.handoffs);
        setLogging(node.data.logging);
        setMaxAttempts(node.data.max_attempts);

        setEnabledHandoffs(node.data.enabled_handoffs);
        setHandoffDescription(node.data.handoff_description);
        setLocalHandoffInputStructure(node.data.handoff_input_structure);
        setUsesCustomHandoffPrompt(node.data.uses_custom_handoff_prompt);
        setHandoffPrompt(node.data.handoff_prompt);

        console.log("Read node data: ", node.data)
    }, [node])

    useEffect(() => {
        console.log("Evil useEffect running. isConnected: ", isConnected, "enabledHandoffs: ", enabledHandoffs)
        input = (!isConnected && enabledHandoffs) ? localHandoffInputStructure : getInputSchema(node.id);
        if (isConnected && enabledHandoffs) { // if the agent is connected, the handoff input schema is determined by the node connections
            console.log("Agent is connected, using input schema from connections: ", getInputSchema(node.id))
            updateHandoffInputStructure({...getInputSchema(node.id)});
        } else if (!isConnected && enabledHandoffs) { // if the agent is not connected but enabled as handoff, use the custom handoff input structure
            console.log("Agent disconnected")
        }
    }, [isConnected, enabledHandoffs])

    useEffect(() => {
        console.log("Input schema for node ", node.id, " changed to: ", node.data.input_schema);
        if (isConnected && enabledHandoffs) {
            updateHandoffInputStructure({...node.data.input_schema});
        }
    }, [node.data.input_schema])
    console.log("Node ", node.id, " Connected: ", isConnected, "Input schema: ", input, "Handoff input structure: ", localHandoffInputStructure)


    function updateOutputStructure(update) { // output structure is handled differently than other node data fields because we never want to set it to {}
        setLocalOutputStructure(update);
        updateNodeData(node.id, {output_structure: update, uses_custom_output_structure: true});
        onModifyNodeOutput(node.id, update);
    }

    function updateHandoffInputStructure(update) {
        setLocalHandoffInputStructure(update);
        updateNodeData(node.id, {handoff_input_structure: update});
    }

    function toggleEnabledHandoffs() {
        if (enabledHandoffs) {
            removeAsHandoff(node.id);
        }
        if (enabledHandoffs && !isConnected) { // if disabling handoffs, delete handoff input variables
            deleteHandoffInputVariables(Object.keys(localHandoffInputStructure));
            node.data.handoff_input_structure = {};
        }
        setEnabledHandoffs(!enabledHandoffs);
    }


    function toggleCustomOutputStructure() {
        if (customOutputStructure) { // reset to default
            updateOutputStructure({agent_response: [DataTypes.STR, null]})
            updateNodeData(node.id, {uses_custom_output_structure: false})
        } else {
            setLocalOutputStructure({}) // but don't update the node data
        }
        setCustomOutputStructure(!customOutputStructure);
    }

    function updateGuardrail(index, newGuardrail) {
        let newGuardrails = [...guardrails];
        newGuardrails[index] = newGuardrail;
        setGuardrails(newGuardrails);
    }

    function addGuardrail() {
        setGuardrails([...guardrails, [[], '']])
    }

    function removeGuardrail(index) {
        if (guardrails.length <= 0)
            return;
        setGuardrails(guardrails.slice(0, index).concat(guardrails.slice(index + 1)))
    }

    function updateKnowledgeSource(index, newSource) {
        let newSources = [...knowledgeSources];
        newSources[index] = newSource;
        setKnowledgeSources(newSources);
    }
    
    function addKnowledgeSource(name, content) {
        setKnowledgeSources([...knowledgeSources, [name, content]])
    }

    function removeKnowledgeSource(index) {
        if (knowledgeSources.length <= 0)
            return;
        setKnowledgeSources(knowledgeSources.slice(0, index).concat(knowledgeSources.slice(index + 1)))
    }

    
    useEffect(() => {
        updateNodeData(node.id, {name: nodeName})
        onRenameAgent(node.id, nodeName)
    }, [nodeName])

    useEffect(() => {
        updateNodeData(node.id, {prompt: prompt})
    }, [prompt])

    useEffect(() => {
        updateNodeData(node.id, {role: role})
    }, [role])

    useEffect(() => {
        updateNodeData(node.id, {goal: goal})
    }, [goal])

    useEffect(() => {
        updateNodeData(node.id, {backstory: backStory})
    }, [backStory])

    useEffect(() => {
        updateNodeData(node.id, {model_provider: modelProvider})
    }, [modelProvider])

    useEffect(() => {
        updateNodeData(node.id, {model_name: modelName})
    }, [modelName])

    //useEffect(() => {
    //    updateNodeData(node.id, {embedding_provider: embeddingProvider})
    //}, [embeddingProvider])

    //useEffect(() => {
    //    updateNodeData(node.id, {embedding_model_name: embeddingModelName})
    //}, [embeddingModelName])

    useEffect(() => {
        updateNodeData(node.id, {model_tools: modelTools})
    }, [modelTools])

    useEffect(() => {
        updateNodeData(node.id, {has_memory: hasMemory})
    }, [hasMemory])

    useEffect(() => {
        updateNodeData(node.id, {guardrails: guardrails})
    }, [guardrails])

    useEffect(() => {
        updateNodeData(node.id, {knowledge_sources: knowledgeSources})
    }, [knowledgeSources])

    useEffect(() => {
        updateNodeData(node.id, {handoffs: handoffs})
    }, [handoffs])

    useEffect(() => {
        updateNodeData(node.id, {logging: logging})
    }, [logging])

    useEffect(() => {
        updateNodeData(node.id, {max_attempts: maxAttempts})
    }, [maxAttempts])
    
    useEffect(() => {
        updateNodeData(node.id, {enabled_handoffs: enabledHandoffs})
    }, [enabledHandoffs])

    useEffect(() => {
        updateNodeData(node.id, {handoff_description: handoffDescription})
    }, [handoffDescription])

    useEffect(() => {
        updateNodeData(node.id, {uses_custom_handoff_prompt: usesCustomHandoffPrompt})
        /*if (!usesCustomHandoffPrompt) {
            const {prompt: _, ...rest} = localHandoffInputStructure;
            setLocalHandoffInputStructure(rest);
        } else {
            setLocalHandoffInputStructure({...localHandoffInputStructure, prompt: [DataTypes.STR, "Prompt for the called agent"]})
        }*/
    }, [usesCustomHandoffPrompt])

    useEffect(() => {
        updateNodeData(node.id, {handoff_prompt: handoffPrompt})
    }, [handoffPrompt])

    function deleteHandoffInputVariables(keysToDelete) {
        function updateInputFieldsFromCondition(condition) {
            for (const token of condition) {
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

        for (const guardrail of node.data.guardrails) {
            updateInputFieldsFromCondition(guardrail[0]);
        }      

        updateInputFieldsFromRichInput(node.data.role);
        updateInputFieldsFromRichInput(node.data.goal);
        updateInputFieldsFromRichInput(node.data.backstory);
        updateInputFieldsFromRichInput(node.data.prompt);
        updateInputFieldsFromRichInput(node.data.handoff_prompt);
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="text-3xl text-center">{nodeName}</p>

            <span className="inline-flex items-center gap-2">
                <span>
                    <label className="text-lg">Name: </label> 
                    <ToolTip content={"Name for the node and the agent. This doesn't affect the flow execution."}/>
                </span>
                <TextInput content={nodeName} onSubmit={(t) => setNodeName(t)} />
            </span>

            <span className="inline-flex items-center gap-2">
                <label className="text-lg">Model provider: </label>
                <CustomSelect options = {
                    ModelProviders.map((provider, idx) => ({value: idx, label: 
                        <p key={idx}>{provider}</p>
                    }))
                    }
                    placeholder="Select a provider"
                    onChange={(v) => {
                        setModelProvider(Number(v));
                        setModelName(0);
                    }}
                    value={ModelProviders[modelProvider]}
                />
            </span>

            <span className="inline-flex items-center gap-2">
                <label className="text-lg">Model name: </label>
                <CustomSelect options= {
                    modelProvider != -1 ? 
                    ModelNames[modelProvider].map((name, idx) => ({value: idx, label: 
                        <p key={idx}>{name}</p>
                    }))
                    :
                    [{disabled: true, label: <p>No provider selected</p>}]
                }
                placeholder={"Select a model"}
                onChange={(v) => setModelName(Number(v))}
                value={modelProvider != -1 ? ModelNames[modelProvider][modelName] : undefined}
                />
            </span>

            <div className="inline-flex items-center gap-2">
                <span>
                    <label className="text-lg">Enable memory:</label>
                    <ToolTip content={"If the agent is invoked several times during the same execution, it will remember previous interactions."}/>
                </span>
                <input type="checkbox" checked={hasMemory} onChange={() => setHasMemory(!hasMemory)} />
            </div>

            <div className="inline-flex items-center gap-2">
                <span>
                    <label className="text-lg">Enable logging:</label>
                    <ToolTip content={"If enabled, the agent will print its interactions during the execution."}/>
                </span>
                <input type="checkbox" checked={logging} onChange={() => setLogging(!logging)} />
            </div>

            <div className="my-2">
                <span className="inline-flex gap-2">
                    <p className="text-xl">Role:</p>
                    <ToolTip content={"The agent's function and expertise."}/>
                </span>
                <RichInput onSubmit={setRole} storedText={role} rowMode={true} tokenOptions={
                    Object.entries(flowState).map(([key, value]) => ({value: [RichInputTokenTypes.STATEVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                    .concat(
                        input != null ? Object.entries(input).map(([key, value]) => ({value: [RichInputTokenTypes.INPUTVAR, key, value], label:(<p key={key} style={{color: DataTypeColors[value]}}>{"input."+key}</p>)})) : []
                    )
                } />
            </div>

            <div className="my-2">
                <span className="inline-flex gap-2">
                    <p className="text-xl">Goal:</p>
                    <ToolTip content={"The agent's purpose and objective. This could include quality standards."}/>
                </span>
                <RichInput onSubmit={setGoal} storedText={goal} rowMode={true} tokenOptions={
                    Object.entries(flowState).map(([key, value]) => ({value: [RichInputTokenTypes.STATEVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                    .concat(
                        input != null ? Object.entries(input).map(([key, value]) => ({value: [RichInputTokenTypes.INPUTVAR, key, value], label:(<p key={key} style={{color: DataTypeColors[value]}}>{"input."+key}</p>)})) : []
                    )
                } />
            </div>

            <div className="my-2">
                <span className="inline-flex gap-2">
                    <p className="text-xl">Backstory:</p>
                    <ToolTip content={"The agent's previous experience."}/>
                </span>
                <RichInput onSubmit={setBackStory} storedText={backStory} rowMode={true} tokenOptions={
                    Object.entries(flowState).map(([key, value]) => ({value: [RichInputTokenTypes.STATEVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                    .concat(
                        input != null ? Object.entries(input).map(([key, value]) => ({value: [RichInputTokenTypes.INPUTVAR, key, value], label:(<p key={key} style={{color: DataTypeColors[value]}}>{"input."+key}</p>)})) : []
                    )
                } />
            </div>
            
            <div className="my-2">
                <span className="inline-flex gap-2">
                    <p className="text-xl">Prompt:</p>
                    <ToolTip content={"Instructions for the agent invocation."}/>
                </span>
                <RichInput onSubmit={setPrompt} storedText={prompt} rowMode={true} tokenOptions={
                    Object.entries(flowState).map(([key, value]) => ({value: [RichInputTokenTypes.STATEVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                    .concat(
                        Object.entries(input).map(([key, value]) => ({value: [RichInputTokenTypes.INPUTVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"input."+key}</p>)}))
                    )
                } />
            </div>

            <div className="my-2 flex flex-col gap-4">
                <span className="inline-flex gap-2">
                    <p className="text-2xl">Model Output:</p>
                </span>
                <div>
                    <label>Use custom output structure: </label>
                    <input type="checkbox" checked={customOutputStructure} onChange={toggleCustomOutputStructure} />
                </div>

                <div>
                    <span className="inline-flex gap-2">
                        <p className="text-lg my-3">Output Structure: </p>
                        <ToolTip content={"Data structure that the agent should format their response in."}/>
                    </span>
                    <div className="ml-4">
                        {customOutputStructure == false ?
                            Object.entries(localOutputStructure).map(([key, value]) => (
                                <span key={key} className="flex gap-2 items-center" >
                                    <label>&#8226; </label>
                                    <label className="text-lg" style={{color: DataTypeColors[value[0]]}}>{key}</label>
                                </span>
                            ))
                        :
                            <div className="flex flex-col gap-4">
                            {Object.entries(localOutputStructure).map(([key, value]) => (
                                <div key={key} className="flex flex-col gap-2">
                                <span key={key} className="flex gap-2 items-center" >
                                    <span>
                                        <label>&#8226; </label>
                                        <label className="text-lg" style={{color: DataTypeColors[value[0]]}}>{key}:</label>
                                    </span>
                                    <Button onClick={() => { 
                                        const { [key]: _, ...rest } = localOutputStructure; 
                                        updateOutputStructure(rest)
                                    }} text={"Delete field"} type={"delete"} icon={true}/>
                                </span>
                                <span className="ml-4 flex items-center gap-4">
                                    <label>Data type: </label>
                                    <CustomSelect 
                                    options={ Object.entries(DataTypes).map(([key, value]) => ({value: value, label: 
                                    <p style={{color: DataTypeColors[value]}}>{DataTypeNames[value]}</p>}
                                    ))
                                    }
                                    value={DataTypeNames[value[0]]} 
                                    onChange={(v) => updateOutputStructure({...localOutputStructure, [key]: [Number(v), value[1]]})}
                                    />
                                </span>
                                <span className="ml-4 flex items-center gap-4">
                                    <span className="flex gap-2">
                                        <label>Description:</label>
                                        <ToolTip content={"Description for the output field. It helps the agent understand what to include in this field."}/>
                                    </span>

                                    <TextInput content={value[1]} onSubmit={(t) => updateOutputStructure({...localOutputStructure, [key]: [value[0], t]})} />
                                </span>
                                </div>
                            ))}
                            <span className="mt-2 inline-flex items-center gap-2">
                                <span className="flex items-center gap-4">
                                    <label>New field name: </label>
                                    <TextInput content={null} submitButton={true} submitButtonText={"Add Field"} onSubmit={(t) => {
                                        const fieldNameNoSpace = t.replace(" ", "_"); // output field may be a field in a pydantic structure. Can't contain spaces
                                        if (fieldNameNoSpace == "") return;
                                        if (fieldNameNoSpace in localOutputStructure) return; // key already in structure

                                        updateOutputStructure({...localOutputStructure, [fieldNameNoSpace]: [DataTypes.NUM, null]});
                                    }} />
                                    
                                </span>
            
                            </span>
                            </div>
                        }
                    </div>
                </div>
            </div>

            <div className="my-2 flex flex-col gap-4">
                <span className="inline-flex gap-2">
                    <p className="text-2xl">Guardrails:</p>
                    <ToolTip content={"Conditions to verify after the agent has produced an output."}/>
                </span>
                
                { guardrails.map((guardrail, i) => (
                    <GuardrailEditMenu key={i} guardrailId={i} guardrail={guardrail} updateGuardrail={updateGuardrail} removeGuardrail={removeGuardrail} flowState={flowState} input={input} modelOutput={localOutputStructure} />
                ))}
                <span>
                <Button onClick={addGuardrail} text={"Add Guardrail"} type={"submit"}/>
                </span>
            </div>

            {(guardrails.length > 0 || customOutputStructure) &&
            <span className="inline-flex items-center gap-2">
                <span>
                    <label>Max number of attempts: </label>
                    <ToolTip content={"The maximum number of attempts the agent can make to complete its task. An attempt is consumed when a guardrail fails, or when the agent fails to conform to its output structure."}/>
                </span>
                <TextInput content={maxAttempts} onSubmit={(t) => {
                    if (!checkStringDataType(t, DataTypes.NUM)) {
                        alert("Invalid value for data type " + DataTypeNames[DataTypes.NUM])
                        return false; // returning false keeps the focus on the input
                    }
                    const parsed_value = parseStringToDataType(t, DataTypes.NUM);
                    setMaxAttempts(parsed_value);
                }} />
            </span>
            }

            { /* Embeddings are not needed with simplified implementation of knowledge sources
            <div>
                <label>Embedding provider: </label>
                <select value={embeddingProvider} onChange={(e) => {
                    setEmbeddingProvider(Number(e.target.value));
                    setEmbeddingModelName(0);
                }}>
                    <option value={-1} disabled>Select a provider</option>
                    {EmbeddingProviders.map((provider, idx) => (
                        <option key={idx} value={idx}>{provider}</option>
                    ))}
                </select>
            </div>

            
            <div>
                <label>Embedding model: </label>
                <select value={embeddingModelName} onChange={(e) => setEmbeddingModelName(Number(e.target.value))}>
                    <option value={''} disabled>Select a model</option>
                    {embeddingProvider != -1 && EmbeddingModelNames[embeddingProvider].map((name, idx) => (
                        <option key={idx} value={idx}>{name}</option>
                    ))}
                </select>
            </div>
            */ }

            <div className="my-2 flex flex-col gap-4">
                <span className="inline-flex gap-2">
                    <p className="text-2xl">Model Tools:</p>
                    <ToolTip content={"Agents can choose to use the tools at their disposal to complete a task."}/>
                </span>

                {modelTools.map((tool, i) => (
                    <span key={i} className="flex gap-2 items-center">
                        <span className="ml-4 flex gap-2 items-center">
                            <label>&#8226; </label>
                            <p className="text-lg">{tool}</p>
                        </span>
                        <Button onClick={() => setModelTools(modelTools.filter((t) => t != tool))} text={"Delete"} type={"delete"} icon={true}/>
                    </span>
                ))}
                <CustomSelect options={
                    Object.entries(Tools).map(([key, value]) => ({value: key, label: 
                        (<div style={{display: "flex", flexDirection: "row", gap: "1rem"}}>
                            <div>
                                <h1>{key}</h1>
                                <div style={{color: "gray", fontSize: "0.8rem"}}>{value.description}</div>
                            </div>
                            
                        </div>)
                    }))
                    } 
                    placeholder={"Add a tool"}
                    onChange={(v) => {
                        console.log("Selected tool: ", v)
                        if (!modelTools.includes(v)) {
                            setModelTools([...modelTools, v])
                        }
                    }}
                />
            </div>

            <div className="my-2 flex flex-col gap-4 items-start">
                <span className="inline-flex gap-2">
                    <p className="text-2xl">Knowledge Sources:</p>
                    <ToolTip content={"Sources of information the agent can access."}/>
                </span>
                <KnowledgeSourceEditMenu knowledgeSources={knowledgeSources} addKnowledgeSource={addKnowledgeSource} updateKnowledgeSource={updateKnowledgeSource} removeKnowledgeSource={removeKnowledgeSource} />
            </div>

            <div className="my-2 flex flex-col gap-4">
                <span className="inline-flex gap-2">
                    <p className="text-2xl">Handoffs:</p>
                    <ToolTip content={"Handoffs allow an agent to invoke other agents for assistance."}/>
                </span>
                {handoffs.map(([id, name], i) => (
                    <span key={i} className="ml-4 flex gap-2 items-center">
                        <span className="flex gap-2 items-center">
                            <label>&#8226; </label>
                            <p className="text-lg">{name}</p>
                        </span>
                        <Button onClick={() => setHandoffs(handoffs.filter(h => h[0] != id))} text={"Delete"} type={"delete"} icon={true}/>
                    </span>
                ))}
                <span className="inline-flex items-center gap-2">
                    <label>Add handoff:</label>
                    <CustomSelect options={
                        allHandoffAgents.length > 0 ? 
                        allHandoffAgents.map(([id, name], i) => ({value: i, label: 
                            <p key={i}>{name}</p>
                        }))
                        :
                        [{disabled: true, label: <p value={''}>No agents found</p>}]
                    }
                    placeholder={"Select an agent"}
                    onChange={(v) => {
                        const selected_agent = allHandoffAgents[v]
                        if (handoffs.some(stored => stored[0] == selected_agent[0] && stored[1] == selected_agent[1])) return // .includes() doesn't work for searching lists
                        setHandoffs([...handoffs, selected_agent])
                        console.log("Added handoff: ", selected_agent)
                    }}
                    />
                </span>
            </div>

            <div className="my-2 flex flex-col gap-4">
                <span className="inline-flex gap-2">
                    <p className="text-2xl">Use as Handoff:</p>
                    <ToolTip content={"How this agent behaves when being invoked by another agent through a handoff."}/>
                </span>
                <span>
                    <label>Allow calling this agent as a handoff: </label>
                    <input type="checkbox" checked={enabledHandoffs} onChange={toggleEnabledHandoffs} />
                </span>
                {enabledHandoffs &&
                <>
                <span className="inline-flex items-center gap-4">
                    <span className="flex gap-2">
                        <label>Handoff description: </label>
                        <ToolTip content={"Description for the handoff. It helps other agents understand when to invoke this agent."}/>
                    </span>
                    <TextInput content={handoffDescription} onSubmit={(t) => {
                        setHandoffDescription(t);
                    }} />
                </span>    
                <span className="mt-3 flex items-center gap-2">
                    <span className="flex gap-2">
                        <label>Use custom prompt: </label>
                        <ToolTip content={"If disabled, when this agent is invoked as a handoff, the calling agent will provide a prompt. If enabled, you can write a custom prompt that the agent will use when being called as a handoff."}/>
                    </span>
                    <input type="checkbox" checked={usesCustomHandoffPrompt} onChange={() => setUsesCustomHandoffPrompt(!usesCustomHandoffPrompt)} />
                </span>
                {usesCustomHandoffPrompt &&
                <div>
                    <span className="inline-flex gap-2">
                        <p className="text-xl">Handoff Prompt:</p>
                        <ToolTip content={"Prompt for the agent"}/>
                    </span>
                    <RichInput onSubmit={setHandoffPrompt} storedText={handoffPrompt} rowMode={true} tokenOptions={
                        Object.entries(flowState).map(([key, value]) => ({value: [RichInputTokenTypes.STATEVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                        .concat(
                            Object.entries(input).map(([key, value]) => ({value: [RichInputTokenTypes.INPUTVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"input."+key}</p>)}))
                        )
                    } />
                </div>
                }
                
                <div>
                    <span className="inline-flex gap-2">
                        <p className="text-lg my-3">Input Structure: </p>
                        <ToolTip content={"Parameters that the calling agent will provide when invoking this agent as a handoff. If this agent is connected to the graph, these parameters must match the agent's input from the graph connections (except for the prompt)."}/>
                    </span>
                    <div className="ml-4 flex flex-col gap-4">
                    {!usesCustomHandoffPrompt && 
                    <div>
                        <span className="flex gap-2 items-center" >
                            <span>
                                <label>&#8226; </label>
                                <label className="text-lg" style={{color: DataTypeColors[DataTypes.STR]}}>prompt</label>
                            </span>
                        </span>
                    </div>
                    }
                    {isConnected ?
                    Object.entries(localHandoffInputStructure).map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-2">
                            <span className="flex gap-2 items-center" >
                                    <label>&#8226; </label>
                                    <label className="text-lg" style={{color: DataTypeColors[value[0]]}}>{key}</label>
                            </span>
                            <span className="ml-4 flex items-center gap-4">
                                <span className="flex gap-2">
                                    <label>Description:</label>
                                    <ToolTip content={"Description for the input variable. It helps the calling agent understand what to include in this variable."}/>
                                </span>
                                <TextInput content={value[1]} onSubmit={(t) => updateHandoffInputStructure({...localHandoffInputStructure, [key]: [value[0], t]})} />
                            </span>
                        </div>
                    ))
                    :
                    <>
                    {Object.entries(localHandoffInputStructure).map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-2">
                            <span key={key} className="flex gap-2 items-center" >
                                <span>
                                    <label>&#8226; </label>
                                    <label className="text-lg" style={{color: DataTypeColors[value[0]]}}>{key}:</label>
                                </span>
                                <Button onClick={() => { 
                                    const { [key]: _, ...rest } = localHandoffInputStructure; 
                                    deleteHandoffInputVariables([key]);
                                    updateHandoffInputStructure(rest)
                                }} text={"Delete field"} type={"delete"} icon={true}/>
                            </span>
                            <span className="ml-4 flex items-center gap-4">
                                <label>Data type: </label>
                                <CustomSelect 
                                options={ Object.entries(DataTypes).map(([key, value]) => ({value: value, label: 
                                <p style={{color: DataTypeColors[value]}}>{DataTypeNames[value]}</p>}
                                ))
                                }
                                value={DataTypeNames[value[0]]} 
                                onChange={(v) => updateHandoffInputStructure({...localHandoffInputStructure, [key]: [Number(v), value[1]]})}
                                />
                            </span>
                            <span className="ml-4 flex items-center gap-4">
                                <span className="flex gap-2">
                                    <label>Description:</label>
                                    <ToolTip content={"Description for the input variable. It helps the calling agent understand what to include in this variable."}/>
                                </span>
                                <TextInput content={value[1]} onSubmit={(t) => updateHandoffInputStructure({...localHandoffInputStructure, [key]: [value[0], t]})} />
                            </span>
                        </div>
                    ))}
                    <span className="mt-2 inline-flex items-center gap-2">
                        <span className="flex items-center gap-4">
                            <label>New field name: </label>
                            <TextInput content={null} submitButton={true} submitButtonText={"Add Field"} onSubmit={(t) => {
                                const fieldNameNoSpace = t.replace(" ", "_"); // output field may be a field in a pydantic structure. Can't contain spaces
                                if (fieldNameNoSpace == "") return;
                                if (fieldNameNoSpace in localHandoffInputStructure || fieldNameNoSpace.toLowerCase() == "prompt") return; // key already in structure or reserved keyword

                                updateHandoffInputStructure({...localHandoffInputStructure, [fieldNameNoSpace]: [DataTypes.NUM, null]});
                            }}/>
                        </span>
                    </span>
                    </>
                    }
                    </div>
                    
                </div>
                </>
                }
            </div>
        </div>
    )
}
