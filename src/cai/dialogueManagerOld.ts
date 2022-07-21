// Nested dictionary containing a map from parsed utterance
// to a response. It is hierarchically structured as:
// Level 1: intent -> entity type
// Level 2: entity type -> entity value
const defaultResponse = 102
const UNKNOWN_ENTITY_VALUE = "_unk_entity_value"
const responses = {
    greet: {
        "*": {
            "*": 0,
        },
    },
    propose: {
        instrument: {
            Bass: 37,
            Drums: 38,
            Keyboard: 40,
            SFX: 41,
            Strings: 42,
            Synth: 43,
            Vocals: 44,
            Winds: 45,
        },
        genre: {
            "Alt Pop": 46,
            "Cinematic Scores": 47,
            Dubstep: 48,
            EDM: 49,
            EIGHTBIT: 50,
            Electro: 51,
            Funk: 52,
            "Free Sound": 53,
            Gospel: 54,
            "Hip Hop": 55,
            House: 56,
            "New Funk": 57,
            "New Hip Hop": 58,
            Pop: 59,
            "R & B": 60,
            "R & B Funk": 61,
            Rock: 62,
            Techno: 63,
            Trap: 64,
            "UK House": 65,
            "West Coast Hip Hop": 66,
            "World Percussion": 67,
        },
        musical_construct: {
            sound: 4,
            song: 4,
            instrument: 14,
        },
    },
    confusion: {
        "*": {
            "*": 26,
        },
    },
    question: {
        verb: {
            add: 93,
            fix: 32,
        },
    },
    whatNext: {
        "*": {
            "*": 86,
        },
    },
}
const intentsOnly = {
    propose: 3,
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
    const intent = utterance.intent
    console.log("intent", intent)
    const entities = utterance.entities
    // Add dummy entity to the end of the entity-list (for fallback).
    entities.push({ entity: "*", value: "*" })
    console.log("entities", entities)

    let responseId
    if (intent in responses) {
        console.log("intent", intent, "in responses")
        // Level 1 indexing
        const intentMap = responses[intent as keyof typeof responses]
        // Greedily look for a response associated with the first entity.
        entities.some(entity => {
            if (entity.entity in intentMap) {
                console.log("entity.entity", entity.entity, "in intentMap")
                // Level 2 indexing
                const entityMap = intentMap?.[entity.entity as keyof typeof intentMap]
                if (entity.value in entityMap) {
                    console.log("entity.value", entity.value, "in entityMap")
                    // Level 3 indexing
                    const responseValue = entityMap?.[entity.value as keyof typeof entityMap]
                    responseId = responseValue ?? UNKNOWN_ENTITY_VALUE
                }
            }
            return false
        })
        responseId ??= intentsOnly[intent as keyof typeof intentsOnly]
    }
    responseId ??= defaultResponse
    console.log("responseId", responseId)
    return responseId as number
}
