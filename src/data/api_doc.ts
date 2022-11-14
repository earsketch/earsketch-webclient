export interface APIParameter {
    typeKey: string
    descriptionKey: string
    default?: string
}

type APIParameters = { [name: string]: APIParameter }

interface Item {
    descriptionKey: string
    example: {
        pythonKey: string
        javascriptKey: string
    }
    parameters?: APIParameters
    returns?: {
        typeKey: string
        descriptionKey: string
    }
    language?: string
    deprecated?: boolean
}

export interface APIItem extends Item {
    // These get filled in automatically below.
    signature: string
    template: string
}

const rawDoc: { [key: string]: Item[] } = {
    analyze: [{
        descriptionKey: "api:analyze.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:analyze.parameters.sound.description",
            },

            feature: {
                typeKey: "api:types.analysisConstant",
                descriptionKey: "api:analyze.parameters.feature.description",
            },
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:analyze.returns.description",
        },
        example: {
            pythonKey: "api:analyze.example.python",
            javascriptKey: "api:analyze.example.javascript",
        },
    }],
    analyzeForTime: [{
        descriptionKey: "api:analyzeForTime.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:analyzeForTime.parameters.sound.description",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
                descriptionKey: "api:analyzeForTime.parameters.feature.description",
            },
            sliceStart: {
                typeKey: "api:types.float",
                descriptionKey: "api:analyzeForTime.parameters.sliceStart.description",
            },
            sliceEnd: {
                typeKey: "api:types.float",
                descriptionKey: "api:analyzeForTime.parameters.sliceEnd.description",
            },
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:analyzeForTime.returns.description",
        },
        example: {
            pythonKey: "api:analyzeForTime.example.python",
            javascriptKey: "api:analyzeForTime.example.javascript",
        },
    }],
    analyzeTrack: [{
        descriptionKey: "api:analyzeTrack.description",
        parameters: {
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:analyzeTrack.parameters.track.description",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
                descriptionKey: "api:analyzeTrack.parameters.feature.description",
            },
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:analyzeTrack.returns.description",
        },
        example: {
            pythonKey: "api:analyzeTrack.example.python",
            javascriptKey: "api:analyzeTrack.example.javascript",
        },
    }],
    analyzeTrackForTime: [{
        descriptionKey: "api:analyzeTrackForTime.description",
        parameters: {
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:analyzeTrackForTime.parameters.track.description",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
                descriptionKey: "api:analyzeTrackForTime.parameters.feature.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:analyzeTrackForTime.parameters.start.description",
            },
            end: {
                typeKey: "api:types.float",
                descriptionKey: "api:analyzeTrackForTime.parameters.end.description",
            },
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:analyzeTrackForTime.returns.description",
        },
        example: {
            pythonKey: "api:analyzeTrackForTime.example.python",
            javascriptKey: "api:analyzeTrackForTime.example.javascript",
        },
    }],
    createAudioSlice: [{
        descriptionKey: "api:createAudioSlice.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:createAudioSlice.parameters.sound.description",
            },
            sliceStart: {
                typeKey: "api:types.float",
                descriptionKey: "api:createAudioSlice.parameters.sliceStart.description",
            },
            sliceEnd: {
                typeKey: "api:types.float",
                descriptionKey: "api:createAudioSlice.parameters.sliceEnd.description",
            },
        },
        example: {
            pythonKey: "api:createAudioSlice.example.python",
            javascriptKey: "api:createAudioSlice.example.javascript",
        },
        returns: {
            typeKey: "api:types.soundConstant",
            descriptionKey: "api:createAudioSlice.returns.description",
        },
    }],
    dur: [{
        descriptionKey: "api:dur.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:dur.parameters.sound.description",
            },
        },
        example: {
            pythonKey: "api:dur.example.python",
            javascriptKey: "api:dur.example.javascript",
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:dur.returns.description",
        },
    }],
    finish: [{
        descriptionKey: "api:finish.description",
        example: {
            pythonKey: "api:finish.example.python",
            javascriptKey: "api:finish.example.javascript",
        },
        deprecated: true,
    }],
    fitMedia: [{
        descriptionKey: "api:fitMedia.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:fitMedia.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:fitMedia.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:fitMedia.parameters.start.description",
            },
            end: {
                typeKey: "api:types.float",
                descriptionKey: "api:fitMedia.parameters.end.description",
            },
        },
        example: {
            pythonKey: "api:fitMedia.example.python",
            javascriptKey: "api:fitMedia.example.javascript",
        },
    }],
    importImage: [{
        descriptionKey: "api:importImage.description",
        parameters: {
            url: {
                typeKey: "api:types.string",
                descriptionKey: "api:importImage.parameters.url.description",
            },
            nrows: {
                typeKey: "api:types.integer",
                descriptionKey: "api:importImage.parameters.nrows.description",
            },
            ncols: {
                typeKey: "api:types.integer",
                descriptionKey: "api:importImage.parameters.ncols.description",
            },
            includeRGB: {
                typeKey: "api:types.booleanOptional",
                default: "False",
                descriptionKey: "api:importImage.parameters.includeRGB.description",
            },
        },
        example: {
            pythonKey: "api:importImage.example.python",
            javascriptKey: "api:importImage.example.javascript",
        },
        returns: {
            typeKey: "api:types.list",
            descriptionKey: "api:importImage.returns.description",
        },
    }],
    importFile: [{
        descriptionKey: "api:importFile.description",
        parameters: {
            url: {
                typeKey: "api:types.string",
                descriptionKey: "api:importFile.parameters.url.description",
            },
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:importFile.returns.description",
        },
        example: {
            pythonKey: "api:importFile.example.python",
            javascriptKey: "api:importFile.example.javascript",
        },
    }],
    init: [{
        descriptionKey: "api:init.description",
        example: {
            pythonKey: "api:init.example.python",
            javascriptKey: "api:init.example.javascript",
        },
        deprecated: true,
    }],
    insertMedia: [{
        descriptionKey: "api:insertMedia.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:insertMedia.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:insertMedia.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:insertMedia.parameters.start.description",
            },
        },
        example: {
            pythonKey: "api:insertMedia.example.python",
            javascriptKey: "api:insertMedia.example.javascript",
        },
    }],
    insertMediaSection: [{
        descriptionKey: "api:insertMediaSection.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:insertMediaSection.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:insertMediaSection.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:insertMediaSection.parameters.start.description",
            },
            sliceStart: {
                typeKey: "api:types.float",
                descriptionKey: "api:insertMediaSection.parameters.sliceStart.description",
            },
            sliceEnd: {
                typeKey: "api:types.float",
                descriptionKey: "api:insertMediaSection.parameters.sliceEnd.description",
            },
        },
        example: {
            pythonKey: "api:insertMediaSection.example.python",
            javascriptKey: "api:insertMediaSection.example.javascript",
        },
    }],
    makeBeat: [{
        descriptionKey: "api:makeBeat.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundOrList",
                descriptionKey: "api:makeBeat.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:makeBeat.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:makeBeat.parameters.start.description",
            },
            beat: {
                typeKey: "api:types.string",
                descriptionKey: "api:makeBeat.parameters.beat.description",
            },
        },
        example: {
            pythonKey: "api:makeBeat.example.python",
            javascriptKey: "api:makeBeat.example.javascript",
        },
    }],
    makeBeatSlice: [{
        descriptionKey: "api:makeBeatSlice.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:makeBeatSlice.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:makeBeatSlice.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:makeBeatSlice.parameters.start.description",
            },
            beat: {
                typeKey: "api:types.string",
                descriptionKey: "api:makeBeatSlice.parameters.beat.description",
            },
            sliceStarts: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:makeBeatSlice.parameters.sliceStarts.description",
            },
        },
        example: {
            pythonKey: "api:makeBeatSlice.example.python",
            javascriptKey: "api:makeBeatSlice.example.javascript",
        },
    }],
    print: [{
        descriptionKey: "api:print.description",
        parameters: {
            input: {
                typeKey: "api:types.any",
                descriptionKey: "api:print.parameters.input.description",
            },
        },
        example: {
            pythonKey: "api:print.example.python",
            javascriptKey: "should not show",
        },
        language: "python",
    }],
    println: [{
        descriptionKey: "api:println.description",
        parameters: {
            input: {
                typeKey: "api:types.any",
                descriptionKey: "api:println.parameters.input.description",
            },
        },
        example: {
            pythonKey: "should not show",
            javascriptKey: "api:println.example.javascript",
        },
        language: "javascript",
    }],
    readInput: [{
        descriptionKey: "api:readInput.description",
        parameters: {
            prompt: {
                typeKey: "api:types.stringOptional",
                descriptionKey: "api:readInput.parameters.prompt.description",
            },
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:readInput.returns.description",
        },
        example: {
            pythonKey: "api:readInput.example.python",
            javascriptKey: "api:readInput.example.javascript",
        },
    }],
    replaceListElement: [{
        descriptionKey: "api:replaceListElement.description",
        parameters: {
            list: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:replaceListElement.parameters.list.description",
            },
            elementToReplace: {
                typeKey: "api:types.any",
                descriptionKey: "api:replaceListElement.parameters.elementToReplace.description",
            },
            withElement: {
                typeKey: "api:types.any",
                descriptionKey: "api:replaceListElement.parameters.withElement.description",
            },
        },
        example: {
            pythonKey: "api:replaceListElement.example.python",
            javascriptKey: "api:replaceListElement.example.javascript",
        },
    }],
    replaceString: [{
        descriptionKey: "api:replaceString.description",
        parameters: {
            string: {
                typeKey: "api:types.string",
                descriptionKey: "api:replaceString.parameters.string.description",
            },
            characterToReplace: {
                typeKey: "api:types.string",
                descriptionKey: "api:replaceString.parameters.characterToReplace.description",
            },
            withCharacter: {
                typeKey: "api:types.string",
                descriptionKey: "api:replaceString.parameters.withCharacter.description",
            },
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:replaceString.returns.description",
        },
        example: {
            pythonKey: "api:replaceString.example.python",
            javascriptKey: "api:replaceString.example.javascript",
        },
    }],
    reverseList: [{
        descriptionKey: "api:reverseList.description",
        parameters: {
            list: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:reverseList.parameters.list.description",
            },
        },
        returns: {
            typeKey: "api:types.listArray",
            descriptionKey: "api:reverseList.returns.description",
        },
        example: {
            pythonKey: "api:reverseList.example.python",
            javascriptKey: "api:reverseList.example.javascript",
        },
    }],
    reverseString: [{
        descriptionKey: "api:reverseString.description",
        parameters: {
            string: {
                typeKey: "api:types.string",
                descriptionKey: "api:reverseString.parameters.string.description",
            },
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:reverseString.returns.description",
        },
        example: {
            pythonKey: "api:reverseString.example.python",
            javascriptKey: "api:reverseString.example.javascript",
        },
    }],
    rhythmEffects: [{
        descriptionKey: "api:rhythmEffects.description",
        parameters: {
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:rhythmEffects.parameters.track.description",
            },
            type: {
                typeKey: "api:types.effectConstant",
                descriptionKey: "api:rhythmEffects.parameters.type.description",
            },
            parameter: {
                typeKey: "api:types.effectParameterConstant",
                descriptionKey: "api:rhythmEffects.parameters.parameter.description",
            },
            list: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:rhythmEffects.parameters.list.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:rhythmEffects.parameters.start.description",
            },
            beat: {
                typeKey: "api:types.string",
                descriptionKey: "api:rhythmEffects.parameters.beat.description",
            },
        },
        example: {
            pythonKey: "api:rhythmEffects.example.python",
            javascriptKey: "api:rhythmEffects.example.javascript",
        },
    }],
    selectRandomFile: [{
        descriptionKey: "api:selectRandomFile.description",
        parameters: {
            folderSubstring: {
                typeKey: "api:types.string",
                default: "\"\"",
                descriptionKey: "api:selectRandomFile.parameters.folderSubstring.description",
            },
        },
        returns: {
            typeKey: "api:types.soundConstant",
            descriptionKey: "api:selectRandomFile.returns.description",
        },
        example: {
            pythonKey: "api:selectRandomFile.example.python",
            javascriptKey: "api:selectRandomFile.example.javascript",
        },
    }],
    setEffect: [{
        descriptionKey: "api:setEffect1.description",
        parameters: {
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:setEffect1.parameters.track.description",
            },
            type: {
                typeKey: "api:types.effectConstant",
                descriptionKey: "api:setEffect1.parameters.type.description",
            },
            parameter: {
                typeKey: "api:types.effectParameterConstant",
                descriptionKey: "api:setEffect1.parameters.parameter.description",
            },
            value: {
                typeKey: "api:types.float",
                descriptionKey: "api:setEffect1.parameters.value.description",
            },
        },
        example: {
            pythonKey: "api:setEffect1.example.python",
            javascriptKey: "api:setEffect1.example.javascript",
        },
    }, {
        descriptionKey: "api:setEffect2.description",
        parameters: {
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:setEffect1.parameters.track.description",
            },
            type: {
                typeKey: "api:types.effectConstant",
                descriptionKey: "api:setEffect1.parameters.type.description",
            },
            parameter: {
                typeKey: "api:types.effectParameterConstant",
                descriptionKey: "api:setEffect1.parameters.parameter.description",
            },
            startValue: {
                typeKey: "api:types.float",
                descriptionKey: "api:setEffect2.parameters.startValue.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:setEffect2.parameters.start.description",
            },
            endValue: {
                typeKey: "api:types.floatOptional",
                descriptionKey: "api:setEffect2.parameters.endValue.description",
            },
            end: {
                typeKey: "api:types.floatOptional",
                descriptionKey: "api:setEffect2.parameters.end.description",
            },
        },
        example: {
            pythonKey: "api:setEffect2.example.python",
            javascriptKey: "api:setEffect2.example.javascript",
        },
    }],
    setTempo: [{
        descriptionKey: "api:setTempo1.description",
        parameters: {
            tempo: {
                typeKey: "api:types.float",
                descriptionKey: "api:setTempo1.parameters.tempo.description",
            },
        },
        example: {
            pythonKey: "api:setTempo1.example.python",
            javascriptKey: "api:setTempo1.example.javascript",
        },
    }, {
        descriptionKey: "api:setTempo2.description",
        parameters: {
            startTempo: {
                typeKey: "api:types.float",
                descriptionKey: "api:setTempo2.parameters.startTempo.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:setTempo2.parameters.start.description",
            },
            endTempo: {
                typeKey: "api:types.floatOptional",
                descriptionKey: "api:setTempo2.parameters.endTempo.description",
            },
            end: {
                typeKey: "api:types.floatOptional",
                descriptionKey: "api:setTempo2.parameters.end.description",
            },
        },
        example: {
            pythonKey: "api:setTempo2.example.python",
            javascriptKey: "api:setTempo2.example.javascript",
        },
    }],
    shuffleList: [{
        descriptionKey: "api:shuffleList.description",
        parameters: {
            list: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:shuffleList.parameters.list.description",
            },
        },
        returns: {
            typeKey: "api:types.listArray",
            descriptionKey: "api:shuffleList.returns.description",
        },
        example: {
            pythonKey: "api:shuffleList.example.python",
            javascriptKey: "api:shuffleList.example.javascript",
        },
    }],
    shuffleString: [{
        descriptionKey: "api:shuffleString.description",
        parameters: {
            string: {
                typeKey: "api:types.string",
                descriptionKey: "api:shuffleString.parameters.string.description",
            },
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:shuffleString.returns.description",
        },
        example: {
            pythonKey: "api:shuffleString.example.python",
            javascriptKey: "api:shuffleString.example.javascript",
        },
    }],
}

function getSignature(name: string, parameters: APIParameters) {
    const paramStrings = Object.entries(parameters).map(
        ([param, info]) => param + (info.default ? `=${info.default}` : "")
    )
    return {
        signature: `${name}(${paramStrings.join(", ")})`,
        template: `${name}(${paramStrings.map(s => "${" + s + "}").join(", ")})`,
    }
}

// Fill in autocomplete fields.
const apiDoc: { [key: string]: APIItem[] } = {}
for (const [name, entries] of Object.entries(rawDoc)) {
    apiDoc[name] = entries.map(entry => {
        const { signature, template } = getSignature(name, entry.parameters ?? {})
        return { ...entry, signature, template }
    })
}

export const ESApiDoc: { readonly [key: string]: readonly APIItem[] } = apiDoc
