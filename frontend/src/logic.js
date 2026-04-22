import enums from "../../logic_enums.json"

/**
 * Used in endNodes to determine whether a field belongs to the state or the input
 */
const VariableSources = Object.freeze(enums.VariableSources);

const StateVariableDefaultValueSources = Object.freeze(enums.StateVariableDefaultValueSources);

/**
 * A rich string (one that includes variables) is stored as a list of [tokentype, tokenvalue, datatype]. The datatype field is not present for string tokens.
 * State, Input and Output tokens have the value of the field name, without any prefix 
 */
const RichInputTokenTypes = Object.freeze(enums.RichInputTokenTypes);

/**
 * State structure:
 * {fieldname: [datatype, defaultvaluesource, defaultvalue]}
 * defaultvaluesource can be HARDCODED or USERINPUT
 * defaultvalue is used when the source is HARDCODED
 * 
 * Model output structure:
 * {fieldname: [type, description]}
 * default is {agent_response: [DataTypes.STR, null]}. null description means no description is provided
 * 
 * Support agent input structure:
 * {fieldname: [type, description]}
 * there is always an assumed "prompt" field
 * 
 * Node output structure:
 * {fieldname: type}
 * In the case of the EndNode, fieldname includes the prefix "state." or "input."
 */
const DataTypes = Object.freeze(enums.DataTypes);

const DataTypeNames = ["Number", "String", "Boolean"];
const DataTypeColors = ["#c70d0d", "#0000da", "#085c08"];


const TokenTypes = Object.freeze(enums.TokenTypes);

/**
 * Operator structure:
 * - resultType: type of the result of the operation
 * - noperands: number of operands
 * - structure: structure of the operation (types of the operands and how the operation is displayed)
 */
const Operators = Object.freeze(enums.Operators);


/**
 * Condition structure:
 * The list represents the tree structure of the condition, in a depth-first order. 
 * Each element in the list is a tuple: [type, value], where type is a TokenType and value is the value of the token.
 * In the case of operators, the value is the string with the key. For example "GT" or "ADD".
 * If TokenType = USERINPUT, the value is the list of tokens for the RichInput that will be use as prompt for the user
 * For state and input variables, the value is the string with the variable name, without the prefix "state." or "input.".
 * The first element is always an operator with BOOL resulttype, or a BOOL variable.
 * An empty list represents a comparator yet to be selected.
 */

/**
 * Action structure:
 * [state_field, list of operators that define the new value, following the same tree structure as in Condition]
 *  
 */

/**
 * Guardrail structure:
 * [condition, correction, feedback (only if correction is "Re-run with feedback")]
 */

const GuardrailCorrections = enums.GuardrailCorrections
const GuardrailCorrectionsRequiringInput = enums.GuardrailCorrectionsRequiringInput

function isOperator(op) {
    return Object.values(Operators).includes(op);
}

/**
 * Checks if a string introduced by the user in some input field is of the expected type
 * @param str 
 * @param datatype 
 */
function checkStringDataType(str, datatype) {
    if (datatype == DataTypes.STR) {
        return true;
    }
    else if (datatype == DataTypes.NUM) {
        return !isNaN(str) && str !== "";
    }
    else if (datatype == DataTypes.BOOL) {
        return enums.TruthyStrings.includes(str) || enums.FalsyStrings.includes(str);
    }
    else {
        return false;
    }
}

/**
 * Returns the value of the appropriate datatype contained in the string
 */
function parseStringToDataType(str, datatype) {
    if (datatype == DataTypes.STR) {
        return str;
    }
    else if (datatype == DataTypes.NUM) {
        return parseFloat(str);
    }
    else if (datatype == DataTypes.BOOL) {
        return enums.TruthyStrings.includes(str);
    }
    else {
        return false;
    }
}

export { VariableSources, StateVariableDefaultValueSources, RichInputTokenTypes, DataTypes, DataTypeNames, DataTypeColors, TokenTypes, Operators, GuardrailCorrections, GuardrailCorrectionsRequiringInput, isOperator, checkStringDataType, parseStringToDataType }