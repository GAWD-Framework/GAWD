import structures from "../../model_data.json"
import tools from "../../tool_data.json"

const ModelProviders = structures.ModelProviders;

const ModelNames = structures.ModelNames;

const Tools = tools.Tools;

//const EmbeddingProviders = structures.EmbeddingProviders;

//const EmbeddingModelNames = structures.EmbeddingModelNames;

//const KnowledgeSourceTypes = Object.freeze(structures.KnowledgeSourceTypes);

const AcceptedKnowledgeSourceFileTypes = structures.AcceptedKnowledgeSourceFileTypes;

const APIKeysNeeded = structures.APIKeysNeeded;

/**
 * OLD Knowledge source structure: [type, file/url]
 * NEW Knowledge source structure: [filename, content]. File objects can't be directly serialized into json.
 */
export { ModelProviders, ModelNames, Tools, AcceptedKnowledgeSourceFileTypes, APIKeysNeeded };