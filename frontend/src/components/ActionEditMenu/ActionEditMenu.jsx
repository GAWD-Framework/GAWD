import { Operators, DataTypeColors, TokenTypes, checkStringDataType, parseStringToDataType, DataTypeNames, RichInputTokenTypes } from "../../logic";
import { CustomSelect } from "../CustomSelect/CustomSelect";
import { RichInput } from "../RichInput/RichInput";
import { Button } from "../Button/Button";


function Operator({ operator, operands, dataType, i }) {
    console.log("Rendering operator ", operator, " with operands ", operands, " and dataType ", dataType);
    function renderOperator(operator, operands) {
        const components = [];
        let next_operand_index = 0;
        for (const [index, token] of operator.structure.entries()) {
            if (typeof token == "string") {
                components.push(<p key={i + "." + index}>{token}</p>);
            }
            else {
                components.push(operands[next_operand_index]);
                next_operand_index++;
            }
        }

        return components;
    }

    if (i == 0)
        return <span key={i} className="flex items-center gap-2" style={{color: DataTypeColors[dataType]}}>{renderOperator(operator, operands)}</span> // root operator. Don't render the border around it
    
    return <span key={i} className="flex items-center gap-2 border-[2px] p-2" style={{color: DataTypeColors[dataType], borderColor: DataTypeColors[dataType]}}>{renderOperator(operator, operands)}</span>
}

function Operand({ operand, operators, updateOperators, flowState, input, dataType, i }) {
    const type = operand[0];
    const value = operand[1];

    if (type == TokenTypes.HARDCODED) { // the operand is hardcoded value
        if (value == undefined) { // the operand has been specified as a hardcoded value but not value has been provided yet
            return <form onSubmit={(e) => {
                e.preventDefault();
                if (!checkStringDataType(e.target.elements[0].value, dataType)) {
                    alert("Invalid value for " + DataTypeNames[dataType]);
                    return;
                }
                const parsed_value = parseStringToDataType(e.target.elements[0].value, dataType);
                const newOperators = [...operators.slice(0, i), [TokenTypes.HARDCODED, parsed_value], ...operators.slice(i + 1)];
                updateOperators(newOperators)
                }}>
                    <input style={{border: "2px solid " + DataTypeColors[dataType]}} /> {/* dataType is the expected DataType for the operand */}
                </form>
        }
        return <p style={{color: DataTypeColors[dataType]}} key={i}>{value.toString()}</p>
    }
    
    if (type == TokenTypes.STATEVAR) { 
            return <p style={{color: DataTypeColors[dataType]}} key={i}>{"state." + value}</p>
        }
    
    if (type == TokenTypes.INPUTVAR) { 
        return <p style={{color: DataTypeColors[dataType]}} key={i}>{"input." + value}</p>
    }

    if (type == TokenTypes.USERINPUT) { // the operand has been specified as user runtime input 
        return <span> 
            <p style={{border: "2px solid " + DataTypeColors[dataType], color: DataTypeColors[dataType]}}>User input with prompt:</p> {/* dataType is the expected DataType for the operand. The user input will be cast to this type */}
            <RichInput storedText={value} 
            tokenOptions={
                Object.entries(flowState).map(([key, value]) => ({value: [RichInputTokenTypes.STATEVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                .concat(
                Object.entries(input).map(([key, value]) => ({value: [RichInputTokenTypes.INPUTVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"input."+key}</p>)}))
                )
            }
            onSubmit={(tokens) => {const newOperators = [...operators.slice(0, i), [TokenTypes.USERINPUT, tokens], ...operators.slice(i + 1)]; updateOperators(newOperators)}}/>
        </span>
    }

    if (type == TokenTypes.UNKNOWN) { // this covers all possible cases.
        return <>
        <CustomSelect options={
            Object.entries(Operators).map(([key, value]) => ({value: [TokenTypes.OPERATOR, key], disabled: value.resultType != dataType , label:   // disable operators where the resultType doesn't match the expected dataType of this operand 
                (<div style={{display: "flex", flexDirection: "row", gap: "1rem", color: DataTypeColors[value.resultType]}}>
                    [
                    {value.structure.map((token, i) => 
                        typeof token == "string" ? <p key={i}>{token}</p> : <div key={i} style={{border: "2px solid " + DataTypeColors[token], padding: "0.3rem"}}></div>
                    )}
                    ]
                </div>)
            }))
            .concat(
                Object.entries(flowState).map(([key, value]) => ({value: [TokenTypes.STATEVAR, key], disabled: value[0] != dataType, label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
            )
            .concat(
                Object.entries(input).map(([key, value]) => ({value: [TokenTypes.INPUTVAR, key], disabled: value[0] != dataType, label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"input."+key}</p>)}))
            )
            .concat([{value: [TokenTypes.HARDCODED, undefined], label: <p style={{color: "black"}}>{"Hardcoded value"}</p>}, 
                     {value: [TokenTypes.USERINPUT, []], label: <p style={{color: "black"}}>{"User Input"}</p>}])
            } 
            placeholder="Select an Operand"
            borderColor={DataTypeColors[dataType]}
            onChange={(value) => {
                console.log("Selected operator: ", value)

                if (value[0] != TokenTypes.OPERATOR) { 
                    const newOperator = [...operators.slice(0, i), value, ...operators.slice(i + 1)];
                    updateOperators(newOperator)
                    return;
                }

                // operand is an operator. Add its own operands to the tree
                const operator = Operators[value[1]];
                const newOperator = [...operators.slice(0, i), value];
                for (const operand of operator.structure) {
                    if (typeof operand == "string") {
                        continue;
                    }
                    newOperator.push([TokenTypes.UNKNOWN, undefined]);
                }
                newOperator.push(...operators.slice(i + 1));
                updateOperators(newOperator)
            }} />
        </>

    }
}

export function ActionEditMenu({ actionIndex, action, updateAction, flowState, input }) {
    const field = action[0];
    const operators = action[1];

    if (field == null) { // state field not yet selected
        return <CustomSelect options={
            Object.entries(flowState).map(([key, value]) => ({value: key, label:(<p key={key} style={{width: "fit-content", color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
        }
        placeholder="Select a State Field"
        onChange={(value) => {
            updateAction(actionIndex, [value, [[TokenTypes.UNKNOWN, undefined]]])
        }}
        />
    }

    function updateOperators(newOperators) {
        updateAction(actionIndex, [field, newOperators])
    }

    function renderAction(i, operators, dataType) {
        if (operators[i][0] == TokenTypes.OPERATOR) { // current node is an operator
            const operator = Operators[operators[i][1]];
            const operands = [];
            const noperands = operator.noperands;
            let next_operand_index = i + 1; // index where the next operand subtree starts
            let next_type_index = 0; // index of the datatype of the next operand in the operator structure

            for (let j = 0; j < noperands; j++) {
                while (typeof operator.structure[next_type_index] == "string") {
                    next_type_index++; // advance the index to the next operand type
                }
                [operands[j], next_operand_index] = renderAction(next_operand_index, operators, operator.structure[next_type_index]);
            }
            return [<Operator key={i} i={i} operator={operator} operands={operands} dataType={dataType}/>, next_operand_index]
        }

        else { // current node is an operand
            return [<Operand key={i} i={i} operators={operators} updateOperators={updateOperators} operand={operators[i]} flowState={flowState} input={input} dataType={dataType}/>, i + 1]
        }
    }
    
    console.log("Rendering action with operators field ", field, " and dataType ", flowState[field][0]);
    return <div className="border-r-[1rem] border-r-transparent bg-clip-padding w-fit flex gap-4 items-center">
        <span className="flex items-center gap-2">
            <p className="min-w-fit" style={{color: DataTypeColors[flowState[field][0]]}}>{field}</p>
            <p> = </p>
        </span>
        <div className="border-[2px] border-gray-500 border-dashed rounded-md p-2 w-fit">
        {renderAction(0, operators, flowState[field][0])[0]}
        </div>
        <Button text={"Reset"} type={"delete"} onClick={() => updateAction(actionIndex, [null, []])} />
    </div>
}