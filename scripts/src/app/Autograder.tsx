import React, { useState, useRef, useEffect } from "react"
import { Chance } from "chance"
import * as ace from "ace-builds"
import * as compiler from "./compiler"
import * as ESUtils from "../esutils"

const prompts: any = []
let quality = false

// overwrite userConsole javascript prompt with a hijackable one
const nativePrompt = (window as any).esPrompt

const listenerPrompt = (text: string) => {
    return nativePrompt(text).then((response: string) => {
        prompts.push(response)
        return response
    })
}

const hijackedPrompt = (allowPrompts: boolean) => {
    let i = 0
    if (allowPrompts) {
        return (text: string) => {
            return nativePrompt(text)
        }
    } else {
        return (text: string) => {
            return new Promise( (resolve, reject) => {
                resolve(prompts[i++ % prompts.length])
            })
        }
    }
}

// overwrite JavaScript random implementations with seedable one
const randomSeed = (seed: number, useSeed: boolean) => {
    Math.random = () => {
        const rng = new Chance(useSeed ? seed : Date.now())
        return rng.random()
    }
}

// Loading ogg by default for browsers other than Safari
// setting default to wav for chrome 58 (May 22, 2017)
if (ESUtils.whichBrowser().match("Opera|Firefox|Msie|Trident") !== null) {
    quality = true // false wav, true ogg
} else {
    quality = false // false wav, true ogg
}

// Compile a script as python or javascript based on the extension and return the compilation promise.
const compile = (script: any, filename: string) => {
    const ext = ESUtils.parseExt(filename)
    if (ext === ".py") {
        return compiler.compilePython(script, quality ? 1 : 0)
    } else if (ext === ".js") {
        return compiler.compileJavascript(script, quality ? 1 : 0)
    } else {
        return new Promise((resolve, reject) => {
            reject(new Error("Invalid file extension " + ext))
        })
    }
}

// Read a File object and return a promise that will resolve to the file text contents.
const readFile = (file: any) => {
    const p = new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = (evt) => {
            if (evt.target) {
                const result = evt.target.result
                resolve(result)
            }
        }
        r.onerror = (err) => {
            reject(err)
        }
        r.readAsText(file)
    })
    return p
}

// Sort the clips in an object by measure.
const sortClips = (result: any) => {
    for (const i in result.tracks) {
        const track = result.tracks[i]
        track.clips.sort((a: any, b: any) => {
            return a.measure - b.measure
        })
    }
}

// Sort effects by start measure.
const sortEffects = (result: any) => {
    for (const i in result.tracks) {
        const track = result.tracks[i]
        for (const key in track.effects) {
            const effect = track.effects[key]
            effect.sort((a: any, b: any) => {
                return a.startMeasure - b.startMeasure
            })
        }
    }
}

// Function to compare the similarity of two script results.
const compare = (reference: any, test: any, testAllTracks: boolean, testTracks: boolean[]) => {
    // create copies for destructive comparison
    reference = JSON.parse(JSON.stringify(reference))
    test = JSON.parse(JSON.stringify(test))
    // sort clips so clips inserted in different orders will not affect equality.
    sortClips(reference)
    sortClips(test)
    // do the same with effects
    sortEffects(reference)
    sortEffects(test)
    // remove tracks we're not testing
    if (!testAllTracks) {
        reference.tracks = $.grep(reference.tracks, (n: any, i: any) => {
            return testTracks[i]
        })
        test.tracks = $.grep(test.tracks, (n: any, i: any) => {
            return testTracks[i]
        })
    }
    return JSON.stringify(reference) === JSON.stringify(test)
}

// Compile a test script and compare it to the reference script.
// Returns a promise that resolves to an object describing the test results.
const compileAndCompare = (referenceResult: any, file: any, testScript: any, testAllTracks: boolean, testTracks: boolean[]) => {
    const results = {
        file: file,
        script: testScript,
        language: ESUtils.parseLanguage(file.name),
        compiled: false,
        result: {},
        error: "",
        pass: false,
    }
    return compile(testScript, file.name).then((result: any) => {
        results.result = result
        results.compiled = true
        // check against reference script
        const a = compare(referenceResult, result, testAllTracks, testTracks)
        if (a) {
            results.pass = true
        }
        return results
    }).catch( (err) => {
        results.error = err.toString()
        results.compiled = true
        return results
    })
}

const CodeEmbed = ({ sourceCode, language }: {sourceCode: string, language: string}) => {
    const editorContainer = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!editorContainer.current) { return }
        const editor = ace.edit(editorContainer.current)
        editor.setOptions({
            mode: "ace/mode/" + language,
            theme: "ace/theme/chrome",
            showPrintMargin: false,
            wrap: true,
            readOnly: true,
        })
    }, [])

    return (
        <div ref={editorContainer} style={{ height: "300px" }}>
            {sourceCode}
        </div>
    )
}

const ReferenceScript = ({ referenceScript, compilingReference }: {referenceScript: {name: string, sourceCode: string}, compilingReference: boolean}) => {
    const [collapse, setCollapse] = useState(true)

    return (
        <div className="container">
            <div className="panel panel-default">
                <div className="panel-heading">
                    {compilingReference &&
                        <i className="spinner icon icon-spinner animate-spin inline-block mr-3"></i>
                    }
                    {referenceScript.name}
                    {collapse
                        ? <a className="pull-right" onClick={() => setCollapse(false)}>Expand</a>
                        : <a className="pull-right" onClick={() => setCollapse(true)}>Collapse</a>
                    }
                </div>
                <div style={{ display: collapse ? "none" : "block" }}>
                    <CodeEmbed sourceCode={referenceScript.sourceCode} language={ESUtils.parseLanguage(referenceScript.name)}/>
                </div>
            </div>
        </div>
    )
}

const ReferenceScriptUpload = ({ referenceScript, compileError, setReferenceScript, setReferenceResult, setCompileError, setTestAllTracks, setTestTracks }: { referenceScript: {name: string, sourceCode: string}, compileError: string, setReferenceScript: any, setReferenceResult: any, setCompileError: any, setTestAllTracks: any, setTestTracks: any }) => {
    const [compilingReference, setCompilingReference] = useState(false)

    const updateReferenceFile = (file: any) => {
        // restore prompt function to record inputs
        (window as any).esPrompt = listenerPrompt

        setCompileError("")
        setReferenceScript({ sourceCode: "", name: "" })
        setReferenceResult(null)

        if (file !== null) {
            // referenceLanguage = ESUtils.parseLanguage(file.name)
            readFile(file)
                .then( (script: any) => {
                    setReferenceScript({ sourceCode: script, name: file.name })
                    setCompilingReference(true)
                    return compile(script, file.name).then(function (result: any) {
                        setTestAllTracks(true)
                        setTestTracks(new Array(result.tracks.length).fill(false))
                        return result
                    })
                }).catch( (err) => {
                    console.error(err)
                    setCompilingReference(false)
                    setCompileError(err.toString())
                }).then( (result: any) => {
                    setCompilingReference(false)
                    setReferenceResult(result)
                }).catch( (err) => {
                    console.error(err)
                    setCompilingReference(false)
                    setCompileError(err)
                })
        }
    }

    return (
        <div>
            <div className="container">
                <h1>EarSketch Autograder</h1>
                {compileError &&
                <div className="alert alert-danger" role="alert">{ compileError }</div>
                }
                <div className="panel panel-primary">
                    <div className="panel-heading">
                        Step 1: Upload a Reference Script
                    </div>
                    <input type="file" onChange={(file) => {
                        if (file.target.files) { updateReferenceFile(file.target.files[0]) }
                    }}></input>
                </div>
            </div>
            {referenceScript!.name.length > 0 &&
            <ReferenceScript referenceScript={referenceScript} compilingReference={compilingReference}/>
            }
        </div>
    )
}

const ConfigureTest = ({ referenceResult, compileError, testAllTracks, testTracks, allowPrompts, setTestAllTracks, setTestTracks, setAllowPrompts }: { referenceResult: any, compileError: string, testAllTracks: boolean, testTracks: boolean[], allowPrompts: boolean, setTestAllTracks: any, setTestTracks: any, setAllowPrompts: any}) => {
    const [useSeed, setUseSeed] = useState(true)
    const [seed, setSeed] = useState(Date.now())

    const updateTestTracks = (trackNumber: number, value: boolean) => {
        const tracks = testTracks
        tracks[trackNumber] = value
        setTestTracks(tracks)
    }

    const updateSeed = (seed: number, useSeed: boolean) => {
        setUseSeed(useSeed)
        if (useSeed) {
            setSeed(seed)
        }
        randomSeed(seed, useSeed)
    }

    return (
        <div className="container">
            <div className="panel panel-primary">
                <div className="panel-heading">
                    Step 2: Configure Test
                </div>
                <div className="panel-body">
                    <div className="row">
                        <div className="col-md-4">
                            <h4>Tracks to Compare</h4>
                            {referenceResult && !compileError
                                ? <div>
                                    <label>
                                        <input type="checkbox" checked={testAllTracks} onChange={e => setTestAllTracks(e.target.checked)}></input>
                                        Test all tracks.
                                    </label>
                                </div>
                                : <div> Available after uploading a reference script. </div>
                            }
                            <br></br>
                            <ul>
                                {referenceResult && !compileError && !testAllTracks &&
                                Object.entries(referenceResult.tracks).map(([key, track], index) =>
                                    <li key={ index }>
                                        <label>
                                            <input type="checkbox" onChange={e => updateTestTracks(index, e.target.checked)}></input>
                                            {index === 0
                                                ? <span>Main</span>
                                                : <span>Track {index}</span>
                                            }
                                        </label>
                                    </li>
                                )}
                            </ul>
                        </div>
                        <div className="col-md-4">
                            <h4>Input Prompts</h4>
                            {(referenceResult && compileError.length === 0)
                                ? prompts.length > 0
                                    ? <div>
                                        <label>
                                            <input type="checkbox" checked={allowPrompts} onChange={e => setAllowPrompts(e.target.checked)}></input>
                                            Automatically use these prompts when needed in test scripts:
                                        </label>
                                        <ol>
                                            {prompts.map(([index, prompt]: [number, any]) =>
                                                <li key={index}><b>{{ prompt }}</b></li>
                                            )}
                                        </ol>
                                    </div>
                                    : <div> No user input detected. </div>
                                : <div> Available after uploading a reference script. </div>
                            }
                        </div>
                        <div className="col-md-4">
                            <h4>Random Seed</h4>
                            <label>
                                <input type="checkbox" checked={useSeed} onChange={e => updateSeed(seed, e.target.checked)}></input>
                                Use the following random seed:
                            </label>
                            <input type="text" value={seed} onChange={e => updateSeed(Number(e.target.value), useSeed)}></input>
                            <p className="small">
                                This will automatically seed every random function in Python and JavaScript.
                            </p>
                            <p className="small">
                                Disclaimer: Testing randomness is inherently difficult. Only use this in the most trivial of cases.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const TestResult = ({ upload, index }: {upload: any, index: number}) => {
    const [showCode, setShowCode] = useState(false)

    return (
        <div className="panel panel-default">
            <div className="panel-heading">
                {!upload.compiled &&
                <i className="spinner icon icon-spinner animate-spin inline-block mr-3"></i>
                }
                <b> {index + 1} </b> {upload.file.name}
                {upload.file.name.length > 50 &&
                <span>...</span>
                }
                {upload.compiled &&
                !upload.error
                    ? upload.pass
                        ? <span className="label label-success" style={{ margin: "1%" }}>
                        Perfect match!
                        </span>
                        : <span className="label label-warning" style={{ margin: "1%" }}>
                        Does not match.
                        </span>
                    : <span className="label label-danger" style={{ margin: "1%" }}>
                    upload.error
                    </span>
                }
                {showCode
                    ? <a className="pull-right" onClick={() => setShowCode(false)}>Collapse</a>
                    : <a className="pull-right" onClick={() => setShowCode(true)}>Expand</a>
                }
            </div>
            <div>
                {upload.compiled && showCode &&
                    <CodeEmbed sourceCode={upload.script} language={upload.language}/>
                }
            </div>
        </div>
    )
}

const TestScriptUpload = ({ referenceResult, compileError, uploads, testAllTracks, testTracks, allowPrompts, setUploads, setFiles }: { referenceResult: any, compileError: string, uploads: any[], testAllTracks: boolean, testTracks: boolean[], allowPrompts: boolean, setUploads: any, setFiles: any }) => {
    const [uploadError, setUploadError] = useState(false)

    const updateFiles = (files: any) => {
        // use the hijacked prompt function to input user input
        (window as any).esPrompt = hijackedPrompt(allowPrompts)

        // clear current uploads
        setFiles(files)
        uploads = []
        setUploads(uploads)
        setUploadError(false)

        // start with a promise that resolves immediately
        let p = new Promise<void>((resolve) => { resolve() })

        files.forEach( (file: any, i: any) => {
            // Begin compiling this script after the last one finishes. Daisy
            // chain calls to the queueFile() function so that scripts only start
            // compiling after the last one finished, thus avoiding erratic
            // behavior from scope variables crossing promise boundaries and stuff.
            p = p.then( () => {
                return readFile(file)
            }).then( (script) => {
                // if the script was read successfully, test it against the reference script copy
                return compileAndCompare(referenceResult, file, script, testAllTracks, testTracks)
            }).catch( () => {
                const results = {
                    file: file,
                    script: "",
                    language: ESUtils.parseLanguage(file.name),
                    compiled: false,
                    result: {},
                    error: "Read error, corrupted file?",
                    pass: false,
                }
                setUploads(uploads.concat(results))
                uploads.push(results)
                setUploadError(true)
                return results
            }).then( (testResults: any) => {
                // add the test results to the list of uploads
                setUploads(uploads.concat(testResults))
                uploads.push(testResults)
            })
        })
    }

    return (
        <div className="container">
            {referenceResult && !compileError &&
            <div className="panel panel-primary">
                <div className="panel-heading">
                    Step 3: Upload Test Scripts
                </div>
                <div className="panel-body">
                    Drop scripts here or click to upload.
                    <input type="file" multiple onChange={(file) => {
                        if (file.target.files) { updateFiles(Object.values(file.target.files)) }
                    }}></input>
                    {uploadError &&
                    <div className="alert alert-danger" role="alert">{uploadError}</div>
                    }
                </div>
            </div>
            }
        </div>
    )
}

const TestResults = ({ referenceResult, compileError, testAllTracks, testTracks, allowPrompts }: {referenceResult: any, compileError: string, testAllTracks: boolean, testTracks: boolean[], allowPrompts: boolean}) => {
    const [uploads, setUploads] = useState([])
    const [files, setFiles] = useState([])

    return (
        <div>
            <TestScriptUpload
                referenceResult={referenceResult}
                compileError={compileError}
                uploads={uploads}
                testAllTracks={testAllTracks}
                testTracks={testTracks}
                allowPrompts={allowPrompts}
                setUploads={setUploads}
                setFiles={setFiles}
            />
            <div className="container">
                <ul>
                    {uploads.map(([key, upload], index) =>
                        <li key={index}>
                            <TestResult upload={uploads[index]} index={index}/>
                        </li>
                    )}
                </ul>
            </div>
            {uploads.length > 0 &&
            <div className="container">
                {uploads.length === files.length
                    ? <div className="alert alert-success">
                        All scripts tested.
                    </div>
                    : <div className="alert alert-info">
                        Testing script {uploads.length} / {files.length}
                    </div>
                }
            </div>
            }
        </div>
    )
}

export const Autograder = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [referenceScript, setReferenceScript] = useState({ name: "", sourceCode: "" })
    const [compileError, setCompileError] = useState("")
    const [referenceResult, setReferenceResult] = useState(null)
    const [testAllTracks, setTestAllTracks] = useState(true)
    const [testTracks, setTestTracks] = useState([])
    const [allowPrompts, setAllowPrompts] = useState(true)

    return (
        <div>
            <ReferenceScriptUpload
                referenceScript={referenceScript}
                compileError = {compileError}
                setReferenceScript={setReferenceScript}
                setReferenceResult={setReferenceResult}
                setCompileError = {setCompileError}
                setTestAllTracks={setTestAllTracks}
                setTestTracks={setTestTracks}
            />
            <ConfigureTest
                referenceResult={referenceResult}
                compileError={compileError}
                testAllTracks={testAllTracks}
                testTracks={testTracks}
                allowPrompts={allowPrompts}
                setTestAllTracks={setTestAllTracks}
                setTestTracks={setTestTracks}
                setAllowPrompts={setAllowPrompts}
            />
            <TestResults
                referenceResult={referenceResult}
                compileError={compileError}
                testAllTracks={testAllTracks}
                testTracks={testTracks}
                allowPrompts={allowPrompts}
            />
        </div>
    )
}
