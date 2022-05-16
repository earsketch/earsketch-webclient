import { CAI_TREE_NODES } from "./caitree";


// Nested dictionary containing a map from parsed utterance
// to a response. It is hierarchically structured as:
// Level 1: intent -> entity type
// Level 2: entity type -> entity value
const default_response = 102;
const UNKNOWN_ENTITY_VALUE = "_unk_entity_value";
const responses = {
    "propose": {
        "instrument": {
            "Bass": 37,
            "Drums": 38,
            "Keyboard": 40,
        },
        "musical_construct": {
            "song": 4
        },
    }
};
const intents_only = {
    "propose": 3
}


/**
 * Dialogue state variables.
 */
export interface DialogueState {
    lastSystemUtteranceId: number;
    lastUserUtterance: ParsedUtterance;
    numTurns: number;
}

/**
 * Type and value of a named entity.
 */
export interface Entity {
    entity: string;
    value: string;
}


/**
 * Intent and entities of a parsed utterance.
 */
export interface ParsedUtterance {
    text: string;
    intent: string;
    entities: Entity[];
}


/**
 * Given a parsed user utterance, return the node ID corresponding to its
 * response from the dialogue tree.
 */
export function nluToResponseNode(utterance: ParsedUtterance): number {
    console.log("nluToResponseNode", utterance)
    const intent = utterance.intent;
    console.log("intent", intent)
    const entities = utterance.entities;
    console.log("entities", entities)

    let responseId;
    if (intent in responses) {
        console.log("intent", intent, "in responses")
        // Level 1 indexing
        const intentMap = responses[intent as keyof typeof responses];
        // Greedily look for a response associated with the first entity.
        entities.some(entity => {
            if (entity.entity in intentMap) {
                console.log("entity.entity", entity.entity, "in intentMap")
                // Level 2 indexing
                const entityMap = intentMap?.[entity.entity as keyof typeof intentMap];
                if (entity.value in entityMap) {
                    console.log("entity.value", entity.value, "in entityMap")
                    // Level 3 indexing
                    const responseValue = entityMap?.[entity.value as keyof typeof entityMap];
                    responseId = responseValue ?? UNKNOWN_ENTITY_VALUE;
                }
            }
        });
        responseId ??= intents_only[intent as keyof typeof intents_only];
    }
    responseId ??= default_response;
    console.log("responseId", responseId)
    return responseId as number;
}
